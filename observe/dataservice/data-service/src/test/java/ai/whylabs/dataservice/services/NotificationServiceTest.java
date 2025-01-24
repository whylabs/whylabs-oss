package ai.whylabs.dataservice.services;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.core.configV3.structure.AnomalyFilter;
import ai.whylabs.core.configV3.structure.DigestMode;
import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.structures.ColumnStatistic;
import ai.whylabs.core.structures.SegmentStatistic;
import ai.whylabs.core.structures.SirenDigestPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.requests.AckDigestRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.val;
import org.joda.time.DateTime;
import org.junit.jupiter.api.Test;

class NotificationServiceTest extends BasePostgresTest {

  @Inject NotificationService notificationService;

  @Inject
  @Client("/")
  HttpClient httpClient;

  @SneakyThrows
  @Test
  void acknowledgeImmediateDigest() {

    val client = httpClient.toBlocking();
    Exception thrown = null;

    val monitor =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .mode(DigestMode.builder().filter(AnomalyFilter.builder().build()).build())
            .build();
    AnalyzerResult.AnalyzerResultBuilder a =
        AnalyzerResult.builder().analyzerId("tnhoeunhtoeutnhuoe").datasetTimestamp(0l);
    List<AnalyzerResult> lotsOfAnalyzerResults = new ArrayList();
    List<ColumnStatistic> colStats = new ArrayList<>();
    List<SegmentStatistic> segStats = new ArrayList<>();
    int sampleSize = 50000;
    for (int x = 0; x < sampleSize; x++) {
      lotsOfAnalyzerResults.add(a.column("blahblahblah" + x).segment("seg" + x).build());
      colStats.add(ColumnStatistic.builder().column("blahblahblah" + x).build());
      segStats.add(SegmentStatistic.builder().segment("seg" + x).build());
    }
    String runId = UUID.randomUUID().toString();

    val digest =
        SirenDigestPayload.builder()
            .orgId("org-0")
            .datasetId("model-0")
            .runId(runId)
            .monitorId(monitor.getId())
            .anomalySample(lotsOfAnalyzerResults)
            .columnStatistics(colStats)
            .segmentStatistics(segStats)
            .build();

    int nrows = notificationService.persistImmediateDigest(digest, monitor);
    assertThat(nrows, equalTo(1));

    AckDigestRequest body =
        AckDigestRequest.builder()
            .orgId("org-0")
            .datasetId("model-0")
            .monitorId(monitor.getId())
            .runId(runId)
            .sentTimestamp(DateTime.now())
            .build();

    nrows = notificationService.ackImmediateDigest(body);
    assertThat(nrows, equalTo(1));

    body =
        AckDigestRequest.builder()
            .orgId("org-0")
            .datasetId("nothere")
            .monitorId(monitor.getId())
            .runId(runId)
            .sentTimestamp(DateTime.now())
            .build();

    nrows = notificationService.ackImmediateDigest(body);
    assertThat(nrows, equalTo(0));
  }
}
