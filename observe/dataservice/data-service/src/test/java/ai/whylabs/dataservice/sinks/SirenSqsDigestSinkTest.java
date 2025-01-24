package ai.whylabs.dataservice.sinks;

import static ai.whylabs.dataservice.sinks.SirenSqsSink.MAX_MESSAGE_SIZE_BYTES;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

import ai.whylabs.core.structures.ColumnStatistic;
import ai.whylabs.core.structures.SegmentStatistic;
import ai.whylabs.core.structures.SirenDigestPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.dataservice.BasePostgresTest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.util.ArrayList;
import java.util.List;
import javax.inject.Inject;
import lombok.val;
import org.junit.jupiter.api.Test;

@MicronautTest
class SirenSqsDigestSinkTest extends BasePostgresTest {

  @Inject SirenSqsSink sink;

  @Test
  public void testMessageTrimming() throws JsonProcessingException {
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
    val s =
        SirenDigestPayload.builder()
            .anomalySample(lotsOfAnalyzerResults)
            .columnStatistics(colStats)
            .segmentStatistics(segStats)
            .build();
    val json = sink.trimAndEncodeToJson(s);
    assertThat(json.getBytes().length, is(lessThan(MAX_MESSAGE_SIZE_BYTES)));
    SirenDigestPayload p = new ObjectMapper().readValue(json, SirenDigestPayload.class);
    assertEquals(p.getColumnStatistics().size(), 100);
    assertEquals(p.getSegmentStatistics().size(), 100);
  }

  @Test
  public void testTrimNotNeeded() throws JsonProcessingException {
    AnalyzerResult.AnalyzerResultBuilder a =
        AnalyzerResult.builder().analyzerId("tnhoeunhtoeutnhuoe").datasetTimestamp(0l);
    List<AnalyzerResult> lotsOfAnalyzerResults = new ArrayList();
    List<ColumnStatistic> colStats = new ArrayList<>();
    List<SegmentStatistic> segStats = new ArrayList<>();
    int sampleSize = 5;
    for (int x = 0; x < sampleSize; x++) {
      lotsOfAnalyzerResults.add(a.column("blahblahblah" + x).segment("seg" + x).build());
      colStats.add(ColumnStatistic.builder().column("blahblahblah" + x).build());
      segStats.add(SegmentStatistic.builder().segment("seg" + x).build());
    }
    val s =
        SirenDigestPayload.builder()
            .anomalySample(lotsOfAnalyzerResults)
            .columnStatistics(colStats)
            .segmentStatistics(segStats)
            .build();
    val json = sink.trimAndEncodeToJson(s);
    assertThat(json.getBytes().length, is(lessThan(MAX_MESSAGE_SIZE_BYTES)));
    SirenDigestPayload p = new ObjectMapper().readValue(json, SirenDigestPayload.class);
    assertEquals(p.getColumnStatistics().size(), 5);
    assertEquals(p.getSegmentStatistics().size(), 5);
  }
}
