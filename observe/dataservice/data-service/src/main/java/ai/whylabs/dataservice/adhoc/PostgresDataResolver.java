package ai.whylabs.dataservice.adhoc;

import static ai.whylabs.druid.whylogs.v1.WhyLogsV1toV0Iterator.*;
import static java.util.Objects.isNull;

import ai.whylabs.adhoc.resolvers.DataResolverV3;
import ai.whylabs.adhoc.resolvers.IntervalCalculator;
import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.FixedThresholdsConfig;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.BaselineTimerangePredicateExplodedRowV3;
import ai.whylabs.core.predicatesV3.inclusion.AdhocRequestRequiresProfilePredicate;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.metrics.agg.Agg;
import ai.whylabs.dataservice.metrics.agg.BuiltinSpec;
import ai.whylabs.dataservice.metrics.service.TimeSeriesMetricService;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.responses.ColumnMetricEntity;
import ai.whylabs.dataservice.services.AnalysisService;
import ai.whylabs.dataservice.services.DatasetMetricsService;
import ai.whylabs.dataservice.services.ProfileService;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.google.common.annotations.VisibleForTesting;
import com.whylogs.v0.core.message.VarianceMessage;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.inject.Singleton;
import liquibase.util.StringUtil;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.NotImplementedException;
import org.apache.commons.lang3.tuple.Pair;
import org.jetbrains.annotations.NotNull;
import org.joda.time.Interval;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class PostgresDataResolver implements DataResolverV3 {

  @Inject private final ProfileService profileService;
  @Inject private final DatasetMetricsService datasetMetricsService;
  @Inject private final AnalysisService analysisService;
  @Inject private final TimeSeriesMetricService metricService;

  /** Construct timeseries query, gather results from postgres */
  public List<ExplodedRow> getMetricsExplodedRows(
      String orgId,
      String datasetId,
      @NonNull List<SegmentTag> segment,
      List<String> columnNames,
      List<Analyzer> analyzers,
      Interval interval,
      DataGranularity granularity) {

    // Separate the column specs from the dataset specs.
    // We only want to generate dataset-level ExplodedRows for columnName == null
    // and only generate column-level ExplodedRows for columnName != null.
    Set<BuiltinSpec> columnSpecs = new HashSet<>();
    for (val analyzer : analyzers) {
      columnSpecs.addAll(getBuiltinColumnSpecs(analyzer.getMetric()));
    }
    Set<BuiltinSpec> datasetSpecs = new HashSet<>();
    for (val analyzer : analyzers) {
      datasetSpecs.addAll(
          getBuiltinDatasetSpecs(analyzer.getMetric(), orgId, datasetId, analyzer.getId()));
    }

    // Now collect all the metrics for each columnName.
    List<ExplodedRow> rows = new ArrayList<>();
    for (val columnName : columnNames) {
      if (isNull(columnName)) {
        rows.addAll(
            getMetricsExplodedRows(
                orgId, datasetId, segment, columnName, datasetSpecs, interval, granularity));
      } else {
        rows.addAll(
            getMetricsExplodedRows(
                orgId, datasetId, segment, columnName, columnSpecs, interval, granularity));
      }
    }

    return rows;
  }

  /** Construct timeseries query, gather results from postgres, and */
  public List<ExplodedRow> getMetricsExplodedRows(
      String orgId,
      String datasetId,
      @NonNull List<SegmentTag> segment,
      String columnName,
      Set<BuiltinSpec> specs,
      Interval interval,
      DataGranularity granularity) {

    final List<Pair<BuiltinSpec, List<? extends Agg.Row>>> pgResults =
        queryProfileMetrics(orgId, datasetId, columnName, specs, segment, interval, granularity);

    return packageResults(pgResults, orgId, datasetId, columnName, segment, granularity);
  }

  /**
   * Translate an analyzer metric to a series of timeseries queries and return the raw values.
   *
   * <p>Returns lists of aggregated values from Postgres. A single analyzer metric will generate
   * zero or more lists of results. Each list of results is packaged with the timeseries spec used
   * in the query.
   *
   * <p>Within each list of results, individual values are packages with timestamp and traceid, if
   * available.
   */
  @NotNull
  @VisibleForTesting
  List<Pair<BuiltinSpec, List<? extends Agg.Row>>> queryProfileMetrics(
      String orgId,
      String datasetId,
      String columnName,
      Set<BuiltinSpec> specs,
      @NonNull List<SegmentTag> segment,
      Interval interval,
      DataGranularity granularity) {

    // Returns a list of lists.  Each top-level list has the Spec from which is
    // was created along with the list of rows returned from Postgres.
    List<Pair<BuiltinSpec, List<? extends Agg.Row>>> results = new ArrayList<>();
    for (val spec : specs) {
      final List<? extends Agg.Row> rawRows =
          metricService.queryRowsFromProfilesStandby(
              orgId, datasetId, columnName, segment, interval, granularity, spec);
      results.add(Pair.of(spec, rawRows));
    }
    return results;
  }

  /** Translate dataset-level analyzer metric to builtin timeseries specs. */
  @NotNull
  static List<BuiltinSpec> getBuiltinDatasetSpecs(
      String metric, String orgId, String datasetId, String analyzerId) {
    // convert to list of timeseries Spec objects.  This will tell us which PG columns to query and
    // how to aggregate the results.
    List<BuiltinSpec> specs = new ArrayList<>();
    switch (AnalysisMetric.fromName(metric)) {
      case missingDatapoint:
        // special signal metric for determining
        specs.add(BuiltinSpec.missing_datapoint);
        break;
      case secondsSinceLastUpload:
        specs.add(BuiltinSpec.last_upload_ts);
        break;
      case mostRecentDatasetTs:
      case mostRecentDatasetDatalakeWriteTs:
        // skip ingestion metrics.
        // these will be resolved by `getIngestionMetricRows`
        break;

      case classification_recall:
      case classification_fpr:
      case classification_precision:
      case classification_accuracy:
      case classification_f1:
      case classification_auroc:
        specs.add(BuiltinSpec.classification_raw);
        break;
      case regression_mse:
      case regression_mae:
      case regression_rmse:
        specs.add(BuiltinSpec.regression_raw);
        break;
      default:
        log.trace(
            "unimplemented dataset metric \"{}\" {}, {}, {}", metric, orgId, datasetId, analyzerId);
    }
    return specs;
  }

  /**
   * Translate analyzer metric string to builtin timeseries metric specs. Note some metrics
   * translate to multiple specs, e.g. `unique_upper_ratio` will generate spec for unique count and
   * the overall count. The analyzer will compute the actual metric by performing the division.
   */
  @NotNull
  static List<BuiltinSpec> getBuiltinColumnSpecs(String metric) {
    // convert to list of timeseries Spec objects.  This will tell us which PG columns to query and
    // how to aggregate the results.
    List<BuiltinSpec> specs = new ArrayList<>();
    switch (AnalysisMetric.fromName(metric)) {
      case min:
      case median:
      case max:
      case quantile_5:
      case quantile_25:
      case quantile_75:
      case quantile_90:
      case quantile_95:
      case quantile_99:
      case histogram:
        specs.add(BuiltinSpec.kll_raw);
        break;
      case unique_est:
      case unique_upper:
      case unique_lower:
        specs.add(BuiltinSpec.hll_raw);
        break;
      case unique_est_ratio:
      case unique_upper_ratio:
      case unique_lower_ratio:
        specs.add(BuiltinSpec.hll_raw);
        specs.add(BuiltinSpec.count);
        break;
      case count:
        specs.add(BuiltinSpec.count);
        break;
      case count_null:
        specs.add(BuiltinSpec.count_null);
        break;
      case count_bool:
        specs.add(BuiltinSpec.count_bool);
        break;
      case count_integral:
        specs.add(BuiltinSpec.count_integral);
        break;
      case count_fractional:
        specs.add(BuiltinSpec.count_fractional);
        break;
      case count_string:
        specs.add(BuiltinSpec.count_string);
        break;
      case count_null_ratio:
        specs.add(BuiltinSpec.count_null);
        specs.add(BuiltinSpec.count);
        break;
      case count_bool_ratio:
        specs.add(BuiltinSpec.count_bool);
        specs.add(BuiltinSpec.count);
        break;
      case count_integral_ratio:
        specs.add(BuiltinSpec.count_integral);
        specs.add(BuiltinSpec.count);
        break;
      case count_fractional_ratio:
        specs.add(BuiltinSpec.count_fractional);
        specs.add(BuiltinSpec.count);
        break;
      case count_string_ratio:
        specs.add(BuiltinSpec.count_string);
        specs.add(BuiltinSpec.count);
        break;
      case mean:
      case stddev:
        specs.add(BuiltinSpec.variance_raw);
        break;
      case inferred_data_type:
        specs.add(BuiltinSpec.count_object);
        specs.add(BuiltinSpec.count_fractional);
        specs.add(BuiltinSpec.count_integral);
        specs.add(BuiltinSpec.count_bool);
        specs.add(BuiltinSpec.count_string);
        break;
      case frequent_items:
        specs.add(BuiltinSpec.frequent_strings_raw);
        break;
      case missingDatapoint:
        // missingDatapoint is special in that it is both a column-level and dataset-level metric
        specs.add(BuiltinSpec.missing_datapoint);
        break;
      default:
        log.trace("unimplemented column metric \"{}\"", metric);
    }
    return specs;
  }

  @NotNull
  private List<ExplodedRow> packageResults(
      List<Pair<BuiltinSpec, List<? extends Agg.Row>>> pgResults,
      String orgId,
      String datasetId,
      String columnName,
      @NonNull List<SegmentTag> segment,
      DataGranularity tsGranularity) {
    // Combine results from potentially multiple metric specs. There may be zero or more
    // entries in pgResults depending on the analyzer metric being serviced.
    //
    // Each entry in pgResults consists of a metric spec and the list of values extracted
    // from PG based on that spec. For example ingestion metrics generate no results here.
    // All "_ratio" metrics will each generate two sets of results. "inferred_data_type"
    // metric generates five sets of results.
    //
    // Here we iterate through each set of results, grouping values with identical timestamps
    // together into ExplodedRows.

    String segmentText = toSegmentText(segment);
    Map<Long, ExplodedRow.ExplodedRowBuilder> builders = new TreeMap<>();
    for (val l : pgResults) {
      val spec = l.getLeft();
      for (val pgRow : l.getRight()) { // iterate through the rows from PG

        // timeseries queries generate one row for every granular timestamp whether there is data
        // for that timestamp or not. Skip empty rows to make the analyzer logic happy.
        if (pgRow.isEmpty()) continue;

        ExplodedRow.ExplodedRowBuilder eb = builders.get(pgRow.getTimestamp());
        if (eb == null) {
          eb =
              getTemplate()
                  .orgId(orgId)
                  .datasetId(datasetId)
                  .columnName(columnName)
                  .ts(pgRow.getTimestamp())
                  .traceId(pgRow.getTraceId())
                  .traceIds(new ArrayList<>(Collections.singletonList(pgRow.getTraceId())))
                  .segmentText(segmentText);
          if (tsGranularity.equals(DataGranularity.individual)) {
            eb.aggregationDataGranularity(AggregationDataGranularity.INDIVIDUAL);
          } else {
            eb.aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP);
          }

          builders.put(pgRow.getTimestamp(), eb);
        }
        switch (spec) {
          case kll_raw:
            eb.histogram(DruidStringUtils.decodeBase64(((Agg.BytesRow) pgRow).getValue()));
            break;
          case hll_raw:
            eb.uniqueCount(DruidStringUtils.decodeBase64(((Agg.BytesRow) pgRow).getValue()));
            break;
          case variance_raw:
            final BigDecimal[] dd = ((Agg.VarianceRow) pgRow).getValue();
            val varianceMessageBuilder = VarianceMessage.newBuilder();
            varianceMessageBuilder.setCount(dd[0].longValue());
            varianceMessageBuilder.setMean(dd[2].doubleValue());
            varianceMessageBuilder.setSum(dd[1].doubleValue());
            eb.variance_tracker(varianceMessageBuilder.build().toByteArray());
            break;
          case frequent_strings_raw:
            eb.frequentItems(DruidStringUtils.decodeBase64(((Agg.BytesRow) pgRow).getValue()));
            break;
          case count:
            eb.counters_count(((Agg.NumericRow) pgRow).getValue().longValue());
            break;
          case count_null:
            eb.schema_count_NULL(((Agg.NumericRow) pgRow).getValue().longValue());
            break;
          case count_bool:
            eb.schema_count_BOOLEAN(((Agg.NumericRow) pgRow).getValue().longValue());
            break;
          case count_string:
            eb.schema_count_STRING(((Agg.NumericRow) pgRow).getValue().longValue());
            break;
          case count_integral:
            eb.schema_count_INTEGRAL(((Agg.NumericRow) pgRow).getValue().longValue());
            break;
          case count_fractional:
            eb.schema_count_FRACTIONAL(((Agg.NumericRow) pgRow).getValue().longValue());
            break;
          case count_object:
            eb.schema_count_UNKNOWN(((Agg.NumericRow) pgRow).getValue().longValue());
            break;
          case classification_raw:
            eb.classification(DruidStringUtils.decodeBase64(((Agg.BytesRow) pgRow).getValue()));
            eb.targetLevel(TargetLevel.dataset);
            eb.columnName(BaseCalculationV3.DATASET_METRIC_ROW);
            break;
          case regression_raw:
            eb.regression(DruidStringUtils.decodeBase64(((Agg.BytesRow) pgRow).getValue()));
            eb.targetLevel(TargetLevel.dataset);
            eb.columnName(BaseCalculationV3.DATASET_METRIC_ROW);
            break;
          case missing_datapoint:
            if (columnName == null) {
              eb.targetLevel(TargetLevel.dataset);
              eb.columnName(BaseCalculationV3.DATASET_METRIC_ROW);
            }
            eb.missing(((Agg.NumericRow) pgRow).getValue().longValue() == 1);
            break;
          case last_upload_ts:
            eb.targetLevel(TargetLevel.dataset);
            eb.columnName(BaseCalculationV3.DATASET_METRIC_ROW);
            eb.lastUploadTs(((Agg.NumericRow) pgRow).getValue().longValue());
            break;
          default:
            throw new NotImplementedException(
                String.format("Cannot make ExplodedRow from %s", spec));
        }
      }
    }

    // iterate one final time to build each row.
    return builders.values().stream().map(eb -> eb.build()).collect(Collectors.toList());
  }

  @SneakyThrows
  @Override
  public List<ExplodedRow> resolveStandardProfiles(AdHocMonitorRequestV3 request) {
    if (request.getEnableDatasetLevelAnalysis() == null) {
      request.setEnableDatasetLevelAnalysis(false);
    }
    val interval = Interval.parse(request.getStart() + "/" + request.getEnd());
    List<ExplodedRow> rows = new ArrayList<>();
    val intervals = IntervalCalculator.getIntervals(request.getMonitorConfig(), interval);
    DataGranularity resolverGranularity =
        DataGranularity.valueOf(request.getMonitorConfig().getGranularity().name());

    Set<DataGranularity> dataGranularities = new HashSet<>();
    for (val a : request.getMonitorConfig().getAnalyzers()) {
      if (a.isDisableTargetRollup()) {
        /**
         * It's okay that normal analyzers also get resolved from the individual table. The exploded
         * row collector will handle the merging for those analyzers.
         */
        dataGranularities.add(DataGranularity.individual);
      } else {
        dataGranularities.add(resolverGranularity);
      }
    }

    for (val g : dataGranularities) {
      for (val i : intervals) {
        val config = request.getMonitorConfig();
        if (request.getSegmentTags() != null && request.getSegmentTags().size() > 0) {
          for (val seg : request.getSegmentTags()) {
            List<SegmentTag> segment = new ArrayList<>();
            for (val t : seg) {
              segment.add(SegmentTag.builder().key(t.getKey()).value(t.getValue()).build());
            }
            rows.addAll(
                getMetricsExplodedRows(
                    config.getOrgId(),
                    config.getDatasetId(),
                    segment,
                    request.getColumnNames(),
                    config.getAnalyzers(),
                    i,
                    g));
          }
        } else {
          rows.addAll(
              getMetricsExplodedRows(
                  config.getOrgId(),
                  config.getDatasetId(),
                  Collections.emptyList(),
                  request.getColumnNames(),
                  config.getAnalyzers(),
                  i,
                  g));
        }
      }
    }

    return rows;
  }

  private String toSegmentText(List<SegmentTag> tags) {
    if (tags == null || tags.size() == 0) {
      return "";
    }

    List<String> tagKVs = new ArrayList<>();
    for (val t : tags) {
      String tagKV = t.getKey() + "=" + t.getValue();
      tagKVs.add(tagKV);
    }
    return StringUtil.join(tagKVs, "&");
  }

  private ExplodedRow.ExplodedRowBuilder getTemplate() {
    val eb = ExplodedRow.builder();
    eb.missing(false);
    eb.feedbackRow(false);
    eb.ingestionMetricRow(false);
    eb.rowTerminator(false);
    eb.subPartition(0);
    eb.targetLevel(TargetLevel.column);
    eb.monitorConfigBin(0L);
    eb.counters_count(0L);
    eb.schema_count_BOOLEAN(0L);
    eb.schema_count_NULL(0L);
    eb.schema_count_STRING(0L);
    eb.schema_count_FRACTIONAL(0L);
    eb.schema_count_INTEGRAL(0L);
    eb.schema_count_UNKNOWN(0L);
    return eb;
  }

  /**
   * As we V1-ify the monitor pipeline we'll inch away from using ExplodedRow in its current form,
   * but for now we need to translate backwards*
   */
  private ExplodedRow.ExplodedRowBuilder explodedRowBuilder(List<ColumnMetricEntity> v1metrics) {
    val eb = getTemplate();
    val varianceMessageBuilder = VarianceMessage.newBuilder();

    // TODO: Dataset fields
    for (val row : v1metrics) {
      switch (row.getMetricPath()) {
        case TYPES_FRACTIONAL:
          eb.schema_count_FRACTIONAL(row.getLongs());
          break;
        case TYPES_INTEGRAL:
          eb.schema_count_INTEGRAL(row.getLongs());
          break;
        case TYPES_STRING:
          eb.schema_count_STRING(row.getLongs());
          break;
        case TYPES_OBJECT:
          // TODO:
          break;
        case TYPES_BOOLEAN:
          eb.schema_count_BOOLEAN(row.getLongs());
          break;
        case COUNTS_N:
          varianceMessageBuilder.setCount(row.getLongs());
          eb.counters_count(row.getLongs());
          break;
        case COUNTS_NULL:
          eb.schema_count_NULL(row.getLongs());
          break;
        case KLL:
          if (row.getStrings() != null) {
            eb.histogram(
                DruidStringUtils.decodeBase64(row.getStrings().getBytes(StandardCharsets.UTF_8)));
          }
          break;
        case MEAN:
          varianceMessageBuilder.setMean(row.getDoubles());
          break;
        case VARIANCE:
          varianceMessageBuilder.setSum(row.getDoubles());
          break;
        case FREQUENT_STRING:
          if (row.getStrings() != null) {
            eb.frequentItems(
                DruidStringUtils.decodeBase64(row.getStrings().getBytes(StandardCharsets.UTF_8)));
          }
          break;
        case HLL:
          if (row.getStrings() != null) {
            eb.uniqueCount(
                DruidStringUtils.decodeBase64(row.getStrings().getBytes(StandardCharsets.UTF_8)));
          }
          break;
        case ProfileService.TRACE_ID_PATH:
          eb.traceIds(new ArrayList<>(Collections.singletonList(row.getStrings())));
          break;
        case "distribution/kll/n":
        case "cardinality/est":
        case "cardinality/upper_1":
        case "cardinality/lower_1":
          log.trace(
              "Ignored metric path (we only care about the sketch itself): {}",
              row.getMetricPath());
          break;

        default:
          log.trace("Unsupported metric path: {}", row.getMetricPath());
      }
    }
    eb.variance_tracker(varianceMessageBuilder.build().toByteArray());
    return eb;
  }

  @Override
  public List<ExplodedRow> resolveReferenceProfiles(AdHocMonitorRequestV3 request) {
    List<ExplodedRow> rows = new ArrayList<>();

    for (val analyzer : request.getMonitorConfig().getAnalyzers()) {
      if (analyzer.getTargetMatrix() != null && analyzer.getTarget().getProfileId() != null) {
        rows.addAll(queryRefProfile(request, analyzer.getTarget().getProfileId()));
      }

      if (analyzer.getBaseline() == null
          || !analyzer.getBaseline().getClass().isAssignableFrom(ReferenceProfileId.class)) {
        continue;
      }
      val baseline = (ReferenceProfileId) analyzer.getBaseline();
      rows.addAll(queryRefProfile(request, baseline.getProfileId()));
    }

    return rows;
  }

  protected boolean readPgMonitor() {
    return false;
  }

  @Override
  public List<AnalyzerResultResponse> resolveAnalyzerResults(AdHocMonitorRequestV3 request) {
    val interval = Interval.parse(request.getStart() + "/" + request.getEnd());
    // If none of the analyzers actually need the feedback loop, skip the unecessary reads
    boolean enableFeedbackLoop = false;
    long start = Long.MAX_VALUE;
    long end = Long.MIN_VALUE;

    for (val a : request.getMonitorConfig().getAnalyzers()) {
      /** Feedback loops are mainly concerned over the time range of the baseline. */
      try {
        val bpredicate =
            new BaselineTimerangePredicateExplodedRowV3(
                interval.getStartMillis(),
                request.getMonitorConfig().getGranularity(),
                0,
                a.getBaseline(),
                a.getTargetSize());
        val range = bpredicate.getRange();
        start = Math.min(start, range.getLeft());
        end = Math.max(end, range.getRight());
      } catch (IllegalArgumentException e) {
        log.trace(
            "Unable to extract a baseline time range from config {}. Not all baselines have a range, for example ref profiles",
            a.getBaseline());
      }

      if (a.getConfig().toCalculation(request.getMonitorConfig(), false, a).enableFeedbackLoop()) {
        enableFeedbackLoop = true;
      }
      if (a.getConfig().getClass().isAssignableFrom(FixedThresholdsConfig.class)
          && ((FixedThresholdsConfig) a.getConfig()).getNConsecutive() != null) {
        val t =
            ZonedDateTime.ofInstant(
                Instant.ofEpochMilli(interval.getStartMillis()), ZoneOffset.UTC);
        start =
            Math.min(
                start,
                ComputeJobGranularities.subtract(
                        t,
                        request.getMonitorConfig().getGranularity(),
                        ((FixedThresholdsConfig) a.getConfig()).getNConsecutive())
                    .toInstant()
                    .toEpochMilli());
      }
    }
    if (!enableFeedbackLoop || start == Long.MAX_VALUE) {
      // Don't bother with feedback loop if none of the analyzers want one or if none of the
      // analyzer's baselines have a time range
      return Collections.emptyList();
    }

    List<String> analyzerIds = new ArrayList<>();
    for (val a : request.getMonitorConfig().getAnalyzers()) {
      analyzerIds.add(a.getId());
    }
    List<AnalyzerResultResponse> rows = new ArrayList<>();

    val req = new GetAnalyzerResultRequest();
    req.setOrgId(request.getMonitorConfig().getOrgId());
    req.setDatasetIds(Arrays.asList(request.getMonitorConfig().getDatasetId()));
    req.setAnalyzerIds(analyzerIds);
    req.setColumnNames(request.getColumnNames());
    req.setReadPgMonitor(readPgMonitor());
    req.setAdhoc(false);
    req.setIncludeFailures(true);
    req.setIncludeUnhelpful(true);
    req.setInterval(new Interval(start, end));

    if (request.getSegmentTags() != null && request.getSegmentTags().size() > 0) {
      for (val seg : request.getSegmentTags()) {
        List<SegmentTag> segment = new ArrayList<>();
        for (val t : seg) {
          segment.add(SegmentTag.builder().key(t.getKey()).value(t.getValue()).build());
        }
        req.setSegments(Arrays.asList(toSegmentText(segment)));
        rows.addAll(analysisService.getAnalyzerResults(req));
      }
    } else {
      req.setSegments(null);
      rows.addAll(analysisService.getAnalyzerResults(req));
    }

    return rows;
  }

  private List<ExplodedRow> queryRefProfile(AdHocMonitorRequestV3 request, String profileId) {
    List<ExplodedRow> rows = new ArrayList<>();
    val p = new AdhocRequestRequiresProfilePredicate();
    if (!p.test(request, profileId)) {
      // Cut down on unecessary queries
      return rows;
    }

    val req =
        ReferenceProfileRequest.builder()
            .orgId(request.getMonitorConfig().getOrgId())
            .datasetId(request.getMonitorConfig().getDatasetId())
            .columnNames(request.getColumnNames())
            .referenceProfileId(profileId)
            .build();

    if (request.getSegmentTags() != null && request.getSegmentTags().size() > 0) {
      for (val seg : request.getSegmentTags()) {
        List<SegmentTag> segment = new ArrayList<>();
        for (val t : seg) {
          segment.add(SegmentTag.builder().key(t.getKey()).value(t.getValue()).build());
        }
        req.setSegment(segment);
        rows.addAll(getReferenceExplodedRows(req));
      }
    } else {
      rows.addAll(getReferenceExplodedRows(req));
    }
    return rows;
  }

  List<ExplodedRow> getReferenceExplodedRows(ReferenceProfileRequest rqst) {
    val rawResults = profileService.getReferenceProfileSketchesRaw(rqst);

    // group by BOTH columnName and timestamp.
    val groupedResults =
        rawResults.stream()
            .collect(Collectors.groupingBy(r -> Pair.of(r.getColumnName(), r.getTimestamp())));
    String segmentText = toSegmentText(rqst.getSegment());

    List<ExplodedRow> rows = new ArrayList<>();
    for (val e : groupedResults.entrySet()) {
      val p = e.getKey();
      val eb =
          explodedRowBuilder(e.getValue())
              .orgId(rqst.getOrgId())
              .datasetId(rqst.getDatasetId())
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .columnName(p.getLeft())
              .ts(0)
              .segmentText(segmentText)
              .profileId(rqst.getReferenceProfileId());
      rows.add(eb.build());
    }
    return rows;
  }
}
