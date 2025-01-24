package ai.whylabs.dataservice.adhoc;

import static ai.whylabs.core.configV3.structure.Analyzers.DriftConfig.Algorithm.hellinger;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.collection.IsCollectionWithSize.hasSize;
import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.core.configV3.structure.Analyzers.DriftConfig;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.configV3.structure.enums.DataType;
import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import ai.whylabs.dataservice.util.SegmentUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.Test;

class AsyncRequestDispatcherTest {

  @SneakyThrows
  @Test
  void testOverallSegment() {
    ObjectMapper mapper = new ObjectMapper();

    // mock profiles segments from the model.
    val modelSegmentList =
        "[\"purpose=car&verification_status=Not Verified\",\"purpose=car&verification_status=Source Verified\"]";
    List<String> tags = mapper.readValue(modelSegmentList, List.class);
    val modelSegments = Arrays.asList(StringUtils.join(SegmentUtils.reorderSegmentTags(tags), "&"));

    // create two targeted segments, one of which partially matches profile segments,
    // and another that does not match any of the profile segments.
    val non_matching_segment =
        Segment.builder()
            .tags(Arrays.asList(Tag.builder().key("house").value("blue").build()))
            .build();
    val partially_matching_segment =
        Segment.builder()
            .tags(
                Arrays.asList(
                    Tag.builder().key("purpose").value("car").build(),
                    Tag.builder().key("verification_status").value("Not Verified").build()))
            .build();

    // we will also add overall segment to both analyzers below.
    val overall_segment = Segment.builder().build();

    val baseline = TrailingWindowBaseline.builder().size(7).build();

    // create two segments for the async request.  Expect to generate work queue entries that cover
    // all the analyzers without any duplicates.
    List<Analyzer> analyzers = new ArrayList<>();
    analyzers.add(
        Analyzer.builder()
            .id("analyzer_1")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .baseline(baseline)
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .threshold(.7)
                    .version(1)
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(non_matching_segment, overall_segment))
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());
    analyzers.add(
        Analyzer.builder()
            .id("analyzer_2")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .baseline(baseline)
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .threshold(.7)
                    .version(1)
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(partially_matching_segment))
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    Map<String, ColumnSchema> colMap = new HashMap<>(1);
    colMap.put(
        "column1",
        ColumnSchema.builder()
            .classifier(Classifier.input)
            .discreteness(DiscretenessType.discrete)
            .dataType(DataType.BOOLEAN)
            .build());
    colMap.put(
        "column2",
        ColumnSchema.builder()
            .classifier(Classifier.input)
            .discreteness(DiscretenessType.discrete)
            .dataType(DataType.BOOLEAN)
            .build());

    AsyncRequest request =
        AsyncRequest.builder()
            .id(1L)
            .runId("runid-1")
            .orgId("org-1")
            .datasetId("model-1")
            .analyzersConfigs(mapper.writeValueAsString(analyzers))
            .includeOverallSegment(true)
            .columns(Arrays.asList("column1", "column2"))
            .build();

    List<AnalysisQueueEntry> wqEntries =
        AsyncRequestDispatcher.createWorkQueueEntries(request, modelSegments, colMap, null);

    // AsyncRequest did not specify analyzerId, so expect workqueue entries for both
    // analyzers.
    //
    // analyzer_1 should generate entries for just the matching segment tags.
    // analyzer_2 includes the overall segment and a non-matching specific segment, so expect
    // entries
    // for the overall segment.
    assertThat(wqEntries, hasSize(4));

    // do it again, but this time specify analyzerId so only one of the analyzers generates
    // workqueue entries.
    request =
        AsyncRequest.builder()
            .id(1L)
            .runId("runid-1")
            .orgId("org-1")
            .datasetId("model-1")
            .analyzersConfigs(mapper.writeValueAsString(analyzers))
            .includeOverallSegment(true)
            .columns(Arrays.asList("column1", "column2"))
            .analyzerId("analyzer_2")
            .build();

    wqEntries = AsyncRequestDispatcher.createWorkQueueEntries(request, modelSegments, colMap, null);
    assertThat(wqEntries, hasSize(2));
  }
}
