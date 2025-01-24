package ai.whylabs.dataservice.services;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.adhoc.DestinationEnum;
import ai.whylabs.dataservice.models.MonitorAndAnomalyCount;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.responses.*;
import ai.whylabs.dataservice.structures.ColumnSchema;
import ai.whylabs.dataservice.util.*;
import com.beust.jcommander.internal.Lists;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shaded.whylabs.com.apache.commons.lang3.tuple.Pair;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.io.Readable;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.PageableRepository;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.io.*;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import javax.validation.constraints.NotNull;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.hibernate.exception.GenericJDBCException;
import org.hibernate.query.internal.NativeQueryImpl;
import org.joda.time.Interval;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
public abstract class AnalysisService
    implements PageableRepository<AnalyzerResultResponse, String> {

  @PersistenceContext private EntityManager entityManager;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  public static final String COMBINED_VIEW = "analysis";
  public static final String COMBINED_VIEW_PG = "analysis_pg";
  public static final String HYPERTABLE_ANOMALIES = "analysis_anomalies";
  public static final String HYPERTABLE_NON_ANOMALIES = "analysis_non_anomalies";
  public static final String HYPERTABLE_ANOMALIES_PG = "analysis_anomalies_pg";
  public static final String HYPERTABLE_NON_ANOMALIES_PG = "analysis_non_anomalies_pg";

  public static final String ADHOC = "analysis_adhoc";

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private ObjectMapper mapper;

  private final String anomalyCountsSql;
  private final String alertsCountsSql;
  private final String alertsCountsSegmentedSql;
  private final String listMonitorsSql;

  public AnalysisService(
      @Value("${sql-files.anomaly-counts-query}") Readable anomalyCountsQuery,
      @Value("${sql-files.alerts-counts-over-time-query}") Readable alertsCountsQuery,
      @Value("${sql-files.alerts-counts-over-time-segmented-query}")
          Readable alertsCountsSegmentedQuery)
      throws IOException {
    anomalyCountsSql =
        MicronautUtil.getStringFromReadable(anomalyCountsQuery).replace("?&", "\\?\\?&");
    alertsCountsSql =
        MicronautUtil.getStringFromReadable(alertsCountsQuery).replace("?&", "\\?\\?&");
    alertsCountsSegmentedSql =
        MicronautUtil.getStringFromReadable(alertsCountsSegmentedQuery).replace("?&", "\\?\\?&");
    listMonitorsSql = IOUtils.resourceToString("/sql/list-monitor-ids.sql", StandardCharsets.UTF_8);
  }

  protected List<AnalyzerResult> getAnomalies(List<AnalyzerResult> analyzerResults) {
    return analyzerResults.stream()
        .filter(p -> p.getAnomalyCount() > 0)
        .collect(Collectors.toList());
  }

  protected List<AnalyzerResult> getNonAnomalies(List<AnalyzerResult> analyzerResults) {
    return analyzerResults.stream()
        .filter(p -> p.getAnomalyCount() == 0)
        .collect(Collectors.toList());
  }

  /**
   * @param results
   * @param destination
   * @param skipDeletes - Some workloads such as a backfill triggered by adding a new analyzer are
   *     known to be insert-only and can skip the row lock contention from the delete steps. Yes,
   *     postgres will obtain a lock even for rows that don't exist.
   */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void persistResults(
      List<AnalyzerResult> results, DestinationEnum destination, boolean skipDeletes) {
    if (results.size() < 1) {
      return;
    }

    @Cleanup Connection db = bulkDatasource.getConnection();

    if (!skipDeletes && !destination.equals(DestinationEnum.ADHOC_TABLE)) {
      String anomalyTable = HYPERTABLE_ANOMALIES;
      String nonAnomalyTable = HYPERTABLE_NON_ANOMALIES;
      if (destination.equals(DestinationEnum.ANALYSIS_HYPERTABLES_PG)) {
        anomalyTable = HYPERTABLE_ANOMALIES_PG;
        nonAnomalyTable = HYPERTABLE_NON_ANOMALIES_PG;
      }
      @Cleanup
      PreparedStatement purge1 =
          db.prepareStatement(
              "delete from whylabs."
                  + anomalyTable
                  + " where dataset_timestamp = ? and analysis_id =  ?");

      for (val a : results) {
        purge1.setTimestamp(1, new Timestamp(a.getDatasetTimestamp()));
        purge1.setString(2, a.getAnalysisId());
        purge1.addBatch();
      }
      purge1.executeBatch();

      @Cleanup
      PreparedStatement purge2 =
          db.prepareStatement(
              "delete from whylabs."
                  + nonAnomalyTable
                  + " where  dataset_timestamp = ? and analysis_id =  ?");

      for (val a : results) {
        purge2.setTimestamp(1, new Timestamp(a.getDatasetTimestamp()));
        purge2.setString(2, a.getAnalysisId());
        purge2.addBatch();
      }
      purge2.executeBatch();
    }

    List<Pair<String, List<AnalyzerResult>>> work = new ArrayList<>();
    if (destination.equals(DestinationEnum.ADHOC_TABLE)) {
      work.add(Pair.of(ADHOC, results));
    } else if (destination.equals(DestinationEnum.ANALYSIS_HYPERTABLES)) {
      work.add(Pair.of(HYPERTABLE_NON_ANOMALIES, getNonAnomalies(results)));
      work.add(Pair.of(HYPERTABLE_ANOMALIES, getAnomalies(results)));
    } else if (destination.equals(DestinationEnum.ANALYSIS_HYPERTABLES_PG)) {
      work.add(Pair.of(HYPERTABLE_NON_ANOMALIES_PG, getNonAnomalies(results)));
      work.add(Pair.of(HYPERTABLE_ANOMALIES_PG, getAnomalies(results)));
    }

    // Power of 2 encouraged via active driver bug
    // https://github.com/pgjdbc/pgjdbc/issues/2882#issuecomment-1709927463
    for (val workItem : work) {
      for (val sublist : com.google.common.collect.Lists.partition(workItem.getRight(), 512)) {
        String paramSet =
            "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "
                + "?, ?, ?, ?, ?, upper(?)::granularity_enum, lower(?)::target_level_enum, lower(?)::diff_mode_enum, upper(?)::column_list_mode_enum, lower(?)::threshold_type_enum,"
                + "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, lower(?)::frequent_string_comparison_operator_enum, ?, ?, ?, ?, ?, ?, ?)";
        String insert =
            "INSERT INTO whylabs."
                + workItem.getLeft()
                + "  (org_id, dataset_id, column_name, id, run_id, analysis_id, dataset_timestamp, creation_timestamp, seasonal_lambda_keep, "
                + "seasonal_adjusted_prediction, seasonal_replacement, drift_metric_value, diff_metric_value,"
                + "drift_threshold, diff_threshold, threshold_absolute_upper, threshold_absolute_lower,"
                + "threshold_factor, threshold_baseline_metric_value, threshold_metric_value, threshold_calculated_upper,"
                + "threshold_calculated_lower, segment_weight, anomaly_count, analyzer_id,"
                + "calculation_runtime_nano,  analyzer_version, baseline_count, baseline_batches_with_profile_count,"
                + "target_count, target_batches_with_profile_count , expected_baseline_count,"
                + "expected_baseline_suppression_threshold,  analyzer_config_version, entity_schema_version,"
                + "weight_config_version,  column_list_added,  column_list_removed, threshold_min_batch_size, monitor_config_version, "
                + "granularity, target_level, diff_mode, column_list_mode, threshold_type,"
                + "seasonal_should_replace,  user_initiated_backfill, is_rollup,  user_marked_unhelpful,"
                + "segment, algorithm,  analyzer_type,  metric, algorithm_mode, "
                + "monitor_ids, column_list_added_sample, column_list_removed_sample, frequent_string_comparison_sample,"
                + "failure_type, failure_explanation, comparison_expected, comparison_observed, analyzer_result_type, "
                + "image_path, reference_profile_id, frequent_string_comparison_operator, trace_ids, analyzer_tags,"
                + "disable_target_rollup, child_analyzer_ids, child_analysis_ids, parent, frequent_string_sample_count ) "
                + " VALUES ";

        List<String> multivalueParams = new ArrayList<>();
        for (int x = 0; x < sublist.size(); x++) {
          multivalueParams.add(paramSet);
        }

        String sql = insert + org.apache.commons.lang3.StringUtils.join(multivalueParams, ",");

        // Active bug encourages multivalued SQL statements with a steady param count
        // https://foojay.io/today/a-dissection-of-java-jdbc-to-postgresql-connections-part-2-batching/
        @Cleanup PreparedStatement preparedStatement = db.prepareStatement(sql);
        for (int x = 0; x < sublist.size(); x++) {
          val a = sublist.get(x);
          // Magic number here is the number of params we set on the prepared statement
          int offset = 73 * x;

          preparedStatement.setString(1 + offset, a.getOrgId());
          preparedStatement.setString(2 + offset, a.getDatasetId());
          preparedStatement.setString(3 + offset, a.getColumn());
          preparedStatement.setObject(4 + offset, UUID.fromString(a.getId()));
          preparedStatement.setObject(5 + offset, UUID.fromString(a.getRunId()));
          preparedStatement.setObject(6 + offset, UUID.fromString(a.getAnalysisId()));
          preparedStatement.setTimestamp(7 + offset, new Timestamp(a.getDatasetTimestamp()));
          preparedStatement.setTimestamp(8 + offset, new Timestamp(a.getCreationTimestamp()));
          preparedStatement.setObject(
              9 + offset, a.getSeasonal_lambdaKeep(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(
              10 + offset, a.getSeasonal_adjusted_prediction(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(
              11 + offset, a.getSeasonal_replacement(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(12 + offset, a.getDrift_metricValue(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(13 + offset, a.getDiff_metricValue(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(14 + offset, a.getDrift_threshold(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(15 + offset, a.getDiff_threshold(), java.sql.Types.DOUBLE);
          // preparedStatement.setObject(16, a.getThreshold_absoluteUpper(), java.sql.Types.DOUBLE);
          if (a.getThreshold_absoluteUpper() != null
              && !a.getThreshold_absoluteUpper().isInfinite()) {
            preparedStatement.setObject(
                16 + offset, a.getThreshold_absoluteUpper(), java.sql.Types.DOUBLE);
          } else {
            preparedStatement.setObject(16 + offset, null, java.sql.Types.DOUBLE);
          }

          if (a.getThreshold_absoluteLower() != null
              && !a.getThreshold_absoluteLower().isInfinite()) {
            preparedStatement.setObject(
                17 + offset, a.getThreshold_absoluteLower(), java.sql.Types.DOUBLE);
          } else {
            preparedStatement.setObject(17 + offset, null, java.sql.Types.DOUBLE);
          }

          // preparedStatement.setObject(17, a.getThreshold_absoluteLower(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(18 + offset, a.getThreshold_factor(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(
              19 + offset, a.getThreshold_baselineMetricValue(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(
              20 + offset, a.getThreshold_metricValue(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(
              21 + offset, a.getThreshold_calculatedUpper(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(
              22 + offset, a.getThreshold_calculatedLower(), java.sql.Types.DOUBLE);
          preparedStatement.setObject(23 + offset, a.getSegmentWeight(), java.sql.Types.DOUBLE);
          preparedStatement.setLong(24 + offset, a.getAnomalyCount());
          preparedStatement.setString(25 + offset, a.getAnalyzerId());
          preparedStatement.setObject(26 + offset, a.getCalculationRuntimeNano(), Types.NUMERIC);
          preparedStatement.setObject(27 + offset, a.getAnalyzerVersion(), java.sql.Types.NUMERIC);
          preparedStatement.setObject(28 + offset, a.getBaselineCount(), java.sql.Types.NUMERIC);
          preparedStatement.setObject(
              29 + offset, a.getBaselineBatchesWithProfileCount(), java.sql.Types.NUMERIC);
          preparedStatement.setObject(30 + offset, a.getTargetCount(), Types.NUMERIC);
          preparedStatement.setObject(
              31 + offset, a.getTargetBatchesWithProfileCount(), Types.NUMERIC);
          preparedStatement.setObject(32 + offset, a.getExpectedBaselineCount(), Types.NUMERIC);
          preparedStatement.setObject(
              33 + offset, a.getExpectedBaselineSuppressionThreshold(), Types.NUMERIC);
          preparedStatement.setObject(34 + offset, a.getAnalyzerConfigVersion(), Types.NUMERIC);
          preparedStatement.setObject(35 + offset, a.getEntitySchemaVersion(), Types.NUMERIC);
          preparedStatement.setObject(36 + offset, a.getWeightConfigVersion(), Types.NUMERIC);
          preparedStatement.setObject(37 + offset, a.getColumnList_added(), Types.NUMERIC);
          preparedStatement.setObject(38 + offset, a.getColumnList_removed(), Types.NUMERIC);
          preparedStatement.setObject(39 + offset, a.getThreshold_minBatchSize(), Types.NUMERIC);
          preparedStatement.setObject(40 + offset, a.getMonitorConfigVersion(), Types.NUMERIC);
          preparedStatement.setObject(41 + offset, a.getGranularity(), Types.VARCHAR);
          preparedStatement.setObject(
              42 + offset, a.getTargetLevel(), Types.VARCHAR, Types.VARCHAR);
          preparedStatement.setObject(43 + offset, a.getDiff_mode(), Types.VARCHAR);
          preparedStatement.setObject(44 + offset, a.getColumnList_mode(), Types.VARCHAR);
          preparedStatement.setObject(45 + offset, a.getThreshold_type(), Types.VARCHAR);
          preparedStatement.setObject(46 + offset, a.getSeasonal_shouldReplace(), Types.BOOLEAN);
          preparedStatement.setObject(47 + offset, a.getUserInitiatedBackfill(), Types.BOOLEAN);
          preparedStatement.setObject(48 + offset, a.getIsRollup(), Types.BOOLEAN);
          preparedStatement.setObject(49 + offset, a.getUserMarkedUnhelpful(), Types.BOOLEAN);
          preparedStatement.setObject(50 + offset, a.getSegment(), Types.VARCHAR);
          preparedStatement.setObject(51 + offset, a.getAlgorithm(), Types.VARCHAR);
          preparedStatement.setObject(52 + offset, a.getAnalyzerType(), Types.VARCHAR);
          preparedStatement.setObject(53 + offset, a.getMetric(), Types.VARCHAR);
          preparedStatement.setObject(54 + offset, a.getAlgorithmMode(), Types.VARCHAR);
          preparedStatement.setArray(55 + offset, NativeQueryHelper.toArray(db, a.getMonitorIds()));
          preparedStatement.setArray(
              56 + offset, NativeQueryHelper.toArray(db, a.getColumnList_addedSample()));
          preparedStatement.setArray(
              57 + offset, NativeQueryHelper.toArray(db, a.getColumnList_removedSample()));
          preparedStatement.setArray(
              58 + offset, NativeQueryHelper.toArray(db, a.getFrequentStringComparison_sample()));
          preparedStatement.setObject(59 + offset, a.getFailureType(), Types.VARCHAR);
          preparedStatement.setObject(60 + offset, a.getFailureExplanation(), Types.VARCHAR);
          preparedStatement.setObject(61 + offset, a.getComparison_expected(), Types.VARCHAR);
          preparedStatement.setObject(62 + offset, a.getComparison_observed(), Types.VARCHAR);
          preparedStatement.setObject(63 + offset, a.getAnalyzerResultType(), Types.VARCHAR);
          preparedStatement.setObject(64 + offset, a.getImagePath(), Types.VARCHAR);
          preparedStatement.setObject(65 + offset, a.getReferenceProfileId(), Types.VARCHAR);
          preparedStatement.setObject(
              66 + offset, a.getFrequentStringComparison_operator(), Types.VARCHAR);
          preparedStatement.setArray(67 + offset, NativeQueryHelper.toArray(db, a.getTraceIds()));
          preparedStatement.setArray(
              68 + offset, NativeQueryHelper.toArray(db, a.getAnalyzerTags()));
          preparedStatement.setObject(69 + offset, a.getDisableTargetRollup(), Types.BOOLEAN);
          preparedStatement.setArray(
              70 + offset, NativeQueryHelper.toArray(db, a.getChildAnalyzerIds()));
          preparedStatement.setArray(
              71 + offset, NativeQueryHelper.toArray(db, a.getChildAnalysisIds()));
          preparedStatement.setObject(72 + offset, a.getParent(), Types.BOOLEAN);
          preparedStatement.setString(
              73 + offset, mapper.writeValueAsString(a.getFreqStringCount()));
        }
        preparedStatement.execute();
      }
    }
  }

  @Async("indexer")
  public void promoteAdhocResultsAsync(
      List<ColumnSchema> schema,
      String runId,
      String columnName,
      Interval interval,
      CountDownLatch latch) {
    promoteAdhocResults(schema, runId, columnName, interval, latch);
  }

  /**
   * Utility method that promotes data generated from an adhoc run into the main tables. Let's call
   * this one experimental for internal use. May or may not expand on it, but it sure makes writing
   * unit tests easier.
   */
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void promoteAdhocResults(
      List<ColumnSchema> schema,
      String runId,
      String columnName,
      Interval interval,
      CountDownLatch latch) {
    log.info("Promoting adhoc=>hypertables {} {}", runId, columnName);
    String purgeAnomaliesTable =
        "delete from whylabs."
            + HYPERTABLE_ANOMALIES
            + " using whylabs.analysis_adhoc where whylabs."
            + HYPERTABLE_ANOMALIES
            + ".analysis_id = whylabs."
            + ADHOC
            + ".analysis_id and whylabs."
            + ADHOC
            + ".run_id = ?";

    String purgeNonAnomaliesTable =
        "delete from whylabs."
            + HYPERTABLE_NON_ANOMALIES
            + " using whylabs.analysis_adhoc where whylabs."
            + HYPERTABLE_NON_ANOMALIES
            + ".analysis_id = whylabs."
            + ADHOC
            + ".analysis_id and whylabs."
            + ADHOC
            + ".run_id = ?";

    List<String> columnns = Lists.newArrayList();

    for (val column : schema) {
      if (!column.getColumn_name().equals("analyser_result_id")) {
        columnns.add(column.getColumn_name());
      }
    }
    String colListJoined = StringUtils.join(columnns, ", ");

    String anomaliesTable =
        "insert into whylabs."
            + HYPERTABLE_ANOMALIES
            + "(%s) select %s from whylabs."
            + ADHOC
            + " where anomaly_count > 0 and run_id = ?";
    String nonAnomaliesTable =
        "insert into whylabs."
            + HYPERTABLE_NON_ANOMALIES
            + "(%s) select %s from whylabs."
            + ADHOC
            + " where anomaly_count = 0 and run_id = ?";

    if (columnName != null) {
      purgeAnomaliesTable = purgeAnomaliesTable + " and whylabs." + ADHOC + ".column_name = ?";
      purgeNonAnomaliesTable =
          purgeNonAnomaliesTable + " and whylabs." + ADHOC + ".column_name = ?";
      nonAnomaliesTable = nonAnomaliesTable + " and column_name = ?";
      anomaliesTable = anomaliesTable + " and column_name = ?";
    }
    if (interval != null) {
      val start = interval.getStart().toString();
      val end = interval.getEnd().toString();
      purgeAnomaliesTable =
          purgeAnomaliesTable
              + " and analysis_anomalies.dataset_timestamp >= '"
              + start
              + "'::timestamptz and  analysis_anomalies.dataset_timestamp < '"
              + end
              + "'::timestamptz and analysis_adhoc.dataset_timestamp >= '"
              + start
              + "'::timestamptz and  analysis_adhoc.dataset_timestamp < '"
              + end
              + "'::timestamptz";
      purgeNonAnomaliesTable =
          purgeNonAnomaliesTable
              + " and analysis_non_anomalies.dataset_timestamp >= '"
              + start
              + "'::timestamptz and  analysis_non_anomalies.dataset_timestamp < '"
              + end
              + "'::timestamptz and analysis_adhoc.dataset_timestamp >= '"
              + start
              + "'::timestamptz and  analysis_adhoc.dataset_timestamp < '"
              + end
              + "'::timestamptz";
      nonAnomaliesTable =
          nonAnomaliesTable
              + " and dataset_timestamp >= '"
              + start
              + "'::timestamptz and  dataset_timestamp < '"
              + end
              + "'::timestamptz ";
      anomaliesTable =
          anomaliesTable
              + " and dataset_timestamp >= '"
              + start
              + "'::timestamptz and  dataset_timestamp < '"
              + end
              + "'::timestamptz ";
    }

    String bulkLoadAnomaliesQuery = String.format(anomaliesTable, colListJoined, colListJoined);
    String bulkLoadNonAnomaliesQuery =
        String.format(nonAnomaliesTable, colListJoined, colListJoined);

    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement purge1 = db.prepareStatement(purgeAnomaliesTable);
    purge1.setString(1, runId);
    if (columnName != null) {
      purge1.setString(2, columnName);
    }
    purge1.executeUpdate();

    @Cleanup PreparedStatement purge2 = db.prepareStatement(purgeNonAnomaliesTable);
    purge2.setString(1, runId);
    if (columnName != null) {
      purge2.setString(2, columnName);
    }
    purge2.executeUpdate();

    @Cleanup PreparedStatement preparedStatement = db.prepareStatement(bulkLoadAnomaliesQuery);
    preparedStatement.setString(1, runId);
    if (columnName != null) {
      preparedStatement.setString(2, columnName);
    }

    preparedStatement.executeUpdate();
    @Cleanup PreparedStatement preparedStatement2 = db.prepareStatement(bulkLoadNonAnomaliesQuery);
    preparedStatement2.setString(1, runId);
    if (columnName != null) {
      preparedStatement2.setString(2, columnName);
    }

    preparedStatement2.executeUpdate();
    latch.countDown();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public Optional<AnalyzerResultResponse> findById(@NotNull String id) {
    String q = "select * from whylabs." + COMBINED_VIEW + " where id = :id";
    val query =
        (NativeQueryImpl) roEntityManager.createNativeQuery(q, AnalyzerResultResponse.class);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("id", id);
    val l = query.getResultList();
    if (l.size() < 1) {
      return Optional.empty();
    }
    return Optional.of((AnalyzerResultResponse) l.get(0));
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public Optional<AnalyzerResultResponse> findByAnalysisId(@NotNull String analysisId) {
    String q = "select * from whylabs." + COMBINED_VIEW + " where analysis_id = :analysisId";
    val query =
        (NativeQueryImpl) roEntityManager.createNativeQuery(q, AnalyzerResultResponse.class);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("analysisId", UUID.fromString(analysisId));
    val l = query.getResultList();
    if (l.size() < 1) {
      return Optional.empty();
    }
    return Optional.of((AnalyzerResultResponse) l.get(0));
  }

  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Query(
      value =
          "select * from whylabs.analysis_anomalies d where d.org_id = :orgId and d.dataset_id = :datasetId and d.anomaly_count = 1 AND (d.user_marked_unhelpful != true or d.user_marked_unhelpful is null)  order by creation_timestamp desc limit "
              + ValidateRequest.MAX_PAGE_SIZE,
      nativeQuery = true)
  public abstract List<AnalyzerResultResponse> getRecentAnomalies(String orgId, String datasetId);

  @SneakyThrows
  @Transactional
  @Executable
  public void markUnhelpful(String analysisId, boolean status) {
    val query =
        (NativeQueryImpl)
            entityManager.createNativeQuery(
                "update whylabs.analysis_anomalies set user_marked_unhelpful = :status where analysis_id = :analysis_id");
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("status", status);
    query.setParameter("analysis_id", analysisId);
    query.executeUpdate();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public List<AnalyzerResultResponse> getAnalyzerResults(GetAnalyzerResultRequest request) {
    String table = COMBINED_VIEW;
    if (request.isReadPgMonitor()) {
      table = COMBINED_VIEW_PG;
    }

    if (request.getOnlyAnomalies()) {
      table = HYPERTABLE_ANOMALIES;
      if (request.isReadPgMonitor()) {
        table = HYPERTABLE_ANOMALIES_PG;
      }
    }
    if (request.getAdhoc()) {
      table = ADHOC;
    }

    String q =
        "select *\n"
            + "from whylabs."
            + table
            + " d\n"
            + "where d.org_id = :orgId\n"
            + "  and d.dataset_id in (:datasetIds)\n"
            + "  and (:segmentCount = 0 or d.segment in :segments)\n"
            + "  and (:columnNameCount = 0 or d.column_name in :columnNames)\n"
            + "  and (:analyzerTypeCount = 0 or d.analyzer_type in :analyzerTypes)\n"
            + "  and d.dataset_timestamp >= :start\n"
            + "  and d.dataset_timestamp < :end\n"
            + "  and (:metricCount = 0 or d.metric in :metrics)\n"
            + "  and (:analysisIdCount = 0 or d.analysis_id in :analysisIds)\n"
            + "  and (:runIdCount = 0 or d.run_id in :runIds)\n"
            + "  and (:analyzerIdCount = 0 or d.analyzer_id in :analyzerIds)\n"
            + "  and (:granularityInclusion = 'BOTH' or (:granularityInclusion = 'INDIVIDUAL_ONLY' and coalesce(d.disable_target_rollup, false)) or (:granularityInclusion = 'ROLLUP_ONLY' and not coalesce(d.disable_target_rollup, false)))\n"
            + "  AND (:parentChildScope = 'BOTH' or (:parentChildScope = 'PARENTS_ONLY' and coalesce(parent, false)) or (:parentChildScope = 'CHILDREN_ONLY' and not coalesce(parent, false)))"
            + "  and (:monitorIdCount = 0 or d.monitor_ids && :monitorIds)\n";

    if (!request.getIncludeFailures()) {
      q = q + " and d.failure_type is null ";
    }
    if (!request.getIncludeUnhelpful()) {
      q = q + " and d.user_marked_unhelpful is not true ";
    }
    if (request.getOnlyAnomalies()) {
      q = q + " and d.anomaly_count > 0 ";
    }
    q =
        q
            + " order by d.dataset_timestamp "
            + request.getOrder().name()
            + " limit :limit offset :offset";

    val interval = request.getInterval();
    val query =
        (NativeQueryImpl) roEntityManager.createNativeQuery(q, AnalyzerResultResponse.class);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetIds", request.getDatasetIds());

    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getSegments(), "segments", "segmentCount");
    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));

    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getColumnNames(), "columnNames", "columnNameCount");
    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getAnalyzerTypes(), "analyzerTypes", "analyzerTypeCount");
    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getMetrics(), "metrics", "metricCount");

    query.setParameter("limit", request.getLimit());
    query.setParameter("offset", request.getOffset());

    NativeQueryHelper.populateMultivaluedOptionalStringListFilter(
        query, request.getMonitorIds(), "monitorIds", "monitorIdCount");
    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getAnalyzerIds(), "analyzerIds", "analyzerIdCount");
    val analysisIds = UUIDConversion.toUUID(request.getAnalysisIds());
    query.setParameter("analysisIds", analysisIds);
    query.setParameter("analysisIdCount", analysisIds.size());

    val runIds = UUIDConversion.toUUID(request.getRunIds());
    query.setParameter("runIds", runIds);
    query.setParameter("runIdCount", runIds.size());
    query.setParameter("granularityInclusion", request.getGranularityInclusion().name());
    query.setParameter("parentChildScope", request.getParentChildScope().name());

    return query.getResultList();
  }

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<GetLatestAnomalyResponse> getLatestAnomalyQuery(GetLatestAnomalyQuery request) {
    String table = HYPERTABLE_ANOMALIES;
    if (request.isReadPgMonitor()) {
      table = HYPERTABLE_ANOMALIES_PG;
    }

    String q =
        "select max(d.dataset_timestamp) as latest, d.dataset_id as datasetId \n"
            + "from whylabs."
            + table
            + " d "
            + "where d.org_id = :orgId "
            + "  and d.dataset_id in (:datasetIds) "
            + "  and d.dataset_timestamp >= :start"
            + "  and d.dataset_timestamp < :end"
            + "  and d.segment in :segments"
            + "  and (:monitorIdCount = 0 or d.monitor_ids && :monitorIds)"
            + "  and (:analyzerIdCount = 0 or d.analyzer_id in :analyzerIds)"
            + "  and (:columnNameCount = 0 or d.column_name in :columnNames)"
            + "  and d.anomaly_count = 1 "
            + " AND (d.user_marked_unhelpful != true or d.user_marked_unhelpful is null) "
            + "  group by d.dataset_id ";

    val interval = request.getInterval();
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetIds", request.getDatasetIds());
    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getColumnNames(), "columnNames", "columnNameCount");
    NativeQueryHelper.populateMultivaluedOptionalStringListFilter(
        query, request.getMonitorIds(), "monitorIds", "monitorIdCount");
    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getAnalyzerIds(), "analyzerIds", "analyzerIdCount");
    NativeQueryHelper.populateRequiredStringListFilter(query, request.getSegments(), "segments");
    val r = query.getResultList();
    List<GetLatestAnomalyResponse> responses = new ArrayList<>();
    for (val row : r) {
      val g =
          GetLatestAnomalyResponse.builder()
              .latest(((Timestamp) ((Object[]) row)[0]).toInstant().toEpochMilli())
              .datasetId((String) ((Object[]) row)[1])
              .build();
      responses.add(g);
    }

    return responses;
  }

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<GetAnomalyCountsResult> getAnomalyCounts(GetAnomalyCountsRequest request) {
    val interval = request.getInterval();
    String q = anomalyCountsSql;
    if (request.getAdhoc()) {
      q = q.replace(COMBINED_VIEW, ADHOC);
    } else if (request.isReadPgMonitor()) {
      q = q.replace(COMBINED_VIEW, COMBINED_VIEW_PG);
    }
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("granularity", request.getGranularity().asSQL());
    query.setParameter("datasetIds", request.getDatasetIds(), StringArrayType.INSTANCE);
    query.setParameter(
        "startTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("endTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    query.setParameter("segments", request.getSegments(), StringArrayType.INSTANCE);
    query.setParameter("excludeSegments", request.getExcludeSegments(), StringArrayType.INSTANCE);
    query.setParameter("monitorIds", request.getMonitorIds(), StringArrayType.INSTANCE);
    query.setParameter("analyzerIds", request.getAnalyzerIds(), StringArrayType.INSTANCE);
    query.setParameter("runIds", request.getRunIds(), StringArrayType.INSTANCE);
    query.setParameter("columnNames", request.getColumnNames(), StringArrayType.INSTANCE);
    query.setParameter("includeUnhelpful", request.getIncludeUnhelpful());
    query.setParameter("granularityInclusion", request.getGranularityInclusion().name());
    query.setParameter("parentChildScope", request.getParentChildScope().name());

    val r = query.getResultList();
    List<GetAnomalyCountsResult> responses = new ArrayList<>();
    for (val row : r) {
      val g =
          GetAnomalyCountsResult.builder()
              .overall(((BigInteger) ((Object[]) row)[0]).longValue())
              .anomalies(((BigInteger) ((Object[]) row)[1]).longValue())
              .failures(((BigInteger) ((Object[]) row)[2]).longValue())
              .datasetId((String) ((Object[]) row)[3])
              .ts(((BigDecimal) ((Object[]) row)[4]).longValue())
              .build();
      responses.add(g);
    }

    return responses;
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<GetSegmentAnomalyCountsResponse> getSegmentAnomalyCounts(
      GetSegmentAnomalyCountsRequest request) {
    String q =
        "SELECT segment, count(segment) AS anomalyCount FROM whylabs."
            + HYPERTABLE_ANOMALIES
            + "\n"
            + "WHERE (segment <> '' OR segment IS null)\n"
            + "AND org_id = :orgId\n"
            + "AND dataset_id = :datasetId\n"
            + "AND dataset_timestamp >= :start\n"
            + "AND dataset_timestamp < :end\n"
            + "  and (:columnNameCount = 0 or column_name in :columnNames)\n"
            + "  and (:granularityInclusion = 'BOTH' or (:granularityInclusion = 'INDIVIDUAL_ONLY' and coalesce(disable_target_rollup, false)) or (:granularityInclusion = 'ROLLUP_ONLY' and not coalesce(disable_target_rollup, false)))\n"
            + "  AND (:parentChildScope = 'BOTH' or (:parentChildScope = 'PARENTS_ONLY' and coalesce(parent, false)) or (:parentChildScope = 'CHILDREN_ONLY' and not coalesce(parent, false)))"
            + "GROUP BY segment\n"
            + "ORDER BY anomalyCount DESC\n"
            + "LIMIT 100000";
    if (request.isReadPgMonitor()) {
      q = q.replace(HYPERTABLE_ANOMALIES, HYPERTABLE_ANOMALIES_PG);
    }

    val interval = request.getInterval();
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetId", request.getDatasetId());
    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getColumnNames(), "columnNames", "columnNameCount");
    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    query.setParameter("granularityInclusion", request.getGranularityInclusion().name());
    query.setParameter("parentChildScope", request.getParentChildScope().name());

    List<GetSegmentAnomalyCountsResponse> segmentsAndCounts = new ArrayList<>();
    for (val row : query.getResultList()) {
      String segment = (String) ((Object[]) row)[0];
      Integer count = ((BigInteger) ((Object[]) row)[1]).intValue();
      segmentsAndCounts.add(new GetSegmentAnomalyCountsResponse(segment, count));
    }

    return segmentsAndCounts;
  }

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<MonitorAndAnomalyCount> listMonitors(ListMonitorsRequest request) {
    val query =
        (NativeQueryImpl<MonitorAndAnomalyCount>)
            roEntityManager.createNativeQuery(listMonitorsSql, MonitorAndAnomalyCount.class);

    request.doUpdate(query);
    PostgresUtil.setStandardTimeout(query);

    return query.getResultList();
  }

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<GetAlertsOverTimeResponse> getAlertCountsOverTime(GetAlertsOverTimeRequest request) {
    String q = alertsCountsSql + "\n" + request.getOrder().name();
    if (request.getAdhoc()) {
      q = q.replace(HYPERTABLE_ANOMALIES, ADHOC);
    } else if (request.isReadPgMonitor()) {
      q = q.replace(HYPERTABLE_ANOMALIES, HYPERTABLE_ANOMALIES_PG);
    }
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);

    val interval = request.getInterval();
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("granularity", request.getGranularity().asSQL());
    query.setParameter("datasetIds", request.getDatasetIds(), StringArrayType.INSTANCE);
    query.setParameter(
        "startTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("endTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    query.setParameter("segments", request.getSegments(), StringArrayType.INSTANCE);
    query.setParameter("monitorIds", request.getMonitorIds(), StringArrayType.INSTANCE);
    query.setParameter("analyzerIds", request.getAnalyzerIds(), StringArrayType.INSTANCE);
    query.setParameter("includeUnhelpful", request.getIncludeUnhelpful());
    val runIds = UUIDConversion.toUUID(request.getRunIds());
    query.setParameter("runIds", runIds, StringArrayType.INSTANCE);
    query.setParameter("columnNames", request.getColumnNames(), StringArrayType.INSTANCE);
    query.setParameter("granularityInclusion", request.getGranularityInclusion().name());
    query.setParameter("parentChildScope", request.getParentChildScope().name());

    val r = query.getResultList();
    List<GetAlertsOverTimeResponse> responses = new ArrayList<>();
    for (val row : r) {
      val g =
          GetAlertsOverTimeResponse.builder()
              .anomalies(((BigInteger) ((Object[]) row)[0]).longValue())
              .columnName((String) ((Object[]) row)[1])
              .metric((String) ((Object[]) row)[2])
              .datasetId((String) ((Object[]) row)[3])
              .ts(((BigDecimal) ((Object[]) row)[4]).longValue())
              .build();
      responses.add(g);
    }

    return responses;
  }

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public SegmentedGetAlertsOverTimeResponse getAlertCountsOverTimeSegmented(
      GetAlertCountsOverTimeSegmented request) {
    String q = alertsCountsSegmentedSql + "\n" + request.getOrder().name();
    if (request.getAdhoc()) {
      q = q.replace(HYPERTABLE_ANOMALIES, ADHOC);
    } else if (request.isReadPgMonitor()) {
      q = q.replace(HYPERTABLE_ANOMALIES, HYPERTABLE_ANOMALIES_PG);
    }
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    val interval = request.getInterval();
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("granularity", request.getGranularity().asSQL());
    query.setParameter("datasetIds", request.getDatasetIds(), StringArrayType.INSTANCE);
    query.setParameter(
        "startTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("endTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    query.setParameter("segments", request.getSegments(), StringArrayType.INSTANCE);
    query.setParameter("monitorIds", request.getMonitorIds(), StringArrayType.INSTANCE);
    query.setParameter("analyzerIds", request.getAnalyzerIds(), StringArrayType.INSTANCE);
    query.setParameter("includeUnhelpful", request.getIncludeUnhelpful());
    val runIds = UUIDConversion.toUUID(request.getRunIds());
    query.setParameter("runIds", runIds, StringArrayType.INSTANCE);
    query.setParameter("granularityInclusion", request.getGranularityInclusion().name());
    query.setParameter("parentChildScope", request.getParentChildScope().name());

    val r = query.getResultList();
    Map<String, List<GetAlertsOverTimeResponse>> results = new HashMap<>();

    for (val row : r) {
      String segment = (String) ((Object[]) row)[4];
      if (!results.containsKey(segment)) {
        results.put(segment, new ArrayList<>());
      }
      results
          .get(segment)
          .add(
              GetAlertsOverTimeResponse.builder()
                  .anomalies(((BigInteger) ((Object[]) row)[0]).longValue())
                  .datasetId((String) ((Object[]) row)[1])
                  .metric((String) ((Object[]) row)[2])
                  .ts(((BigDecimal) ((Object[]) row)[3]).longValue())
                  .build());
    }

    return SegmentedGetAlertsOverTimeResponse.builder().results(results).build();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public GetAdHocRunNumEventsResponse getAdHocRunNumEvents(GetAdHocRunNumEventsRequest request) {
    String q =
        "select count(1) ad_hoc_event_count\n"
            // TODO: Separate table for adhoc?
            + "from whylabs."
            + ADHOC
            + "\n"
            + "where org_id=:orgId \n"
            + "    and run_id = :runId"
            + "    and dataset_timestamp >= :start\n"
            + "    and dataset_timestamp < :end\n";

    val interval = request.getInterval();
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("runId", UUIDConversion.toUUID(request.getRunId()));
    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));

    val r = (BigInteger) query.getSingleResult();

    return new GetAdHocRunNumEventsResponse(r.longValue());
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public DiagnosticAnalyzersResponse getAnalyzersDiagnostics(DiagnosticAnalyzersRequest request) {
    // get stats by analyzer with likely noisy analyzers first (most batches having anomalies for a
    // column;
    // and within that having lots of anomalies for each feature)
    String noisy =
        "select analyzer_id, metric, analyzer_type, count(distinct column_name) as column_count, "
            + "count(distinct segment) as segment_count, sum(total_anomalies) as anomaly_count, "
            + "max(total_anomalies) as max_anomaly_per_column, "
            + "min(total_anomalies) as min_anomaly_per_column, "
            + "sum(total_anomalies)/count(distinct (column_name, segment)) as avg_anomaly_per_column "
            + "from (select analyzer_id, analyzer_type, metric, column_name, segment, sum(anomaly_count) as total_anomalies "
            + "from whylabs.analysis_anomalies "
            + "where org_id=:orgId and dataset_id=:datasetId "
            + "and dataset_timestamp >= :start "
            + "and dataset_timestamp < :end "
            + "group by analyzer_id, metric, analyzer_type, segment, column_name) as analyses "
            + "group by analyzer_id, metric, analyzer_type "
            + "order by max_anomaly_per_column desc, avg_anomaly_per_column desc limit 500";

    val noisyQuery =
        (NativeQueryImpl<DiagnosticAnalyzerAnomalyRecord>)
            roEntityManager.createNativeQuery(noisy, DiagnosticAnalyzerAnomalyRecord.class);
    PostgresUtil.setStandardTimeout(noisyQuery);
    noisyQuery.setParameter("orgId", request.getOrgId());
    noisyQuery.setParameter("datasetId", request.getDatasetId());
    val interval = Interval.parse(request.getInterval());
    noisyQuery.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    noisyQuery.setParameter(
        "end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));

    String failed =
        "select analyzer_id, metric, analyzer_type, count(distinct column_name) as column_count, "
            + "count(distinct segment) as segment_count, sum(total_failed) as failed_count, "
            + "max(total_failed) as max_failed_per_column, "
            + "min(total_failed) as min_failed_per_column, "
            + "sum(total_failed)/count(distinct (column_name, segment)) as avg_failed_per_column "
            + "from (select analyzer_id, analyzer_type, metric, column_name, segment, count(failure_type) as total_failed "
            + "from whylabs.analysis_non_anomalies "
            + "where org_id=:orgId and dataset_id=:datasetId "
            + "and dataset_timestamp >= :start "
            + "and dataset_timestamp < :end "
            + "and failure_type <> '' "
            + "group by analyzer_id, metric, analyzer_type, segment, column_name) as analyses "
            + "group by analyzer_id, metric, analyzer_type "
            + "order by max_failed_per_column desc, avg_failed_per_column desc limit 500";

    val failedQuery =
        (NativeQueryImpl<DiagnosticAnalyzerFailedRecord>)
            roEntityManager.createNativeQuery(failed, DiagnosticAnalyzerFailedRecord.class);
    PostgresUtil.setStandardTimeout(failedQuery);
    failedQuery.setParameter("orgId", request.getOrgId());
    failedQuery.setParameter("datasetId", request.getDatasetId());
    failedQuery.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    failedQuery.setParameter(
        "end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));

    val r = new DiagnosticAnalyzersResponse();
    r.setNoisyAnalyzers(noisyQuery.getResultList());
    r.setFailedAnalyzers(failedQuery.getResultList());
    return r;
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public DiagnosticAnalyzerSegmentsResponse getAnalyzerSegments(
      DiagnosticAnalyzerSegmentsRequest request) {
    // get failures and anomalies by segment for a specific analyzer
    String noisy =
        "select segment, sum(anomaly_count) as total_anomalies, count(distinct dataset_timestamp) as batch_count "
            + "from whylabs.analysis "
            + "where org_id=:orgId and dataset_id=:datasetId and analyzer_id=:analyzerId "
            + "and dataset_timestamp >= :start "
            + "and dataset_timestamp < :end "
            + "group by segment "
            + "order by total_anomalies desc limit 500";

    val noisyQuery =
        (NativeQueryImpl<DiagnosticAnalyzerSegmentAnomalyRecord>)
            roEntityManager.createNativeQuery(noisy, DiagnosticAnalyzerSegmentAnomalyRecord.class);
    PostgresUtil.setStandardTimeout(noisyQuery);
    noisyQuery.setParameter("orgId", request.getOrgId());
    noisyQuery.setParameter("datasetId", request.getDatasetId());
    noisyQuery.setParameter("analyzerId", request.getAnalyzerId());
    val interval = Interval.parse(request.getInterval());
    noisyQuery.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    noisyQuery.setParameter(
        "end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));

    String failed =
        "select segment, count(failure_type) as total_failed "
            + "from whylabs.analysis_non_anomalies "
            + "where org_id=:orgId and dataset_id=:datasetId and analyzer_id=:analyzerId "
            + "and dataset_timestamp >= :start "
            + "and dataset_timestamp < :end "
            + "and failure_type <> '' "
            + "group by segment "
            + "order by total_failed desc limit 500";
    val failedQuery =
        (NativeQueryImpl<DiagnosticAnalyzerSegmentFailedRecord>)
            roEntityManager.createNativeQuery(failed, DiagnosticAnalyzerSegmentFailedRecord.class);
    PostgresUtil.setStandardTimeout(failedQuery);
    failedQuery.setParameter("orgId", request.getOrgId());
    failedQuery.setParameter("datasetId", request.getDatasetId());
    failedQuery.setParameter("analyzerId", request.getAnalyzerId());
    failedQuery.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    failedQuery.setParameter(
        "end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));

    val r = new DiagnosticAnalyzerSegmentsResponse();
    r.setNoisySegments(noisyQuery.getResultList());
    r.setFailedSegments(failedQuery.getResultList());
    return r;
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public DiagnosticAnalyzerSegmentColumnsResponse getAnalyzerSegmentColumns(
      DiagnosticAnalyzerSegmentColumnsRequest request) {
    // get failures by column for a specific analyzer and segment
    String noisy =
        "select column_name as column, sum(anomaly_count) as total_anomalies, count(distinct dataset_timestamp) as batch_count "
            + "from whylabs.analysis "
            + "where org_id=:orgId and dataset_id=:datasetId and analyzer_id=:analyzerId "
            + "and dataset_timestamp >= :start "
            + "and dataset_timestamp < :end "
            + "and segment=:segment "
            + "group by column_name "
            + "order by total_anomalies desc limit 10000";

    val noisyQuery =
        (NativeQueryImpl<DiagnosticAnalyzerSegmentColumnRecord>)
            roEntityManager.createNativeQuery(noisy, DiagnosticAnalyzerSegmentColumnRecord.class);
    PostgresUtil.setStandardTimeout(noisyQuery);
    noisyQuery.setParameter("orgId", request.getOrgId());
    noisyQuery.setParameter("datasetId", request.getDatasetId());
    noisyQuery.setParameter("segment", request.getSegment());
    noisyQuery.setParameter("analyzerId", request.getAnalyzerId());
    val interval = Interval.parse(request.getInterval());
    noisyQuery.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    noisyQuery.setParameter(
        "end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));

    val r = new DiagnosticAnalyzerSegmentColumnsResponse();
    r.setNoisyColumns(noisyQuery.getResultList());
    return r;
  }

  @Transactional
  @Executable
  public void delete(DeleteAnalysisRequest req) {
    List<String> tables =
        Arrays.asList(
            HYPERTABLE_ANOMALIES,
            HYPERTABLE_NON_ANOMALIES,
            HYPERTABLE_ANOMALIES_PG,
            HYPERTABLE_NON_ANOMALIES_PG);
    for (String table : tables) {
      String sql = "delete from whylabs." + table + buildWhereClause(req);

      val query = (NativeQueryImpl) entityManager.createNativeQuery(sql);
      substituteParams(query, req);
      query.executeUpdate();
    }
  }

  private String buildWhereClause(DeleteAnalysisRequest req) {
    String sql = " where org_id=:orgId \n" + "    and dataset_id = :datasetId\n";
    if (req.getDelete_gte() != null) {
      sql = sql + "    and dataset_timestamp >= :start\n";
    }
    if (req.getDelete_lt() != null) {
      sql = sql + " and dataset_timestamp < :end\n";
    }
    if (!StringUtils.isEmpty(req.getAnalyzerId())) {
      sql = sql + " and analyzer_id = :analyzer_id\n";
    }
    return sql;
  }

  private void substituteParams(NativeQueryImpl query, DeleteAnalysisRequest req) {
    query.setParameter("orgId", req.getOrgId());
    query.setParameter("datasetId", req.getDatasetId());
    if (req.getDelete_gte() != null) {
      query.setParameter("start", java.sql.Date.from(Instant.ofEpochMilli(req.getDelete_gte())));
    }

    if (req.getDelete_lt() != null) {
      query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(req.getDelete_lt())));
    }
    if (!StringUtils.isEmpty(req.getAnalyzerId())) {
      query.setParameter("analyzer_id", req.getAnalyzerId());
    }
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public DataDeletionPreviewResponse deletePreview(DeleteAnalysisRequest req) {
    String sql =
        "select count(*) as rows, count(distinct(dataset_timestamp)) as unique_timestamps from whylabs."
            + COMBINED_VIEW
            + buildWhereClause(req);

    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(sql);
    substituteParams(query, req);
    val r = query.getResultList();

    for (val row : r) {
      return DataDeletionPreviewResponse.builder()
          .numRows(((BigInteger) ((Object[]) row)[0]).longValue())
          .uniqueDates(((BigInteger) ((Object[]) row)[1]).longValue())
          .build();
    }

    return DataDeletionPreviewResponse.builder().numRows(0l).uniqueDates(0l).build();
  }

  @SneakyThrows
  @Async("analyzer-result-ingestion")
  @Transactional
  public void loadFromJsonAsync(String key, CountDownLatch latch) {
    long s = System.currentTimeMillis();
    try {
      val postgresReadPath = Paths.get("/s3/delta/" + key);
      String sql =
          "COPY whylabs.bulk_proxy_analysis (json_blob) FROM PROGRAM 'cat "
              + postgresReadPath
              + "' ";
      log.info("Loading analyzer results {}", sql);
      val query = (NativeQueryImpl) entityManager.createNativeQuery(sql);
      query.setTimeout(3600000);
      query.executeUpdate();
      log.info("Loading analyzer result file {} took {}ms", key, System.currentTimeMillis() - s);
    } catch (GenericJDBCException e) {
      log.error("Error while loading analyzer result file {}", key, e);
    } finally {
      latch.countDown();
    }
  }

  @Transactional
  public long countDigests(GetDigestsRequest rqst) {
    val sql =
        "with cte as\n"
            + "(\n"
            + "    select count(*) cnt\n"
            + "    from whylabs.digests_immediate\n"
            + "    where :org_id is  null or org_id=:org_id\n"
            + "      and :dataset_id is  null or dataset_id=:dataset_id\n"
            + "      and :run_id is  null or run_id=:run_id\n"
            + "      and :monitor_id is  null or monitor_id=:monitor_id\n"
            + "    union\n"
            + "    select count(*) cnt\n"
            + "    from whylabs.digests_scheduled\n"
            + "    where :org_id is  null or org_id=:org_id\n"
            + "        and :dataset_id is  null or dataset_id=:dataset_id\n"
            + "        and :run_id is  null or run_id=:run_id\n"
            + "        and :monitor_id is  null or monitor_id=:monitor_id\n"
            + ")\n"
            + "select sum(cnt) from cte\n";
    val query = (NativeQueryImpl) entityManager.createNativeQuery(sql);
    query.setParameter("org_id", rqst.getOrgId());
    query.setParameter("dataset_id", rqst.getDatasetId());
    query.setParameter("run_id", rqst.getRunId());
    query.setParameter("monitor_id", rqst.getMonitorId());
    val r = query.getResultList();

    for (val row : r) {
      return ((BigDecimal) row).longValue();
    }
    return 0;
  }
}
