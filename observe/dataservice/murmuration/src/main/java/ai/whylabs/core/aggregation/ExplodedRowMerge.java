package ai.whylabs.core.aggregation;

import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.druid.whylogs.frequency.FrequencyOperations;
import ai.whylabs.druid.whylogs.kll.KllDoublesSketchOperations;
import ai.whylabs.druid.whylogs.modelmetrics.DruidModelMetrics;
import ai.whylabs.druid.whylogs.modelmetrics.Operations;
import ai.whylabs.druid.whylogs.variance.VarianceOperations;
import com.shaded.whylabs.org.apache.datasketches.SketchesArgumentException;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.hll.TgtHllType;
import com.shaded.whylabs.org.apache.datasketches.hll.Union;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.whylogs.core.metrics.ClassificationMetrics;
import com.whylogs.core.metrics.RegressionMetrics;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import com.whylogs.v0.core.message.RegressionMetricsMessage;
import com.whylogs.v0.core.message.ScoreMatrixMessage;
import java.io.Serializable;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class ExplodedRowMerge implements Serializable {
  // logk can be from 4 to 21
  public static final int MAX_K = 16;
  public static final int DEFAULT_KLL_LOG_K = 12;
  public static final int MAX_TRACE_ID_SAMPLE_SIZE = 10;

  public ExplodedRowMerge() {}

  private byte[] mergeHll(List<ExplodedRow> rows) {
    val sketches =
        rows.stream() //
            .map(ExplodedRow::getUniqueCount)
            .filter(Objects::nonNull)
            .filter(sk -> sk.length > 0)
            .map(
                b -> {
                  try {
                    return HllSketch.wrap(Memory.wrap(b));
                  } catch (Exception e) {
                    log.warn(
                        "Failed to parse HLL. Data: {}", Base64.getEncoder().encodeToString(b), e);
                    return null;
                  }
                })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

    // ensure we don't lose accuracy
    val lgK =
        sketches.stream()
            .map(HllSketch::getLgConfigK)
            .mapToInt(i -> i)
            .max()
            .orElse(DEFAULT_KLL_LOG_K);
    val union = new Union(Math.min(lgK, MAX_K));
    sketches.forEach(union::update);

    /*
     * Performance note: each time we call union.getResult it creates a deep copy which is
     * expensive. It's better to union.update all the records and call getResult a single time at
     * the end rather than on every single merge.
     *
     * <p>Note HLL_8 uses more bytes per bucket, so
     */
    return union.getResult(TgtHllType.HLL_8).toUpdatableByteArray();
  }

  @SneakyThrows
  private byte[] mergeClassificationMetrics(List<ExplodedRow> rows) {
    ClassificationMetrics classificationMetrics = null;

    for (val row : rows) {
      if (row.getClassification() != null && row.getClassification().length > 0) {
        val cm =
            ClassificationMetrics.fromProtobuf(
                ScoreMatrixMessage.parseFrom(row.getClassification()));
        if (classificationMetrics == null) {
          classificationMetrics = cm;
        } else {
          classificationMetrics = classificationMetrics.merge(cm);
        }
      }
    }
    if (classificationMetrics == null) {
      return null;
    }
    return classificationMetrics.toProtobuf().build().toByteArray();
  }

  @SneakyThrows
  private byte[] mergeRegressionMetrics(List<ExplodedRow> rows) {
    RegressionMetrics regressionMetrics = null;

    for (val row :
        rows.stream()
            .sorted(Comparator.comparing(ExplodedRow::getTs, Comparator.reverseOrder()))
            .collect(Collectors.toList())) {
      if (row.getRegression() != null && row.getRegression().length > 0) {
        val cm =
            RegressionMetrics.fromProtobuf(RegressionMetricsMessage.parseFrom(row.getRegression()));
        if (regressionMetrics == null) {
          regressionMetrics = cm;
        } else {
          try {
            regressionMetrics = regressionMetrics.merge(cm);
          } catch (IllegalStateException e) {
            log.info(
                "Column changed for regression metric. This is actually ok, but we default to sticking with the most recent.",
                e);
          }
        }
      }
    }
    if (regressionMetrics == null) {
      return null;
    }
    return regressionMetrics.toProtobuf().build().toByteArray();
  }

  private byte[] mergeModelMetrics(List<ExplodedRow> rows) {
    DruidModelMetrics modelMetrics = null;
    for (val row : rows) {
      if (row.getModel_metrics() != null && row.getModel_metrics().length > 0) {
        val dm = Operations.deserialize(row.getModel_metrics());
        if (modelMetrics == null) {
          modelMetrics = dm;
        } else {
          modelMetrics = modelMetrics.merge(dm);
        }
      }
    }
    if (modelMetrics == null) {
      return new byte[0];
    }

    return Operations.serialize(modelMetrics);
  }

  private byte[] mergeFreqItems(List<ExplodedRow> rows) {
    ItemsSketch<String> merged = null;
    for (val row : rows) {
      if (row.getFrequentItems() != null && row.getFrequentItems().length > 0) {
        try {
          val sketch = FrequencyOperations.deserializeFromByteArray(row.getFrequentItems());
          if (merged == null) {
            merged = sketch.get();
          } else {
            merged = merged.merge(sketch.get());
          }
        } catch (SketchesArgumentException e) {
          log.trace("Sketch corruption ", e);
        }
      }
    }
    if (merged == null) {
      return new byte[0];
    }
    return FrequencyOperations.serialize(merged);
  }

  private byte[] mergeKll(List<ExplodedRow> rows) {
    KllDoublesSketch merged = null;
    for (val row : rows) {
      if (row.getHistogram() != null && row.getHistogram().length > 0) {
        val sketch = KllDoublesSketchOperations.deserializeFromByteArray(row.getHistogram());
        if (merged == null) {
          merged = sketch;
        } else {
          try {
            merged.merge(sketch);
          } catch (Exception e) {
            log.error("ExplodedRowMerge.mergeKll failed", e);
            // We don't know which sketch caused the failure, plus
            // we don't know if the merged sketch was left in a bad state.
            // Abort merging the entire group.
            merged = null;
            break;
          }
        }
      }
    }
    if (merged == null) {
      return new byte[0];
    }
    return merged.toByteArray();
  }

  private byte[] mergeVarianceTracker(List<ExplodedRow> rows) {
    VarianceTracker merged = null;
    for (val row : rows) {
      if (row.getVariance_tracker() != null && row.getVariance_tracker().length > 0) {
        val varTracker = VarianceOperations.deserializeFromByteArray(row.getVariance_tracker());
        if (merged == null) {
          merged = varTracker;
        } else {
          merged = merged.merge(varTracker);
        }
      }
    }
    if (merged == null) {
      return new byte[0];
    }
    return VarianceOperations.serialize(merged);
  }

  public ExplodedRow merge(Collection<ExplodedRow> rows) {
    List<ExplodedRow> r = new ArrayList<>(rows.size());
    r.addAll(rows);
    return merge(r);
  }

  public ExplodedRow merge(List<ExplodedRow> rows) {
    if (rows.size() == 0) {
      return null;
    }

    val b = ExplodedRow.builder();
    val first = rows.get(0);
    b.weight(first.getWeight());
    b.model_metrics(mergeModelMetrics(rows));
    b.targetLevel(first.getTargetLevel());
    b.columnName(first.getColumnName());
    b.datasetId(first.getDatasetId());
    b.feedbackRow(first.getFeedbackRow());
    b.rowTerminator(first.getRowTerminator());
    b.classification(mergeClassificationMetrics(rows));
    b.regression(mergeRegressionMetrics(rows));
    b.ingestionMetricRow(first.getIngestionMetricRow());
    b.datasetFields(mergeFields(rows));
    b.segmentText(first.getSegmentText());
    b.orgId(first.getOrgId());
    b.profileId(first.getProfileId());
    b.traceId(first.getTraceId());
    b.subPartition(first.getSubPartition());
    b.aggregationDataGranularity(first.getAggregationDataGranularity());
    b.ts(first.getTs());
    b.histogram(mergeKll(rows));
    b.frequentItems(mergeFreqItems(rows));
    b.uniqueCount(mergeHll(rows));
    b.missing(isMissing(rows));
    b.traceIds(new ArrayList<>(sampleTraceIds(rows)));
    b.lastUploadTs(this.maxLong(rows, ExplodedRow::getLastUploadTs));
    b.mostRecentDatalakeWriteTs(this.maxLong(rows, ExplodedRow::getMostRecentDatalakeWriteTs));
    b.counters_count(this.sumLong(rows, ExplodedRow::getCounters_count));
    b.number_max(maxDouble(rows, ExplodedRow::getNumber_max));
    b.number_min(minDouble(rows, ExplodedRow::getNumber_min));
    b.schema_count_BOOLEAN(sumLong(rows, ExplodedRow::getSchema_count_BOOLEAN));
    b.schema_count_FRACTIONAL(sumLong(rows, ExplodedRow::getSchema_count_FRACTIONAL));
    b.schema_count_INTEGRAL(sumLong(rows, ExplodedRow::getSchema_count_INTEGRAL));
    b.schema_count_NULL(sumLong(rows, ExplodedRow::getSchema_count_NULL));
    b.schema_count_STRING(sumLong(rows, ExplodedRow::getSchema_count_STRING));
    b.schema_count_UNKNOWN(sumLong(rows, ExplodedRow::getSchema_count_UNKNOWN));
    b.counters_count(sumLong(rows, ExplodedRow::getCounters_count));
    b.variance_tracker(mergeVarianceTracker(rows));
    return b.build();
  }

  private ArrayList<String> mergeFields(List<ExplodedRow> rows) {
    Set<String> merged = new HashSet<>();
    for (val r : rows) {
      if (r.getDatasetFields() != null) {
        merged.addAll(r.getDatasetFields());
      }
    }
    return new ArrayList<>(merged);
  }

  private Long sumLong(List<ExplodedRow> rows, Function<ExplodedRow, Long> getter) {
    Optional<Long> opt =
        rows.stream()
            .map(getter)
            .flatMap(l -> Stream.of(Optional.ofNullable(l)))
            .reduce(
                Optional.empty(), (o1, o2) -> o1.isPresent() ? o1.map(l -> l + o2.orElse(0L)) : o2);
    if (opt.isPresent()) {
      return opt.get();
    }
    return null;
  }

  private List<String> sampleTraceIds(List<ExplodedRow> rows) {
    Set<String> traceIds = new HashSet<>();
    for (val r : rows) {
      if (r.getTraceIds() != null && r.getTraceIds().size() > 0) {
        traceIds.addAll(r.getTraceIds());
      }
      // Maintain a sample so we don't OOM or create massive rows is our database
    }
    val l = traceIds.stream().collect(Collectors.toList());
    if (l.size() > MAX_TRACE_ID_SAMPLE_SIZE) {
      return l.subList(0, MAX_TRACE_ID_SAMPLE_SIZE);
    }

    return l;
  }

  private Double sumDouble(List<ExplodedRow> rows, Function<ExplodedRow, Double> getter) {
    Optional<Double> opt =
        rows.stream()
            .map(getter)
            .flatMap(l -> Stream.of(Optional.ofNullable(l)))
            .reduce(
                Optional.empty(),
                (o1, o2) -> o1.isPresent() ? o1.map(l -> l + o2.orElse(0.0)) : o2);

    if (opt.isPresent()) {
      return opt.get();
    }
    return null;
  }

  private Double minDouble(List<ExplodedRow> rows, Function<ExplodedRow, Double> getter) {
    Double first = getter.apply(rows.get(0));
    for (int x = 1; x < rows.size(); x++) {
      first = min(first, getter.apply(rows.get(x)));
    }
    return first;
  }

  private Double maxDouble(List<ExplodedRow> rows, Function<ExplodedRow, Double> getter) {
    Double first = getter.apply(rows.get(0));
    for (int x = 1; x < rows.size(); x++) {
      first = max(first, getter.apply(rows.get(x)));
    }
    return first;
  }

  private Long maxLong(List<ExplodedRow> rows, Function<ExplodedRow, Long> getter) {
    Long first = getter.apply(rows.get(0));
    for (int x = 1; x < rows.size(); x++) {
      first = max(first, getter.apply(rows.get(x)));
    }
    return first;
  }

  private Boolean isMissing(List<ExplodedRow> rows) {
    for (val row : rows) {
      if (!row.getMissing()) {
        return false;
      }
    }
    return true;
  }

  private Double min(Double left, Double right) {
    if (left == null) {
      return right;
    } else if (right == null) {
      return left;
    }
    return Math.min(left, right);
  }

  private Double max(Double left, Double right) {
    if (left == null) {
      return right;
    } else if (right == null) {
      return left;
    }
    return Math.max(left, right);
  }

  private Long max(Long left, Long right) {
    if (left == null) {
      return right;
    } else if (right == null) {
      return left;
    }
    return Math.max(left, right);
  }
}
