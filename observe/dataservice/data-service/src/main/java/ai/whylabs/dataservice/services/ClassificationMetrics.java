package ai.whylabs.dataservice.services;

import static java.lang.Math.abs;

import ai.whylabs.dataservice.responses.ClassificationMetricValues;
import ai.whylabs.dataservice.responses.ClassificationSummaryRow;
import ai.whylabs.dataservice.responses.ConfusionMatrix;
import ai.whylabs.dataservice.responses.ModelMetricsRow;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.whylogs.core.statistics.NumberTracker;
import com.whylogs.v0.core.message.ScoreMatrixMessage;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;
import lombok.Getter;
import lombok.NonNull;
import lombok.experimental.Delegate;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * A thin-veneer that delegates to the ScoreMatrix class from whylogs-java. This is the in-memory
 * representation of classification metrics derived from Model metrics. We use this class to
 * implement proprietary derived metric calculations that we don't want to expose in the open-source
 * java library.
 */
@Slf4j
public class ClassificationMetrics {

  private interface exclude {
    com.whylogs.core.metrics.ClassificationMetrics copy();
  }

  @Delegate(excludes = exclude.class)
  @NonNull
  private final com.whylogs.core.metrics.ClassificationMetrics metrics;

  @Getter private Long lastUploadTs;

  public ClassificationMetrics(@NonNull com.whylogs.core.metrics.ClassificationMetrics cm) {
    metrics = cm;
  }

  public ClassificationMetrics merge(ClassificationMetrics other) {
    if (other == null) {
      return this;
    }
    val cm = new ClassificationMetrics(metrics.merge(other.metrics));
    cm.lastUploadTs = Math.max(lastUploadTs, other.lastUploadTs);
    return cm;
  }

  /**
   * @return string label associated with positive classification outcome
   */
  private String find_positive_label() {
    val label = "1"; // default positive label
    val index = getLabels().indexOf(label);
    if (index == -1) {
      return getLabels().get(0);
    }
    return label;
  }

  // returns interleave two arrays; assumes the arrays are the same size.
  // zip([a1, a2, a3], [b1, b2, b3]) -> [[a1,b1], [a2,b2], [a3, b3]]
  private static double[][] zip(double[] a, double[] b) {
    val result = new double[a.length][2];
    Arrays.setAll(result, i -> new double[] {a[i], b[i]});
    return result;
  }

  // returns element-by-element sum of two arrays; assumes the arrays are the same size.
  double[] sum(double[] a, double[] b) {
    val result = new double[a.length];
    Arrays.setAll(result, i -> a[i] + b[i]);
    return result;
  }

  // returns element-by-element sum of arrays with scalar; assumes the arrays are the same size.
  double[] scalar_sum(double[] a, Double b) {
    val result = new double[a.length];
    Arrays.setAll(result, i -> a[i] + b);
    return result;
  }

  //  element-by-element division of two arrays;  assumes the arrays are the same size.
  double[] div(double[] a, double[] b) {
    val result = new double[a.length];
    Arrays.setAll(result, i -> a[i] / b[i]);
    return result;
  }

  // returns element-by-element sum of arrays with scalar; assumes the arrays are the same size.
  double[] scalar_mul(double[] a, Double b) {
    val result = new double[a.length];
    Arrays.setAll(result, i -> a[i] * b);
    return result;
  }

  // returns element-by-element sum of arrays with scalar; assumes the arrays are the same size.
  double[] scalar_mul(double[] a, Long b) {
    val result = new double[a.length];
    Arrays.setAll(result, i -> a[i] * b.doubleValue());
    return result;
  }

  // max of array elements and scalar, returns array
  double[] max(double[] a, Double b) {
    val result = new double[a.length];
    Arrays.setAll(result, i -> Math.max(a[i], b));
    return result;
  }

  private double[][] roc_summary(double[] fprs, double[] recalls) {
    if (fprs.length == 0) return null;
    return zip(fprs, recalls);
  }

  // Integrate curve from a to b using the trapezoidal rule.
  private Double trapezoidal_integral(double[][] values) {
    int n = values.length;

    double sum = 0;
    for (int i = 0; i < n - 1; i++) {
      val a = values[i];
      val b = values[i + 1];
      // little ◿ at top
      sum += 0.5 * abs(b[1] - a[1]) * (b[0] - a[0]);
      // body of trapezoid
      sum += a[1] * (b[0] - a[0]);
    }

    return sum;
  }

  private double[][] recall_prec_summary(double[] precision, double[] recalls) {
    if (precision.length == 0) return null;
    return zip(recalls, precision);
  }

  @Getter
  class Counters {
    public final Long fp;
    public final Long tp;
    public final Long tn;
    public final Long fn;

    public Counters(int label_indx) {
      fp = fp_cd_counter(label_indx); // false-positive
      tp = tp_cd_counter(label_indx); // true-positive
      tn = tn_cd_counter(label_indx); // true-negative
      fn = fn_cd_counter(label_indx); // false-negative
    }

    // returns number track for false-negative cumulative distribution
    private Long fn_cd_counter(int label_indx) {
      // verified
      final int len = getLabels().size();
      long result = 0L;
      for (int col = 0; col < len; col++) {
        if (col == label_indx) continue;
        // note flipped indicies from fp_cd_tracker
        result += getValues()[col][label_indx].getDoubles().getCount();
      }
      return result;
    }

    private Long tp_cd_counter(int label_indx) {
      return getValues()[label_indx][label_indx].getDoubles().getCount();
    }

    // returns number track for false-positive cumulative distribution
    private Long fp_cd_counter(int label_indx) {
      final int len = getLabels().size();
      long result = 0L;
      for (int col = 0; col < len; col++) {
        if (col == label_indx) continue;
        // note flipped indicies from fn_cd_tracker
        result += getValues()[label_indx][col].getDoubles().getCount();
      }
      return result;
    }

    // returns number track for true-negative cumulative distribution
    // translated from _tn_cd_histogram in mockingbird
    private Long tn_cd_counter(int label_indx) {
      final int len = getLabels().size();
      long result = 0L;
      for (int col = 0; col < len; col++) {
        if (col == label_indx) continue;
        for (int row = 0; row < len; row++) {
          if (row == label_indx) continue;
          result += getValues()[row][col].getDoubles().getCount();
        }
      }
      return result;
    }
  }

  private double[] linspace(double start, double end, int n_bins) {
    double width = (end - start) / (double) n_bins;
    width = Math.max(width, Math.ulp(start));
    int noSplitPoints = n_bins - 1;
    double[] splitPoints = new double[noSplitPoints];
    for (int i = 0; i < noSplitPoints; ++i) {
      splitPoints[i] = start + (double) (i + 1) * width;
    }
    return splitPoints;
  }

  class Trackers {
    private final int nbins = 100;

    // Bernease H. says calibration charts typically have only 10 bins.
    // "I've never seen this chart done with more than 10"
    private final int calibration_nbins = 10;

    public final NumberTracker fp;
    public final NumberTracker tp;
    public final NumberTracker tn;
    public final NumberTracker fn;
    public final double[] bins;

    public Trackers(int label_indx) {
      fp = fp_cd_tracker(label_indx); // false-positive
      tp = tp_cd_tracker(label_indx); // true-positive
      tn = tn_cd_tracker(label_indx); // true-negative
      fn = fn_cd_tracker(label_indx); // false-negative

      bins = get_normalized_bins(nbins);
    }

    // returns number track for false-negative cumulative distribution
    private NumberTracker fn_cd_tracker(int label_indx) {
      // verified
      final int len = getLabels().size();
      NumberTracker result = new NumberTracker();
      for (int col = 0; col < len; col++) {
        if (col == label_indx) continue;
        // note flipped indicies from fp_cd_tracker
        result = result.merge(getValues()[col][label_indx]);
      }
      return result;
    }

    private NumberTracker tp_cd_tracker(int label_indx) {
      return getValues()[label_indx][label_indx];
    }

    // returns number track for false-positive cumulative distribution
    private NumberTracker fp_cd_tracker(int label_indx) {
      final int len = getLabels().size();
      NumberTracker result = new NumberTracker();
      for (int col = 0; col < len; col++) {
        if (col == label_indx) continue;
        // note flipped indicies from fn_cd_tracker
        result = result.merge(getValues()[label_indx][col]);
      }
      return result;
    }

    // returns number track for true-negative cumulative distribution
    // translated from _tn_cd_histogram in mockingbird
    private NumberTracker tn_cd_tracker(int label_indx) {
      final int len = getLabels().size();
      NumberTracker result = new NumberTracker();
      for (int col = 0; col < len; col++) {
        if (col == label_indx) continue;
        for (int row = 0; row < len; row++) {
          if (row == label_indx) continue;
          result = result.merge(getValues()[row][col]);
        }
      }
      return result;
    }

    // translated from _get_normalized_bins in mockingbird
    private double[] get_normalized_bins(int n_bins) {
      double start = min(tp, tn, fp, fn);
      double end = max(tp, tn, fp, fn);
      return linspace(start, end, n_bins);
    }

    public Long actual_true_count() {
      return tp_count() + fn_count();
    }

    public Long actual_false_count() {
      return tn_count() + fp_count();
    }

    private double max(NumberTracker... trackers) {
      val value =
          Arrays.stream(trackers)
              .map(t -> t.getHistogram().getMaxValue())
              .filter(d -> !d.isNaN())
              .max(Double::compare);
      return value.orElse(0D);
    }

    private double min(NumberTracker... trackers) {
      val value =
          Arrays.stream(trackers)
              .map(t -> t.getHistogram().getMinValue())
              .filter(d -> !d.isNaN())
              .min(Double::compare);
      return value.orElse(0D);
    }

    /** convenience function - cdf is only used for ROC plot over a a high number of bins */
    private double[] cdf(NumberTracker t) {
      return cdf(t, bins);
    }

    private double[] cdf(NumberTracker t, double[] bins) {
      val total_count = t.getDoubles().getCount();
      if (total_count == 0 || t.getHistogram().isEmpty()) {
        return new double[bins.length + 1];
      } else {
        val cdf = t.getHistogram().getCDF(bins);
        return Arrays.stream(cdf).map(v -> total_count * (1.0 - v)).toArray();
      }
    }

    private double[] pmf(NumberTracker t, double[] bins) {
      val total_count = t.getDoubles().getCount();
      if (total_count == 0 || t.getHistogram().isEmpty()) {
        return new double[bins.length + 1];
      } else {
        val cdf = t.getHistogram().getPMF(bins);
        return Arrays.stream(cdf).map(v -> total_count * v).toArray();
      }
    }

    public double[] actual_true_cd_dist() {
      return sum(cdf(tp), cdf(fn));
    }

    public double[] actual_false_cd_dist() {
      return sum(cdf(tn), cdf(fp));
    }

    // Java implementation derived from model calibration notebook by Bernease H.
    private double[][] calibration() {

      val correct_kll =
          new KllDoublesSketch(Math.max(tp.getHistogram().getK(), tn.getHistogram().getK()));
      correct_kll.merge(tp.getHistogram());
      correct_kll.merge(tn.getHistogram());
      val incorrect_kll =
          new KllDoublesSketch(Math.max(fp.getHistogram().getK(), fn.getHistogram().getK()));
      incorrect_kll.merge(fp.getHistogram());
      incorrect_kll.merge(fn.getHistogram());

      if (correct_kll.isEmpty() || incorrect_kll.isEmpty()) {
        // if either sketch is empty, return empty calibration.
        return new double[][] {{}};
      }

      val overall_min = Math.min(correct_kll.getMinValue(), incorrect_kll.getMinValue());
      val overall_max = Math.max(correct_kll.getMaxValue(), incorrect_kll.getMaxValue());

      // correct_splits = (np.linspace(0,1,11) * (correct_max - correct_min) + correct_min) [:-1]
      final double binSize =
          Math.max((overall_max - overall_min) / calibration_nbins, Math.ulp(overall_min));
      double[] splits =
          IntStream.range(0, calibration_nbins)
              .mapToDouble(i -> overall_min + i * binSize)
              .toArray();
      splits = Arrays.copyOf(splits, splits.length - 1);

      // correct_counts = np.array(correct.kll.value.get_pmf(split_points=correct_splits[:-1])) *
      // correct.n
      val correct_counts = scalar_mul(correct_kll.getPMF(splits), correct_kll.getN());

      // incorrect_counts =
      // np.array(incorrect.kll.value.get_pmf(split_points=incorrect_splits[:-1])) * incorrect.n
      val incorrect_counts = scalar_mul(incorrect_kll.getPMF(splits), incorrect_kll.getN());

      // freq_by_bucket = correct_counts / (correct_counts + incorrect_counts + 0)
      val freq_by_bucket = div(correct_counts, sum(correct_counts, incorrect_counts));

      final double bucketsSize = Math.max(1.0 / calibration_nbins, Math.ulp(1.0));
      final double[] midpoints =
          IntStream.range(1, calibration_nbins + 1)
              .mapToDouble(i -> i * bucketsSize - (bucketsSize / 2.0))
              .toArray();
      return zip(midpoints, freq_by_bucket);
    }

    public long tp_count() {
      return tp.getDoubles().getCount();
    }

    public long fp_count() {
      return fp.getDoubles().getCount();
    }

    public long tn_count() {
      return tn.getDoubles().getCount();
    }

    public long fn_count() {
      return fn.getDoubles().getCount();
    }
  }

  /**
   * Calculation of ROC and Precision curves based on numpy/python code found in mockingbird.
   * https://gitlab.com/whylabs/datascience/whylogs-mockingbird/-/blob/mainline/mockingbird/merger/compute_metrics.py#L473
   *
   * @return ClassificationSummary containing ROC and precisions curves, and confusion matrix
   */
  public ClassificationSummaryRow toSummaryRowBuilder(Long timestamp) {

    val label = find_positive_label();
    val label_indx = getLabels().indexOf(label);

    // translated from _get_normalized_bins in mockingbird
    val trackers = new Trackers(label_indx);

    val actual_true_count = trackers.actual_true_count();
    val actual_false_count = trackers.actual_false_count();

    val actual_true_cd_dist = trackers.actual_true_cd_dist(); // tp_cd_dist + fn_cd_dist
    val actual_false_cd_dist = trackers.actual_false_cd_dist(); // tn_cd_dist + fp_cd_dist
    val pred_true_cd_dist = sum(actual_true_cd_dist, actual_false_cd_dist);

    val min_val = Math.ulp(1.0); // np.finfo(float).eps

    val fpr =
        Arrays.stream(actual_false_cd_dist)
            .map(v -> v / Math.max(actual_false_count, min_val))
            .toArray();
    val recall =
        Arrays.stream(actual_true_cd_dist)
            .map(v -> v / Math.max(actual_true_count, min_val))
            .toArray();
    val precision = div(actual_true_cd_dist, max(pred_true_cd_dist, min_val));
    // temporary hack - force precision at 0 recall == 1 by definition
    // requested by richard@whylabs & bernease@whylabs pending formal fix
    Arrays.setAll(precision, i -> recall[i] == 0 ? 1.0 : precision[i]);

    val roc = roc_summary(fpr, recall);
    // sort in-place by fpr;
    Arrays.sort(
        roc,
        new Comparator<double[]>() {
          @Override
          public int compare(double[] o1, double[] o2) {
            return Double.compare(o1[0], o2[0]);
          }
        });
    val aucroc = trapezoidal_integral(roc);

    val recall_prec = recall_prec_summary(precision, recall);

    val calibration = trackers.calibration();

    val cm =
        new ConfusionMatrix(
            metrics.getLabels(),
            metrics.getTargetField(),
            metrics.getPredictionField(),
            metrics.getScoreField(),
            metrics.getConfusionMatrix());

    return ClassificationSummaryRow.builder()
        .timestamp(timestamp)
        .roc(roc)
        .aucroc(aucroc)
        .precision(recall_prec)
        .confusion(cm)
        .calibration(calibration)
        .last_upload_ts(lastUploadTs)
        .build();
  }

  // translated from `compute_total_accuracy` in mockingbird
  private double compute_total_accuracy() {
    long total_tp = 0;
    long total_fp = 0;

    for (int idx = 0; idx < getLabels().size(); idx++) {
      val counters = new Counters(idx);
      total_tp += counters.getTp();
      total_fp += counters.getFp();
    }
    val total_count = total_tp + total_fp;
    if (total_count == 0.0) {
      return 0L;
    }
    return (double) total_tp / total_count;
  }

  // translated from `compute_f_score` in mockingbird
  private static Double compute_f_score(Double prec, Double recall, double beta) {
    val beta2 = beta * beta;
    val min_val = Math.ulp(1.0F);
    return (1.0D + beta2) * prec * recall / (beta2 * prec + recall + min_val);
  }

  private static Double compute_f_score(Double prec, Double recall) {
    return compute_f_score(prec, recall, 1D);
  }

  public static final ClassificationMetrics fromModelMetricsRow(@NonNull ModelMetricsRow row)
      throws InvalidProtocolBufferException {
    ClassificationMetrics cm = fromProtobuf(row.getMetrics());
    if (cm != null) cm.lastUploadTs = row.getLastUploadTs();
    return cm;
  }

  public static final ClassificationMetrics fromProtobuf(@NonNull byte[] bytes)
      throws InvalidProtocolBufferException {
    val sm = ScoreMatrixMessage.parseFrom(DruidStringUtils.decodeBase64(bytes));
    val core = com.whylogs.core.metrics.ClassificationMetrics.fromProtobuf(sm);
    return core != null ? new ClassificationMetrics(core) : null;
  }

  public ClassificationMetricValues toMetricValues() {
    final int num_orig_labels = getLabels().size();
    if (num_orig_labels == 2) {
      List<String> positive_labels = new ArrayList<String>(1);
      positive_labels.add(find_positive_label());
      return toMetricValues(positive_labels);
    } else {
      return toMetricValues(getLabels());
    }
  }

  /**
   * Calculates single-value metrics derived from ScoreMatrixMessage protobuf message. Unlike the
   * results from `toSummary`, the results from this calculation are individual double values, not
   * vectors. These metrics are useful for monitor alerting. translated from
   * `compute_metrics.py:track_metrics` in mockingbird.
   *
   * @param positive_labels List of positive labels
   * @return ClassificationMetricValues data object holding single-value metrics
   */
  public ClassificationMetricValues toMetricValues(List<String> positive_labels) {
    List<String> calc_labels;
    int label_indx;
    final int num_orig_labels = getLabels().size();
    Double min_val = Math.ulp(1.0D);

    if (num_orig_labels == 2) {
      calc_labels = positive_labels;
    } else {
      calc_labels = getLabels();
    }

    double pos_tp_count = 0D, pos_tn_count = 0D, pos_fp_count = 0D, pos_fn_count = 0D;
    double pos_macro_fpr = 0D, pos_macro_tpr = 0D;
    double sum_tp_count = 0D, sum_tn_count = 0D, sum_fp_count = 0D, sum_fn_count = 0D;
    double macro_fpr = 0D, macro_prec = 0D, macro_rec = 0D, macro_f1 = 0D;
    double macro_auc = 0D;

    ClassificationMetricValues.ClassificationMetricValuesBuilder builder =
        ClassificationMetricValues.builder();

    for (int i = 0; i < positive_labels.size(); i++) {
      label_indx = getLabels().indexOf(positive_labels.get(i));
      val counters = new Counters(label_indx);

      pos_tp_count += counters.getTp();
      pos_tn_count += counters.getTn();
      pos_fp_count += counters.getFp();
      pos_fn_count += counters.getFn();

      // positive value only macroaveraging
      pos_macro_fpr +=
          (counters.getFp() / (Math.max(counters.getFp() + counters.getTn(), min_val)))
              / positive_labels.size();
      pos_macro_tpr +=
          (counters.getTp() / (Math.max(counters.getTp() + counters.getFn(), min_val)))
              / positive_labels.size();
    }

    for (int i = 0; i < calc_labels.size(); i++) {
      label_indx = getLabels().indexOf(calc_labels.get(i));
      val counters = new Counters(label_indx);

      sum_tp_count += counters.getTp();
      sum_tn_count += counters.getTn();
      sum_fp_count += counters.getFp();
      sum_fn_count += counters.getFn();

      // macroaveraging
      double single_macro_prec =
          counters.getTp() / (Math.max(counters.getTp() + counters.getFp(), min_val));
      double single_macro_rec =
          counters.getTp() / (Math.max(counters.getTp() + counters.getFn(), min_val));

      macro_prec += single_macro_prec / calc_labels.size();
      macro_rec += single_macro_rec / calc_labels.size();
      macro_f1 += compute_f_score(single_macro_prec, single_macro_rec) / calc_labels.size();
      macro_fpr +=
          (counters.getFp() / (Math.max(counters.getFp() + counters.getTn(), min_val)))
              / calc_labels.size();

      // copied from this.toSummaryRowBuilder
      val trackers = new Trackers(label_indx);
      val actual_true_count = trackers.actual_true_count();
      val actual_false_count = trackers.actual_false_count();
      val actual_true_cd_dist = trackers.actual_true_cd_dist(); // tp_cd_dist + fn_cd_dist
      val actual_false_cd_dist = trackers.actual_false_cd_dist(); // tn_cd_dist + fp_cd_dist

      val fpr =
          Arrays.stream(actual_false_cd_dist)
              .map(v -> v / Math.max(actual_false_count, min_val))
              .toArray();
      val recall =
          Arrays.stream(actual_true_cd_dist)
              .map(v -> v / Math.max(actual_true_count, min_val))
              .toArray();
      val roc = roc_summary(fpr, recall);
      // sort in-place by fpr;
      Arrays.sort(
          roc,
          new Comparator<double[]>() {
            @Override
            public int compare(double[] o1, double[] o2) {
              return Double.compare(o1[0], o2[0]);
            }
          });

      macro_auc += trapezoidal_integral(roc);
    }

    // positive values
    builder.posMacroFpr(pos_macro_fpr);
    builder.posMacroTpr(pos_macro_tpr);
    builder.posMicroFpr(pos_fp_count / (Math.max(pos_fp_count + pos_tn_count, min_val)));
    builder.posMicroTpr(pos_tp_count / (Math.max(pos_tp_count + pos_fn_count, min_val)));

    // macroaveraging
    builder.macroFpr(macro_fpr);
    builder.macroPrecision(macro_prec);
    builder.macroRecall(macro_rec);
    builder.macroF1(macro_f1);
    builder.macroAuc(macro_auc / calc_labels.size());

    // microaveraging
    double micro_prec = sum_tp_count / (Math.max(sum_tp_count + sum_fp_count, min_val));
    double micro_rec = sum_tp_count / (Math.max(sum_tp_count + sum_fn_count, min_val));

    builder.microPrecision(micro_prec);
    builder.microRecall(micro_rec);
    builder.microF1(compute_f_score(micro_prec, micro_rec));
    builder.microFpr(sum_fp_count / (Math.max(sum_fp_count + sum_tn_count, min_val)));

    // accuracy
    builder.accuracy(compute_total_accuracy());

    // defaults
    builder.recall(macro_rec);
    builder.precision(macro_prec);
    builder.f1(macro_f1);
    builder.fpr(pos_macro_fpr);

    // most recent upload for this row of merged data
    if (lastUploadTs != null) builder.last_upload_ts(lastUploadTs);

    return builder.build();
  }
}
