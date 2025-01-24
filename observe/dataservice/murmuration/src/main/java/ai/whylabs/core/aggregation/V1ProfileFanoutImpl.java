package ai.whylabs.core.aggregation;

import static ai.whylabs.druid.whylogs.v1.WhyLogsV1toV0Iterator.*;
import static ai.whylabs.druid.whylogs.v1.WhyLogsV1toV0Iterator.HLL;

import ai.whylabs.batch.jobs.EventsJobV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.predicatesV3.inclusion.ActiveMonitorFeaturePredicate;
import ai.whylabs.core.predicatesV3.inclusion.IndividualProfileAnalyzerPredicate;
import ai.whylabs.core.predicatesV3.segment.MatchingSegmentFactory;
import ai.whylabs.core.structures.DatalakeRowV2;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.utils.DatalakeRowV2MetricChunker;
import ai.whylabs.core.utils.SegmentUtils;
import ai.whylabs.druid.whylogs.column.*;
import com.whylogs.v0.core.message.VarianceMessage;
import java.io.Serializable;
import java.time.ZonedDateTime;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.StringUtils;

@Slf4j
public class V1ProfileFanoutImpl implements Serializable {
  static final String METRIC_PATH_CLASSIFICATION = "model/classification";
  static final String METRIC_PATH_REGRESSION = "model/regression";

  public static final int PARTITION_COUNT = 500;

  public Iterator<ExplodedRow> call(
      DatalakeRowV2 row, MonitorConfigV3 config, ZonedDateTime currentTime) throws Exception {
    List<ExplodedRow> fanout = new ArrayList<>();

    val eb = ExplodedRow.builder();
    eb.columnName(row.getColumnName())
        .ts(row.getDatasetTimestamp())
        .missing(false)
        .feedbackRow(false)
        .ingestionMetricRow(false)
        .rowTerminator(false)
        .orgId(row.getOrgId())
        .datasetId(row.getDatasetId())
        .segmentText(row.getSegmentText())
        .monitorConfigBin(0l)
        .counters_count(0l)
        .schema_count_BOOLEAN(0l)
        .schema_count_NULL(0l)
        .schema_count_STRING(0l)
        .schema_count_FRACTIONAL(0l)
        .schema_count_INTEGRAL(0l)
        .schema_count_UNKNOWN(0l)
        .lastUploadTs(row.getLastUploadTs());
    if (!StringUtils.isEmpty(row.getTraceId())) {
      eb.traceIds(new ArrayList<>(Arrays.asList(row.getTraceId())));
    }

    eb.orgId(row.getOrgId())
        .mostRecentDatalakeWriteTs(row.getDatalakeWriteTs())
        .profileId(row.getReferenceProfileId())
        .segmentText("");
    val tags = SegmentUtils.parseSegmentV3(row.getSegmentText());

    eb.ts(row.getDatasetTimestamp());

    for (val chunk : DatalakeRowV2MetricChunker.getChunks(row.getMetrics())) {
      for (val m : chunk) {
        if (row.getColumnName() == null && !m.getMetricPath().startsWith("model")) {
          /**
           * This might peel away once metric schemas become a reality and we have formally defined
           * dataset level metrics that don't utilize a hard coded column name.
           */
          return Collections.emptyIterator();
        }

        eb.targetLevel(row.getDatasetType());
        if (row.getDatasetType() == TargetLevel.dataset) {
          // TODO: Stop doing this once we have better metric schemas handling
          eb.columnName(DatasetMetrics.DATASET_METRICS);
        }

        switch (m.getMetricPath()) {
          case TYPES_FRACTIONAL:
            eb.schema_count_FRACTIONAL(m.getNSum());
            break;
          case TYPES_INTEGRAL:
            eb.schema_count_INTEGRAL(m.getNSum());
            break;
          case TYPES_STRING:
            eb.schema_count_STRING(m.getNSum());
            break;
          case TYPES_OBJECT:
            // TODO: Chris can you verify that v0 UNKNOWN ~= V1 OBJECT
            eb.schema_count_UNKNOWN(m.getNSum());
            break;
          case TYPES_BOOLEAN:
            eb.schema_count_BOOLEAN(m.getNSum());
            break;
          case COUNTS_N:
            eb.counters_count(m.getNSum());
            break;
          case COUNTS_NULL:
            eb.schema_count_NULL(m.getNSum());
            break;
          case KLL:
            eb.histogram(m.getKll());
            break;
          case MEAN:
            break;
          case "distribution/variance":
            // varianceMessageBuilder.setSum(row.getDoubles());
            if (m.getVariance() != null && m.getVariance().length == 3) {

              if (m.getVariance()[0] == null
                  || m.getVariance()[1] == null
                  || m.getVariance()[2] == null) {
                break;
              }
              eb.variance_tracker(
                  VarianceMessage.newBuilder()
                      .setCount(m.getVariance()[0].longValue())
                      .setSum(m.getVariance()[1])
                      .setMean(m.getVariance()[2])
                      .build()
                      .toByteArray());
            }

            break;
          case FREQUENT_STRING:
            eb.frequentItems(m.getFrequentItems());
            break;
          case HLL:
            eb.uniqueCount(m.getHll());
            break;
          case METRIC_PATH_CLASSIFICATION:
            eb.classification(m.getClassificationProfile());
            break;
          case METRIC_PATH_REGRESSION:
            eb.regression(m.getRegressionProfile());
            break;

          default:
            log.trace("Unsupported metric path: {}", m.getMetricPath());
            break;
        }
      }

      if (row.getColumnName() != null
          && row.getColumnName().startsWith(EventsJobV3.DERIVED_PREFIX)) {
        continue;
      }

      val activeMonitorPredicate = new ActiveMonitorFeaturePredicate(currentTime);
      val individualProfilePredicate = new IndividualProfileAnalyzerPredicate();
      for (val applicableSegment :
          MatchingSegmentFactory.getApplicableSegmentsForProfile(config.getAnalyzers(), tags)
              .entrySet()) {
        eb.weight(
            MatchingSegmentFactory.getFieldWeight(
                config, applicableSegment.getValue(), row.getColumnName()));
        eb.segmentText(applicableSegment.getKey()).build();

        if (activeMonitorPredicate.test(config, row.getColumnName())) {
          // Rolled up bucket aggregation isn't subpartitioned (yet at least)
          eb.aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP);
          eb.subPartition(0);
          val explodedRow = eb.build();
          fanout.add(explodedRow);
          if (individualProfilePredicate.test(config.getAnalyzers())) {
            // Individual profiles get fanned out to prevent group key hotspotting
            eb.subPartition(getSubpartition(row.getDatasetTimestamp()));
            eb.aggregationDataGranularity(AggregationDataGranularity.INDIVIDUAL);
            fanout.add(eb.build());
          }
        }
        // Dataset level row with ingestion statistics
        eb.aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP);
        eb.subPartition(0);
        fanout.add(toDatasetLevelRow(eb.build()));
      }
    }
    return fanout.iterator();
  }

  public static Integer getSubpartition(long datasetTimestamp) {
    return new Long(datasetTimestamp).intValue();
  }

  /**
   * Schema change analysis requires a list of columns aggregated to the dataset level so we have to
   * generate a top level row for that.
   *
   * @param e
   * @return
   */
  private ExplodedRow toDatasetLevelRow(ExplodedRow e) {
    return ExplodedRow.builder()
        .orgId(e.getOrgId())
        .datasetId(e.getDatasetId())
        .segmentText(e.getSegmentText())
        .ts(e.getTs())
        .lastUploadTs(e.getLastUploadTs())
        .datasetFields(new ArrayList<>(Arrays.asList(e.getColumnName())))
        .rowTerminator(false)
        .subPartition(0)
        .missing(false)
        .columnName("__internal__.datasetMetrics")
        .ingestionMetricRow(false)
        .targetLevel(TargetLevel.dataset)
        .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
        .mostRecentDatalakeWriteTs(e.getMostRecentDatalakeWriteTs())
        .feedbackRow(false)
        .traceIds(e.getTraceIds())
        .build();
  }
}
