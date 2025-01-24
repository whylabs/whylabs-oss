package ai.whylabs.dataservice.metrics.service;

import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.metrics.TimeSeriesQueryRequest;
import ai.whylabs.dataservice.metrics.agg.Agg;
import ai.whylabs.dataservice.metrics.agg.BuiltinSpec;
import ai.whylabs.dataservice.metrics.agg.Spec;
import ai.whylabs.dataservice.metrics.query.MonitorTimeSeriesQuery;
import ai.whylabs.dataservice.metrics.query.ProfileTimeSeriesQuery;
import ai.whylabs.dataservice.metrics.query.TimeSeriesQuery;
import ai.whylabs.dataservice.metrics.query.TraceTimeSeriesQuery;
import ai.whylabs.dataservice.metrics.result.QueryResultStatus;
import ai.whylabs.dataservice.metrics.result.TimeSeriesQueryResponse;
import ai.whylabs.dataservice.metrics.result.TimeSeriesResult;
import ai.whylabs.dataservice.metrics.spec.NumericMetric;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.strategies.ProfileTableResolutionStrategy;
import ai.whylabs.dataservice.util.DatasourceConstants;
import com.clearspring.analytics.util.Lists;
import com.google.common.collect.ImmutableList;
import com.microsoft.azure.kusto.data.Client;
import com.microsoft.azure.kusto.data.ClientRequestProperties;
import com.microsoft.azure.kusto.data.KustoOperationResult;
import com.microsoft.azure.kusto.data.KustoResultSetTable;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import io.micronaut.context.annotation.Property;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.annotation.Nullable;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.hibernate.query.internal.NativeQueryImpl;
import org.jetbrains.annotations.NotNull;
import org.joda.time.Interval;

@Slf4j
@Singleton
public class TimeSeriesMetricService {
  // coupled with the query in /sql/query-timeseries-profiles.sql and
  // /sql/query-timeseries-monitors.sql
  public static final String MERGE_OP = "PLACEHOLDER_MERGE_OPERATION";
  public static final String POSTT_AGG = "PLACEHOLDER_POSTAGG_OPERATION";
  public static final String AGG_FIELD = "agg_data";
  public static final int TIMEOUT_IN_MINUTES = 5;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager entityManager;

  @PersistenceContext(name = DatasourceConstants.STANDBY)
  private EntityManager standbyEntityManager;

  @javax.inject.Inject private Client client; // Kusto traces client

  @javax.inject.Inject
  @Property(name = "whylabs.dataservice.azure.kusto.database")
  private String databaseName;

  @Inject private ProfileTableResolutionStrategy profileTableResolutionStrategy;
  private final ExecutorService executors;
  private static final String profiles;
  private static final String missing_datapoint;
  private static final String last_upload_ts;
  private static final String monitors;
  private static final String traces;

  static {
    try {
      profiles =
          IOUtils.resourceToString("/sql/query-timeseries-profiles.sql", StandardCharsets.UTF_8);
      missing_datapoint =
          IOUtils.resourceToString(
              "/sql/query-timeseries-missing-datapoint.sql", StandardCharsets.UTF_8);
      last_upload_ts =
          IOUtils.resourceToString(
              "/sql/query-timeseries-last-upload-ts.sql", StandardCharsets.UTF_8);
      monitors =
          IOUtils.resourceToString("/sql/query-timeseries-monitors.sql", StandardCharsets.UTF_8);
      traces = IOUtils.resourceToString("/sql/query-timeseries-traces.kql", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public TimeSeriesMetricService() throws IOException {
    this.executors = Executors.newFixedThreadPool(128);
  }

  @SneakyThrows
  private ClientRequestProperties generateClientRequestProperties(@Nullable String identity) {
    val clientRequestProperties = new ClientRequestProperties();
    clientRequestProperties.setApplication("dataservice");
    clientRequestProperties.setOption("request_readonly", "true");
    clientRequestProperties.setOption(
        "request_user", Optional.ofNullable(identity).orElse("anonymous"));
    return clientRequestProperties;
  }

  /**
   * Retrieve requested times series metrics, without without Azure identity. Mainly a convenience
   * for unit tests which do not access Azure.
   */
  public TimeSeriesQueryResponse timeseries(String orgId, TimeSeriesQueryRequest rqst) {
    return timeseries(orgId, rqst, null);
  }

  /**
   * Retrieve requested times series metrics. Fulfill embedded TimeSeriesQuery's and apply any
   * formula supplied in the request. TimeSeriesQueryResponse result contains metrics from each
   * TimeSeriesQuery plus results from the formula, if supplied.
   *
   * @param identity - optional identity for trace metrics in Azure Kusto DB.
   */
  public TimeSeriesQueryResponse timeseries(
      String orgId, TimeSeriesQueryRequest rqst, @Nullable String identity) {

    // all TimeSeriesQuery within this request share origId, interval, and granularity
    Interval interval = rqst.getInterval();
    DataGranularity granularity = rqst.getRollupGranularity();
    val allFutures = Lists.<CompletableFuture<TimeSeriesResult>>newArrayList();
    for (val tsQuery : rqst.getTimeseries()) {
      for (val spec : tsQuery.getEffectiveMetrics()) {
        val future = new CompletableFuture<TimeSeriesResult>();
        executors.submit(
            () -> {
              try {
                val queryResult =
                    this.executeSingleTimeseries(
                        orgId, interval, granularity, tsQuery, spec, identity);
                queryResult.setStatus(QueryResultStatus.SUCCESS);
                // hide internal metrics on success; leave exposed on error.
                queryResult.setHidden(spec.getHidden());
                if (spec.getHidden()) {
                  queryResult.setId(tsQuery.getQueryId() + "_" + queryResult.getId());
                }
                future.complete(queryResult);
              } catch (Throwable e) { // catch exeverything here
                log.info("Error executing query", e);
                TimeSeriesResult queryResult = new TimeSeriesResult();
                queryResult.setStatus(QueryResultStatus.ERROR);
                queryResult.setErrorCode("INTERNAL_ERROR");
                queryResult.setId(tsQuery.getQueryId());

                queryResult.setErrorMessages(ImmutableList.of(e.getMessage()));
                future.complete(queryResult);
              }
            });
        allFutures.add(future);
      }
    }

    try {
      CompletableFuture.allOf(allFutures.stream().toArray(CompletableFuture[]::new))
          .get(TIMEOUT_IN_MINUTES, TimeUnit.MINUTES);

    } catch (TimeoutException e) {
      val queryResult = new TimeSeriesQueryResponse();
      queryResult.setStatus(QueryResultStatus.ERROR);
      queryResult.setErrorCode("TIMEDOUT");
      queryResult.setFailureCount(rqst.getTimeseries().size());
      allFutures.stream().forEach(it -> it.cancel(true));
      return queryResult;
    } catch (InterruptedException | ExecutionException e) {
      val queryResult = new TimeSeriesQueryResponse();
      queryResult.setStatus(QueryResultStatus.ERROR);
      queryResult.setErrorCode("INTERNAL_ERROR");
      queryResult.setFailureCount(rqst.getTimeseries().size());
      return queryResult;
    }

    val failureCount = new AtomicInteger();
    val entries =
        allFutures.stream()
            .map(
                p -> {
                  val valueIfAbsent = new TimeSeriesResult();
                  valueIfAbsent.setStatus(QueryResultStatus.ERROR);

                  val result = p.getNow(valueIfAbsent);
                  if (result.getStatus() == QueryResultStatus.ERROR) {
                    failureCount.incrementAndGet();
                  }

                  return result;
                })
            .collect(Collectors.toList());

    val formulaResults = new FormulaEvaluation(entries).evaluate(rqst.getEffectiveFormulas());
    val rspn = new TimeSeriesQueryResponse();
    val totalResults =
        Stream.concat(formulaResults.stream(), entries.stream())
            .filter(Predicate.not(TimeSeriesResult::getHidden))
            .collect(Collectors.toList());
    rspn.setTimeseries(ImmutableList.<TimeSeriesResult>builder().addAll(totalResults).build());
    rspn.setId(UUID.randomUUID());
    rspn.setFailureCount(failureCount.get());
    int successCount = rqst.getTimeseries().size() - failureCount.get();
    rspn.setSuccessCount(successCount);

    if (successCount > 0) {
      rspn.setStatus(QueryResultStatus.SUCCESS);
    } else {
      rspn.setStatus(QueryResultStatus.ERROR);
    }
    return rspn;
  }

  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Transactional
  public TimeSeriesResult executeSingleTimeseries(
      String orgId,
      Interval interval,
      DataGranularity granularity,
      TimeSeriesQuery tsQuery,
      NumericMetric metric,
      @Nullable String identity) {
    if (metric == null) {
      return null;
    }

    if (tsQuery instanceof MonitorTimeSeriesQuery) {
      return queryFromMonitors(
          orgId, interval, granularity, (MonitorTimeSeriesQuery) tsQuery, metric);
    } else if (tsQuery instanceof ProfileTimeSeriesQuery) {
      return queryFromProfiles(
          orgId, interval, granularity, (ProfileTimeSeriesQuery) tsQuery, metric);

    } else if (tsQuery instanceof TraceTimeSeriesQuery) {
      return queryFromTraces(
          orgId, interval, granularity, (TraceTimeSeriesQuery) tsQuery, metric, identity);
    }
    throw new IllegalArgumentException("Unsupported datasource");
  }

  @NotNull
  public TimeSeriesResult queryFromProfiles(
      String orgId,
      Interval interval,
      DataGranularity granularity,
      ProfileTimeSeriesQuery tsQuery,
      NumericMetric metric) {
    Spec spec = metric.getEffectiveSpec();
    final var l =
        queryRowsFromProfiles(
            orgId,
            tsQuery.getResourceId(),
            tsQuery.getColumnName(),
            tsQuery.getSegment(),
            interval,
            granularity,
            spec);
    TimeSeriesResult tsResult = new TimeSeriesResult();
    if (spec.getPostAgg() == null) {
      List<TimeSeriesResult.MetricEntry> data = new ArrayList<>();
      for (val entry : l) {
        data.add(new TimeSeriesResult.MetricEntry((Agg.NumericRow) entry));
      }
      tsResult.setData(data);
    } else {
      tsResult = spec.getPostAgg().extract(l);
    }

    log.debug("Done executing");

    tsResult.setStartTime(interval.getStartMillis());
    tsResult.setEndTime(interval.getEndMillis());
    tsResult.setInterval(Duration.ofDays(1).toMillis());

    // if results from only metric in query, attach queryId, otherwise use metric name as id.
    if (tsQuery.getEffectiveMetrics().size() == 1
        && metric == tsQuery.getEffectiveMetrics().get(0)) {
      tsResult.setId(tsQuery.getQueryId());
    } else {
      tsResult.setId(((BuiltinSpec) spec).name());
    }
    return tsResult;
  }

  /**
   * query a series of PG metric values. This is a RAW interface - it returns the rows as they come
   * back from postgres. No
   */
  @TransactionalAdvice(DatasourceConstants.STANDBY)
  @Transactional
  public List<? extends Agg.Row> queryRowsFromProfilesStandby(
      String orgId,
      String datasetId,
      String columnName,
      List<SegmentTag> segment,
      Interval interval,
      DataGranularity granularity,
      Spec spec) {
    String sqlQuery = buildQueryRowsFromProfilesSql(orgId, datasetId, spec, segment, granularity);
    val query =
        (NativeQueryImpl<? extends Agg.Row>)
            standbyEntityManager.createNativeQuery(sqlQuery, spec.getAgg().getResultsRow());
    return runQueryRowsFromProfiles(
        orgId, datasetId, columnName, segment, interval, granularity, spec, query);
  }

  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Transactional
  public List<? extends Agg.Row> queryRowsFromProfiles(
      String orgId,
      String datasetId,
      String columnName,
      List<SegmentTag> segment,
      Interval interval,
      DataGranularity granularity,
      Spec spec) {
    String sqlQuery = buildQueryRowsFromProfilesSql(orgId, datasetId, spec, segment, granularity);

    @SuppressWarnings("unchecked")
    val query =
        (NativeQueryImpl<? extends Agg.Row>)
            entityManager.createNativeQuery(sqlQuery, spec.getAgg().getResultsRow());
    return runQueryRowsFromProfiles(
        orgId, datasetId, columnName, segment, interval, granularity, spec, query);
  }

  private String buildQueryRowsFromProfilesSql(
      String orgId,
      String datasetId,
      Spec spec,
      List<SegmentTag> segment,
      DataGranularity granularity) {
    String sqlQuery = profiles;
    if (spec == BuiltinSpec.missing_datapoint) {
      if (granularity.equals(DataGranularity.individual)) {
        // avoid generating thousands of spurious events
        throw new IllegalArgumentException(
            "missing_datapoint metric incompatible with individual granularity");
      }
      sqlQuery = missing_datapoint;
    }
    if (spec == BuiltinSpec.last_upload_ts) {
      if (granularity.equals(DataGranularity.individual)) {
        // avoid generating thousands of spurious events
        throw new IllegalArgumentException(
            "seconds_since_last_upload metric incompatible with individual granularity");
      }
      sqlQuery = last_upload_ts;
    }

    sqlQuery = sqlQuery.replace(MERGE_OP, spec.getAgg().getSql());
    if (spec.getPostAgg() != null) {
      sqlQuery = sqlQuery.replace(POSTT_AGG, spec.getPostAgg().toSql());
    } else {
      sqlQuery = sqlQuery.replace(POSTT_AGG, AGG_FIELD);
    }

    val profilesTable =
        profileTableResolutionStrategy.getTable(segment, null, granularity, orgId, datasetId);

    sqlQuery = sqlQuery.replace("PLACEHOLDER_TABLE", profilesTable);

    // TODO: make this a standard util
    //  need to sanitize operations from the template
    sqlQuery = sqlQuery.replace("::", "::::").replace("?&", "\\?\\?&");
    return sqlQuery;
  }

  private List<? extends Agg.Row> runQueryRowsFromProfiles(
      String orgId,
      String datasetId,
      String columnName,
      List<SegmentTag> segment,
      Interval interval,
      DataGranularity granularity,
      Spec spec,
      NativeQueryImpl<? extends Agg.Row> query) {
    query.setParameter("orgId", orgId);
    query.setParameter("resourceId", datasetId);
    query.setParameter("columnName", columnName);
    query.setParameter("metricPath", spec.getMetricPath());
    query.setParameter("bucketWidth", granularity.asTimescaleGranularity());
    query.setParameter("startTimestamp", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTimestamp", new Timestamp(interval.getEndMillis()));

    val tags = segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
    query.setParameter("segmentTags", tags, StringArrayType.INSTANCE);

    log.debug("Executing query....");
    val l = query.getResultList();
    return l;
  }

  @SneakyThrows
  @NotNull
  private TimeSeriesResult queryFromMonitors(
      String orgId,
      Interval interval,
      DataGranularity granularity,
      MonitorTimeSeriesQuery tsQuery,
      NumericMetric spec) {
    val metric = spec.getEffectiveSpec();
    var sqlQuery = monitors.replace(MERGE_OP, metric.getAgg().getSql());
    if (metric.getPostAgg() != null) {
      sqlQuery = sqlQuery.replace(POSTT_AGG, metric.getPostAgg().toSql());
    } else {
      sqlQuery = sqlQuery.replace(POSTT_AGG, AGG_FIELD);
    }
    if (tsQuery.isReadPgMonitor()) {
      sqlQuery = sqlQuery.replace("whylabs.analysis", "whylabs.analysis_pg");
    }

    log.debug("rqst = " + tsQuery);
    @SuppressWarnings("unchecked")
    val query =
        (NativeQueryImpl<? extends Agg.Row>)
            entityManager.createNativeQuery(sqlQuery, metric.getAgg().getResultsRow());

    val tags = ai.whylabs.dataservice.util.SegmentUtils.toString(tsQuery.getSegment());

    query.setParameter("orgId", orgId);
    query.setParameter("resourceId", tsQuery.getResourceId());
    val colName = Optional.ofNullable(tsQuery.getColumnName()).orElse(spec.getColumnName());
    query.setParameter("columnName", colName);
    query.setParameter("bucketWidth", granularity.asTimescaleGranularity());
    query.setParameter("segment", "");
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTs", new Timestamp(interval.getEndMillis()));
    query.setParameter("segment", tags);
    query.setParameter("monitorId", tsQuery.getMonitorId());
    query.setParameter("analyzerId", tsQuery.getAnalyzerId());

    log.debug("Executing query....");
    val tsResult = metric.getPostAgg().extract(query.getResultList());
    log.debug("Done executing");

    tsResult.setStartTime(interval.getStartMillis());
    tsResult.setEndTime(interval.getEndMillis());
    tsResult.setInterval(Duration.ofDays(1).toMillis());
    tsResult.setId(tsQuery.getQueryId());
    return tsResult;
  }

  @SneakyThrows
  @NotNull
  private TimeSeriesResult queryFromTraces(
      String orgId,
      Interval interval,
      DataGranularity granularity,
      TraceTimeSeriesQuery tsQuery,
      NumericMetric spec,
      @Nullable String identity) {

    val metric = spec.getEffectiveSpec();
    var query = traces.replace(MERGE_OP, metric.getAgg().getSql());
    if (metric.getPostAgg() != null) {
      query = query.replace(POSTT_AGG, metric.getPostAgg().toSql());
    } else {
      query = query.replace(POSTT_AGG, AGG_FIELD);
    }
    log.debug("Kusto query: {}", query);
    val properties = generateClientRequestProperties(identity);
    properties.setParameter("orgId", orgId);
    properties.setParameter("resourceId", tsQuery.getResourceId());
    properties.setParameter("startTime", interval.getStart().toDate());
    properties.setParameter("endTime", interval.getEnd().toDate());
    properties.setParameter("granularity", granularity.asDuration());

    val tsResult = metric.getPostAgg().extract(extractKustoResults(query, properties));
    log.debug("Done executing");

    tsResult.setStartTime(interval.getStartMillis());
    tsResult.setEndTime(interval.getEndMillis());
    tsResult.setInterval(Duration.ofDays(1).toMillis());
    tsResult.setId(tsQuery.getQueryId());
    return tsResult;
  }

  /**
   * helper routine for extracting results from kusto query and turning them into List<? extends
   * Agg.Row>
   */
  @SneakyThrows
  private List<? extends Agg.Row> extractKustoResults(
      String query, ClientRequestProperties properties) {
    KustoOperationResult results = client.execute(databaseName, query, properties);
    KustoResultSetTable mainTableResult = results.getPrimaryResults();
    val aggResults = new ArrayList<Agg.NumericRow>();
    while (mainTableResult.next()) {
      val row = new Agg.NumericRow();
      row.setTimestamp(mainTableResult.getLong("timestamp"));
      row.setValue(mainTableResult.getDoubleObject("value"));
      aggResults.add(row);
    }

    return aggResults;
  }
}
