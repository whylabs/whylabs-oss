package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.util.IngestionUtil;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.ListObjectsV2Request;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.scheduling.annotation.Async;
import java.io.IOException;
import java.sql.SQLException;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import javax.annotation.PostConstruct;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Singleton
@RequiredArgsConstructor
@Slf4j
public class IndexerService {

  private static final int ANALYZER_RESULT_BATCH_SIZE = 500;
  private static final int ANALYZER_RUN_BATCH_SIZE = 50;
  public static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy-MM-dd");

  @Inject private final ProfileService profileService;

  @Inject private final AnalysisService analysisService;
  @Inject private final AnalyzerRunRepository analyzerRunRepository;

  @Inject private final ObjectMapper mapper;
  @Inject private final AmazonS3 s3;

  private final BlockingQueue<String> paths = new LinkedBlockingQueue<>(6400);
  private final ExecutorService es = Executors.newSingleThreadExecutor();

  @Inject private final DataSvcConfig config;

  @Inject private final DataSource dataSource;

  @PostConstruct
  public void start() {
    if (!config.isEnableBackfill()) {
      log.info("Backfill not enabled. Skipping");
    }
    es.submit(
        (Runnable)
            () -> {
              while (true) {
                try {
                  val path = paths.poll(1, TimeUnit.MINUTES);
                  if (path == null) {
                    continue;
                  }
                  profileService.indexProfile(path, "reindexFromS3");
                } catch (InterruptedException e) {
                  log.warn("Polling got interrupted");
                }
              }
            });
  }

  @SneakyThrows
  @Async("lister")
  public void reindexFromS3(String bucket, ZonedDateTime date) {
    long start = System.currentTimeMillis();
    String dateString = DATE_TIME_FORMATTER.format(date.truncatedTo(ChronoUnit.DAYS));
    String prefix = "daily-log-untrusted/" + dateString + "/";
    log.info("Scanning {}", prefix);

    boolean hasNext = true;
    val req = new ListObjectsV2Request().withBucketName(bucket).withPrefix(prefix);
    while (hasNext) {
      val batch = s3.listObjectsV2(req);
      for (val obj : batch.getObjectSummaries()) {
        String path = "s3://" + obj.getBucketName() + "/" + obj.getKey();
        if (!(path.endsWith(".bin") || path.endsWith(".zip"))) {
          // skip non-binary files
          continue;
        }

        int attempts = 0;
        while (attempts++ < 5) {
          val accepted = paths.offer(path, 1, TimeUnit.MINUTES);
          if (accepted) {
            break;
          }
        }

        if (attempts >= 5) {
          log.error("Failed to submit an indexing request for: {}", path);
        }
      }

      hasNext = batch.isTruncated();
      ;
      req.setContinuationToken(batch.getContinuationToken());
    }
    log.info("Prefix {} took {}ms", prefix, System.currentTimeMillis() - start);
  }

  public void ingestBulkResults(String rows) throws SQLException, IOException {
    IngestionUtil.importViaCopyManager(dataSource, rows);
  }
}
