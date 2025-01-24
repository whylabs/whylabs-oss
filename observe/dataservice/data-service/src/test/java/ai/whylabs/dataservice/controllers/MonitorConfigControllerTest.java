package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.structures.PgMonitorSchedule;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.Test;

@MicronautTest
@Slf4j
public class MonitorConfigControllerTest extends BasePostgresTest {

  @Inject
  @Client("/")
  HttpClient httpClient;

  @Inject private ObjectMapper objectMapper;

  @Test
  public void testCrud() throws IOException {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass().getResourceAsStream("/configs/monitorConfigV3Sample.json")),
            StandardCharsets.UTF_8);
    val row =
        MonitorConfigV3Row.builder().jsonConf(json).orgId("org-11").datasetId("model-0").build();

    val client = httpClient.toBlocking();

    for (int x = 0; x < 1000; x++) {
      val postReq =
          HttpRequest.POST("/monitorConfig/save", objectMapper.writeValueAsString(row))
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON);
      client.exchange(postReq);

      val getLatest =
          HttpRequest.GET("/monitorConfig/getLatest/org-11/model-0")
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON);
      val b = client.retrieve(getLatest);
      MonitorConfigV3Row read = objectMapper.readValue(b, MonitorConfigV3Row.class);
      String j = read.getJsonConf();
      assertFalse(StringUtils.isEmpty(j));
      assertTrue(j.length() > 10);

      // Validate the scheduler got updated with all the schedules from the config that was added

      PgMonitorSchedule[] schedules =
          objectMapper.readValue(
              client.retrieve(
                  HttpRequest.GET("monitorScheduler/list/org-11/model-0")
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON)),
              PgMonitorSchedule[].class);
      // We have 2 unique rows
      assertEquals(3, schedules.length);

      for (val schedule : schedules) {
        assertNotNull(schedule.getId());
        assertEquals("org-11", schedule.getOrgId());
        assertEquals("model-0", schedule.getDatasetId());
        assertNotNull(schedule.getEligableToRun());
        assertNotNull(schedule.getAnalyzerId());
        assertNotNull(schedule.getTargetBucket());
      }
      // Save it again and make sure we're not duplicating
      client.exchange(postReq);
      PgMonitorSchedule[] schedules2 =
          objectMapper.readValue(
              client.retrieve(
                  HttpRequest.GET("monitorScheduler/list/org-11/model-0")
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON)),
              PgMonitorSchedule[].class);
      assertEquals(3, schedules2.length);
    }
  }
}
