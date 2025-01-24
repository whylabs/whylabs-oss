package ai.whylabs.dataservice.services;

import static java.util.Objects.isNull;

import ai.whylabs.dataservice.requests.ModelMetricsRqst;
import ai.whylabs.dataservice.responses.ClassificationMetricRow;
import ai.whylabs.dataservice.responses.ClassificationSummaryRow;
import ai.whylabs.dataservice.responses.ModelMetricsRow;
import ai.whylabs.dataservice.responses.RegressionMetricRow;
import ai.whylabs.dataservice.strategies.ProfileTableResolutionStrategy;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.PostgresUtil;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.hibernate.query.internal.NativeQueryImpl;
import org.jetbrains.annotations.NotNull;

@Slf4j
@Singleton
@JdbcRepository(dialect = Dialect.POSTGRES)
public abstract class DatasetMetricsService {
  static final String METRIC_PATH_CLASSIFICATION = "model/classification";
  static final String METRIC_PATH_REGRESSION = "model/regression";

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager entityManager;

  @Inject private ProfileTableResolutionStrategy profileTableResolutionStrategy;

  private static final String classificationRollupSql;
  private static final String regressionRollupSql;

  static {
    try {
      classificationRollupSql =
          IOUtils.resourceToString("/sql/classification-rollup.sql", StandardCharsets.UTF_8);
      regressionRollupSql =
          IOUtils.resourceToString("/sql/regression-rollup.sql", StandardCharsets.UTF_8);

    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  public DatasetMetricsService() {}

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<ModelMetricsRow> queryClassificationMetricsRaw(ModelMetricsRqst rqst)
      throws SQLException {
    val query = getClassificationMetricQuery(rqst);
    return query.getResultList();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<ModelMetricsRow> queryRegressionMetricsRaw(ModelMetricsRqst rqst)
      throws SQLException {
    val query = queryRegressionMetricQuery(rqst);
    return query.getResultList();
  }

  private NativeQueryImpl<ModelMetricsRow> getClassificationMetricQuery(ModelMetricsRqst rqst) {
    // add sort order directly to the query string.
    // be careful to ensure there is whitespace before the sort order.
    final String sql = classificationRollupSql;
    final String querySQL =
        sql.replace(
                "whylabs." + ProfileService.PROFILES_OVERALL_VIEW,
                profileTableResolutionStrategy.getTable(
                    rqst.getSegment(),
                    rqst.getSegmentKey(),
                    rqst.getGranularity(),
                    rqst.getOrgId(),
                    rqst.getDatasetId()))
            + "\n"
            + rqst.getOrder().name();

    val interval = rqst.getInterval();
    val query =
        (NativeQueryImpl<ModelMetricsRow>)
            entityManager.createNativeQuery(querySQL, ModelMetricsRow.class);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTS", new Timestamp(interval.getEndMillis()));
    query.setParameter("granularity", rqst.getGranularity().asSQL());
    String[] segments = {};
    if (rqst.getSegment() != null) {
      segments =
          rqst.getSegment().stream()
              .map(s -> s.getKey() + "=" + s.getValue())
              .toArray(String[]::new);
    }
    query.setParameter("segment_tags", segments);
    query.setParameter("segmentKey", rqst.getSegmentKey());
    return query;
  }

  /**
   * Query and aggregate classification model objects. Dates for which the model metrics are null
   * are filtered out of the results.
   *
   * @param rqst model metrics request with orgid, dataset id,dates, etc.
   * @return Map from timestamp to classification metric object. Each entry is aggregated according
   *     to request granularity.
   * @throws SQLException
   */
  public Map<Object, ClassificationMetrics> queryClassificationMetrics(ModelMetricsRqst rqst)
      throws SQLException {
    val query = getClassificationMetricQuery(rqst);

    final Function<ModelMetricsRow, ClassificationMetrics> deserialize =
        (row) -> {
          try {
            return ClassificationMetrics.fromModelMetricsRow(row);
          } catch (InvalidProtocolBufferException e) {
            log.error("Cannot parse ScoreMatrixMessage - {}", e.getMessage());
          }
          return null;
        };

    return query
        .getResultStream()
        .filter(row -> !isNull(row.getMetrics()))
        .map(row -> Pair.of(row.getGroupBy(), deserialize.apply(row)))
        .filter(pair -> !isNull(((Pair<Object, ClassificationMetrics>) pair).getValue()))
        .collect(
            Collectors.toMap(p -> p.getKey(), p -> p.getValue(), (u, v) -> u, LinkedHashMap::new));
  }

  private NativeQueryImpl<ModelMetricsRow> queryRegressionMetricQuery(ModelMetricsRqst rqst)
      throws SQLException {
    // add sort order directly to the query string.
    // be careful to ensure there is whitespace before the sort order.
    final String sql = regressionRollupSql;
    final String querySQL =
        sql.replace(
                "whylabs." + ProfileService.PROFILES_OVERALL_VIEW,
                profileTableResolutionStrategy.getTable(
                    rqst.getSegment(),
                    rqst.getSegmentKey(),
                    rqst.getGranularity(),
                    rqst.getOrgId(),
                    rqst.getDatasetId()))
            + "\n"
            + rqst.getOrder().name();

    val interval = rqst.getInterval();
    val query =
        (NativeQueryImpl<ModelMetricsRow>)
            entityManager.createNativeQuery(querySQL, ModelMetricsRow.class);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTS", new Timestamp(interval.getEndMillis()));
    query.setParameter("granularity", rqst.getGranularity().asSQL());
    String[] segments = {};
    if (rqst.getSegment() != null) {
      segments =
          rqst.getSegment().stream()
              .map(s -> s.getKey() + "=" + s.getValue())
              .toArray(String[]::new);
    }
    query.setParameter("segment_tags", segments);
    query.setParameter("segmentKey", rqst.getSegmentKey());
    return query;
  }

  /**
   * Query and aggregate regression model objects. Dates for which the model metrics are null are
   * filtered out of the results.
   *
   * @param rqst model metrics request with orgid, dataset id,dates, etc.
   * @return Map from timestamp to regression metric object. Each entry is aggregated according to
   *     request granularity.
   * @throws SQLException
   */
  @NotNull
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public Map<Object, RegressionMetrics> queryRegressionMetrics(ModelMetricsRqst rqst)
      throws SQLException {
    val query = queryRegressionMetricQuery(rqst);

    final Function<ModelMetricsRow, RegressionMetrics> deserialize =
        (row) -> {
          try {
            return RegressionMetrics.fromModelMetricsRow(row);
          } catch (InvalidProtocolBufferException e) {
            log.error("Cannot parse RegressionMetrics - {}", e.getMessage());
          }
          return null;
        };

    return query
        .getResultStream()
        .map(row -> Pair.of(row.getGroupBy(), deserialize.apply(row)))
        .filter(pair -> !isNull(((Pair<Object, RegressionMetrics>) pair).getValue()))
        .collect(
            Collectors.toMap(p -> p.getKey(), p -> p.getValue(), (u, v) -> u, LinkedHashMap::new));
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<ClassificationSummaryRow> classificationSummary(ModelMetricsRqst rqst)
      throws SQLException {
    val map = queryClassificationMetrics(rqst);

    // Calculate summary information and turn into a list of timestamped rows.
    val results =
        map.entrySet().stream()
            .map(
                e -> {
                  return e.getValue().toSummaryRowBuilder((Long) e.getKey());
                })
            .collect(Collectors.toList());

    return results;
  }

  /**
   * Queries database for classification model metrics according to parameters in `rqst`, aggregated
   * to requested granularity. Returns a list of rows containing derived metrics, sorted in order of
   * increasing timestamp.
   *
   * @param rqst model metrics request with orgid, dataset id,dates, etc.
   * @return List of rows containing timestamp and numeric derived from model metric values.
   * @throws SQLException
   */
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<ClassificationMetricRow> classificationMetrics(ModelMetricsRqst rqst)
      throws SQLException {
    val map = queryClassificationMetrics(rqst);

    // Calculate summary information and turn into a list of timestamped rows.
    val results =
        map.entrySet().stream()
            .map(
                e -> {
                  return new ClassificationMetricRow(
                      (Long) e.getKey(), e.getValue().toMetricValues());
                })
            .collect(Collectors.toList());

    return results;
  }

  /**
   * Queries database for regression model metrics according to parameters in `rqst`, aggregated to
   * requested granularity. Returns a list of rows containing derived metrics, sorted in order of
   * increasing timestamp.
   *
   * @param rqst model metrics request with orgid, dataset id,dates, etc.
   * @return List of rows containing timestamp and numeric derived from model metric values.
   * @throws SQLException
   */
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<RegressionMetricRow> regressionMetrics(ModelMetricsRqst rqst) throws SQLException {
    Map<Object, RegressionMetrics> map = queryRegressionMetrics(rqst);

    // Collect results into rows...
    List<RegressionMetricRow> results =
        map.entrySet().stream()
            .filter(e -> !isNull(e.getValue()))
            .map(
                e -> {
                  return new RegressionMetricRow((Long) e.getKey(), e.getValue());
                })
            .collect(Collectors.toList());

    return results;
  }
}
