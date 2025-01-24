package ai.whylabs.batch.MapFunctions;

import static ai.whylabs.druid.whylogs.column.WhyLogsRow.*;

import ai.whylabs.batch.utils.TraceIdUtils;
import ai.whylabs.core.aggregation.VarianceAccumulator;
import ai.whylabs.core.aws.WhyLabsCredentialsProviderChain;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.IngestionOrigin;
import ai.whylabs.core.enums.IngestionRollupGranularity;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.structures.DatalakeRowV1;
import ai.whylabs.core.structures.V1FileDescriptor;
import ai.whylabs.core.utils.Constants;
import ai.whylabs.core.utils.SegmentUtils;
import ai.whylabs.ingestion.IMetricsIterator;
import ai.whylabs.ingestion.WhylogsFileIterator;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3Client;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllFloatsSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.whylogs.core.message.MetricComponentMessage;
import com.whylogs.v0.core.message.RegressionMetricsMessage;
import com.whylogs.v0.core.message.ScoreMatrixMessage;
import java.util.*;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.apache.spark.api.java.function.FlatMapFunction;

@Slf4j
public class ProfileToDatalakeRows implements FlatMapFunction<V1FileDescriptor, DatalakeRowV1> {

  private long datalakeWriteTs;
  private transient AmazonS3 s3;
  private static final String DEFAULT_REGION = "us-west-2";

  public ProfileToDatalakeRows(long datalakeWriteTs) {
    this.datalakeWriteTs = datalakeWriteTs;
  }

  private AmazonS3 getS3() {
    if (s3 != null) {
      return s3;
    }
    s3 =
        AmazonS3Client.builder()
            .withCredentials(WhyLabsCredentialsProviderChain.getInstance())
            .withRegion(DEFAULT_REGION)
            .build();
    return s3;
  }

  @Override
  public Iterator<DatalakeRowV1> call(V1FileDescriptor v1FileDescriptor) throws Exception {
    val it = new WhylogsFileIterator(v1FileDescriptor.getPath(), getS3());
    long uploadTs = v1FileDescriptor.getModificationTime().toInstant().toEpochMilli();
    try {
      val rows =
          iterateRows(
              it,
              DatalakeRowV1.builder().lastUploadTs(uploadTs).datalakeWriteTs(datalakeWriteTs),
              v1FileDescriptor.getEnableGranularDataStorage(),
              v1FileDescriptor.getIngestionGranularity());

      // Add a marker to prevent re-ingestion of this file
      val ingestionMarker =
          DatalakeRowV1.builder()
              .datalakeWriteTs(datalakeWriteTs)
              .type(ProfileColumnType.RAW)
              .originalFilename(v1FileDescriptor.getPath());
      if (rows.size() > 0) {
        val r = rows.get(0);
        ingestionMarker.orgId(r.getOrgId());
        ingestionMarker.datasetId(r.getDatasetId());
        ingestionMarker.datasetTimestamp(r.getDatasetTimestamp());
        ingestionMarker.datalakeWriteTs(r.getDatalakeWriteTs());
        ingestionMarker.lastUploadTs(uploadTs);
        ingestionMarker.mergedRecordWritten(true);
        if (r.getIngestionOrigin() == null) {
          ingestionMarker.ingestionOrigin(IngestionOrigin.WhylogDeltalakeWriterJob);
        } else {
          ingestionMarker.ingestionOrigin(r.getIngestionOrigin());
        }

        ingestionMarker.segmentText(r.getSegmentText());
        // Uncomment if we decide to populate segment/tag tables from ingestion markers (prob not
        // necessary)
        // ingestionMarker.segmentText(r.getSegmentText());
        ingestionMarker.referenceProfileId(r.getReferenceProfileId());
      }

      rows.add(ingestionMarker.build());
      return rows.iterator();
    } catch (IllegalArgumentException e) {
      log.error("Error reading file " + v1FileDescriptor.getPath(), e);
      it.close();
      return Collections.emptyIterator();
    }
  }

  private long rollupDatasetTimestamp(
      Boolean enableGranularDataStorage,
      IngestionRollupGranularity ingestionGranularity,
      long timestamp) {
    if (enableGranularDataStorage) {
      return timestamp;
    }
    return ComputeJobGranularities.truncateByIngestionGranularity(ingestionGranularity, timestamp);
  }

  /**
   * Todo: It'd be great to support really large files, but that will require turning this into an
   * iterator that well iterates the iterator of iterators. Inception
   */
  @SneakyThrows
  public List<DatalakeRowV1> iterateRows(
      Iterator<IMetricsIterator> it,
      DatalakeRowV1.DatalakeRowV1Builder templateBuilder,
      Boolean enableGranularDataStorage,
      IngestionRollupGranularity ingestionGranularity) {
    List<DatalakeRowV1> rows = new ArrayList<>();

    while (it.hasNext()) {
      val m = it.next();
      val props = m.getMetadata().getProperties();
      val tags = props.getTagsMap();

      long datasetTimestamp =
          rollupDatasetTimestamp(
              enableGranularDataStorage, ingestionGranularity, props.getDatasetTimestamp());

      templateBuilder.orgId(tags.get(ORG_ID));
      templateBuilder.datasetId(tags.get(DATASET_ID));
      templateBuilder.ingestionOrigin(IngestionOrigin.WhylogDeltalakeWriterJob);
      templateBuilder.referenceProfileId(tags.get(REFERENCE_PROFILE_ID));
      if (tags.get(REFERENCE_PROFILE_ID) == null) {
        templateBuilder.type(ProfileColumnType.MERGED);
      } else {
        templateBuilder.type(ProfileColumnType.REFERENCE);
      }

      templateBuilder.traceId(TraceIdUtils.getTraceId(props.getMetadataMap()));
      templateBuilder.datasetTimestamp(datasetTimestamp);
      templateBuilder.enableGranularDataStorage(enableGranularDataStorage);
      templateBuilder.datasetTags(
          SegmentUtils.toString(m.getMetadata().getProperties().getTagsMap()));
      // TODO: Special case for dataset metrics? ProfileService would need to mirror the behavior
      // which I don't think it does atm
      templateBuilder.datasetType(TargetLevel.column);
      val segments = m.getMetadata().extractSegments();
      if (segments != null && segments.size() > 0) {
        templateBuilder.segmentText(StringUtils.join(segments, "&"));
      }

      while (m.hasNext()) {
        val n = m.next();
        templateBuilder.columnName(n.getKey());
        // TODO: Extract from message
        templateBuilder.mergeableSegment(true);
        val template = templateBuilder.build();

        val varianceAccumulator = new VarianceAccumulator();
        for (val entry : n.getValue().getMetricComponentsMap().entrySet()) {
          val metricPath = entry.getKey();
          val metric = entry.getValue();
          varianceAccumulator.accumulate(metricPath, metric);
          val metricRow = getMetricRow(metric, metricPath, template);

          if (metricRow != null) {
            metricRow.setDatasetTimestamp(
                rollupDatasetTimestamp(
                    enableGranularDataStorage,
                    ingestionGranularity,
                    metricRow.getDatasetTimestamp()));
            metricRow.setEnableGranularDataStorage(enableGranularDataStorage);
            rows.add(metricRow);
          }
        }
        val variance = getVariance(varianceAccumulator, template);
        if (variance != null) {
          variance.setDatasetTimestamp(
              rollupDatasetTimestamp(
                  enableGranularDataStorage, ingestionGranularity, variance.getDatasetTimestamp()));
          variance.setEnableGranularDataStorage(enableGranularDataStorage);
          rows.add(variance);
        }
      }
    }
    return rows;
  }

  private static DatalakeRowV1 getVariance(
      VarianceAccumulator varianceAccumulator, DatalakeRowV1 template) {
    if (varianceAccumulator.isComplete()) {
      val builder = template.toBuilder();
      Double[] variance = new Double[3];
      variance[0] = new Double(varianceAccumulator.getCount());
      variance[1] = varianceAccumulator.getSum();
      variance[2] = varianceAccumulator.getMean();
      builder.variance(variance);

      builder.metricPath("distribution/variance");
      // TODO: Chris variance is column level right?
      builder.datasetType(TargetLevel.column);
      return builder.build();
    }
    return null;
  }

  // Very similar to ProfileService.buildStatement
  private static DatalakeRowV1 getMetricRow(
      MetricComponentMessage metric, String metricPath, DatalakeRowV1 templateRow)
      throws InvalidProtocolBufferException {
    val builder = templateRow.toBuilder().metricPath(metricPath).datasetType(TargetLevel.column);

    if (metric.hasD()) {
      val value = metric.getD();
      // a couple special metric paths go into variance tracker,
      // but are not entered into their own row.
      switch (metricPath) {
        case "distribution/mean":
        case "distribution/m2":
          return null;
        default:
          // typeId determines aggregation method for numeric metrics
          switch (metric.getTypeId()) {
            case Constants.TYPE_SUM:
              return builder.dSum(value).build();
            case Constants.TYPE_MIN:
              return builder.dMin(value).build();
            case Constants.TYPE_MAX:
              return builder.dMax(value).build();
            default:
              log.error(
                  "Unrecognized typeId value {}, metric {}} ", metric.getTypeId(), metricPath);
          }
      }
    }

    if (metric.hasN()) {
      val value = metric.getN();
      // typeId determines aggregation method for numeric metrics
      switch (metric.getTypeId()) {
        case Constants.TYPE_SUM:
          return builder.nSum(value).build();
        case Constants.TYPE_MIN:
          return builder.nMin(value).build();
        case Constants.TYPE_MAX:
          return builder.nMax(value).build();
        default:
          log.error("Unrecognized typeId value {}, metric {}} ", metric.getTypeId(), metricPath);
      }
    }

    if (metric.hasKll()) {
      // if we know it is V1, we can assume it is KllDoublesSketch
      // otherwise we need this try/catch
      val message = metric.getKll().getSketch();
      Memory hMem = Memory.wrap(message.toByteArray());
      KllDoublesSketch sketch;
      try {
        sketch = KllDoublesSketch.heapify(hMem);
      } catch (Exception var4) {
        KllFloatsSketch kllFloats = KllFloatsSketch.heapify(hMem);
        sketch = KllDoublesSketch.fromKllFloat(kllFloats);
      }

      return builder.kll((sketch.toByteArray())).build();
    }

    if (metric.hasHll()) {
      val sketch = metric.getHll().getSketch();
      return builder.hll((sketch.toByteArray())).build();
    }

    if (metric.hasFrequentItems()) {
      val sketch = metric.getFrequentItems().getSketch();
      return builder.frequentItems((sketch.toByteArray())).build();
    }

    if (metric.hasMsg()) {
      switch (metricPath) {
        case "model/classification":
          return builder
              .datasetType(TargetLevel.dataset)
              .classificationProfile(
                  (metric.getMsg().unpack(ScoreMatrixMessage.class).toByteArray()))
              .build();
        case "model/regression":
          return builder
              .datasetType(TargetLevel.dataset)
              .regressionProfile(
                  (metric.getMsg().unpack(RegressionMetricsMessage.class).toByteArray()))
              .build();
      }
    }
    return null;
  }

  private static Byte[] toByteArray(byte[] bytesPrim) {
    Byte[] bytes = new Byte[bytesPrim.length];
    Arrays.setAll(bytes, n -> bytesPrim[n]);
    return bytes;
  }
}
