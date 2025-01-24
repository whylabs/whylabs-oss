package ai.whylabs.dataservice;

import static org.junit.jupiter.api.Assertions.assertEquals;

import ai.whylabs.dataservice.adhoc.AsyncRequest;
import ai.whylabs.dataservice.adhoc.StatusEnum;
import ai.whylabs.dataservice.streaming.AuditRow;
import ai.whylabs.ingestion.payloads.ProfileReadRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import io.micronaut.test.support.TestPropertyProvider;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import javax.inject.Inject;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.jetbrains.annotations.NotNull;
import org.joda.time.DateTimeZone;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.testcontainers.containers.Container;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.images.builder.Transferable;

/**
 * Extend this class to run test in postgres.
 *
 * <p>This class sets up a test container and then load data using psql
 */
@MicronautTest
@Slf4j
// setting Lifecycle.PER_CLASS allows @BeforeAll annotations to be applied to non-static methods
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class BasePostgresTest implements TestPropertyProvider {
  /** Gate keeper to prevent multiple Threads within the same routine */
  private static final Lock LOCK = new ReentrantLock();

  protected static final String ORG_ID = "org-5Hsdjx";
  protected static final String DATASET_ID = "model-61";

  /**
   * volatile boolean to tell other threads, when unblocked, whether they should try attempt
   * start-up. Alternatively, could use AtomicBoolean.
   */
  private static volatile boolean started = false;

  public static final GenericContainer<?> POSTGRES_CONTAINER;

  @Inject
  @Client("/")
  HttpClient httpClient;

  @Inject private ObjectMapper objectMapper;

  static final int POSTGRES_PORT = 5432;

  @SneakyThrows
  protected Container.ExecResult runDirectQuery(String q) {
    return POSTGRES_CONTAINER.execInContainer( //
        "su", //
        "postgres",
        "-c",
        "psql -a postgres -c \"" + q + ";\"");
  }

  protected void clearCaches() {
    runDirectQuery("truncate whylabs.cache");
  }

  static {
    // executed early, before any @BeforeAll or @BeforeEach annotations
    POSTGRES_CONTAINER =
        new GenericContainer<>("public.ecr.aws/q7d3h7a7/spilo-postgres:slim-14-v1.1")
            .withExposedPorts(POSTGRES_PORT)
            .withReuse(true)
            // Align these in BasePostgresTest and docker-compose
            .withEnv(
                "PATRONI_CONFIGURATION",
                "{\n"
                    + "  \"postgresql\": {\n"
                    + "    \"parameters\": {\n"
                    + "      \"timescaledb.license\": \"timescale\"\n"
                    + "    }\n"
                    + "  }\n"
                    + "}")
            .withEnv("SPILO_PROVIDER", "local");
    POSTGRES_CONTAINER.start();
    DateTimeZone.setDefault(DateTimeZone.UTC);
  }

  @BeforeAll
  static void __obscure_dont_override_me__() throws Exception {
    System.err.println("Parent set up");
    LOCK.lock();
    try {
      if (!started) {
        started = true;

        // Your "before all tests" startup logic goes here
        // The following line registers a callback hook when the root test context is
        // shut down
        System.err.println("Load data into test container");

        try (val is = BasePostgresTest.class.getResourceAsStream("/dumps/all.sql")) {
          val content = Transferable.of(IOUtils.toByteArray(is));
          String tmpPath = "/tmp/all.sql";
          POSTGRES_CONTAINER.copyFileToContainer(content, tmpPath);
          val mainCmnd = ImmutableList.of("psql", "postgres", "<", tmpPath);
          val result =
              POSTGRES_CONTAINER.execInContainer( //
                  "su", //
                  "postgres",
                  "-c",
                  String.join(" ", mainCmnd));
          if (result.getExitCode() == 0) {
            int c = 0;
          }
        }
        System.err.println("Done loading data");
        // do your work - which might take some time -
        // or just uses more time than the simple check of a boolean
      }
    } finally {
      // free the access
      LOCK.unlock();
    }
  }

  @Override
  public @NotNull Map<String, String> getProperties() {
    val hostPort = POSTGRES_CONTAINER.getMappedPort(POSTGRES_PORT);
    log.info("PG test containers running on {}", hostPort);
    String host = POSTGRES_CONTAINER.getHost();
    return ImmutableMap.of(
        "micronaut.http.client.read-timeout",
        "P60s",
        "postgres.hostname",
        host,
        "postgres.repl_hostname",
        host,
        "postgres.bulk_hostname",
        host,
        "postgres.port",
        hostPort.toString(),
        // just a placeholder so we can have nice diff by inserting more entries above
        "-",
        "-");
  }

  @NonNull
  protected java.net.URL readResource(String fileName) {
    val name = getClass().getResource(fileName);
    Preconditions.checkNotNull(name, "Resource not available: " + fileName);
    return name;
  }

  /**
   * Ingest a profile and wait for its completion. This makes it easier to write tests that need a
   * newly ingested profile without having to bootstrap data.
   *
   * @param path
   */
  @SneakyThrows
  protected void ingestProfile(String path) {
    val url = readResource(path);
    val req = new ProfileReadRequest();
    req.setFile(url.toString());

    val client = httpClient.toBlocking();
    String body = objectMapper.writeValueAsString(req);
    client.exchange(
        HttpRequest.POST("/profiles/index", body)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // spin-loop checking the ingestion status of this single profile
    Supplier<AuditRow.IngestState> supplier =
        () -> {
          AuditRow.IngestState previous = null;
          AuditRow.IngestState current = null;
          while (current != AuditRow.IngestState.ingested) {
            previous = current;
            String stateReply =
                client.retrieve(
                    HttpRequest.POST("/profiles/getIngestState", body)
                        .contentType(MediaType.APPLICATION_JSON_TYPE)
                        .accept(MediaType.APPLICATION_JSON));
            try {
              val response = objectMapper.readTree(stateReply).asText();
              current = AuditRow.IngestState.valueOf(response);
              if (current != previous) {
                log.info("state changed {} -> {}", previous, current);
              } else {
                log.info("state {}", current);
              }
            } catch (Exception e) {
              log.error("objectMapper exception", e);
              return null;
            }

            try {
              Thread.sleep(500);
            } catch (InterruptedException e) {
              throw new RuntimeException(e);
            }
          }
          return current;
        };

    // ingestion must complete within 10 seconds or throws exception
    CompletableFuture.supplyAsync(supplier).get(10, TimeUnit.SECONDS);
  }

  public void pollForAdhocJobStatus(String runId, StatusEnum expected)
      throws JsonProcessingException, InterruptedException {
    val client = httpClient.toBlocking();
    int c = 0;
    while (true) {
      // Check status
      val status =
          client.retrieve(
              HttpRequest.GET("/analysisAsync/getStatus/" + runId)
                  .contentType(MediaType.APPLICATION_JSON_TYPE)
                  .accept(MediaType.APPLICATION_JSON));

      val s = objectMapper.readValue(status, AsyncRequest.class);
      if (s.getStatus().equals(expected)) {
        assertEquals(s.getTasks(), s.getTasksComplete());
        break;
      }
      Thread.sleep(1000);
      c++;
      if (c > 60) {
        throw new RuntimeException(
            "Failed to finish adhoc async analysis within a reasonable period of time");
      }
    }
  }

  protected void triggerColumnStatRollups() {
    val client = httpClient.toBlocking();
    client.exchange(
        HttpRequest.POST("/dataset/columnStats/rollup", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
  }

  protected void triggerDataPromotion() {
    val client = httpClient.toBlocking();
    // Trigger force promote
    client.exchange(
        HttpRequest.POST("/profiles/forcePromote/false/10000", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
  }
}
