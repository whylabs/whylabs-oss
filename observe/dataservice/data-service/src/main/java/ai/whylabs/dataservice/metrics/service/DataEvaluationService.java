package ai.whylabs.dataservice.metrics.service;

import ai.whylabs.dataservice.metrics.DataEvaluationRequest;
import ai.whylabs.dataservice.metrics.agg.Spec;
import ai.whylabs.dataservice.metrics.postagg.PostAgg;
import ai.whylabs.dataservice.metrics.query.ProfileTimeSeriesQuery;
import ai.whylabs.dataservice.metrics.result.DataEvaluationResponse;
import ai.whylabs.dataservice.metrics.result.DataEvaluationResult;
import ai.whylabs.dataservice.metrics.result.EvaluationCellResult;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.PostgresUtil;
import com.google.common.collect.Lists;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.util.*;
import java.util.concurrent.*;
import javax.annotation.Nullable;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
public class DataEvaluationService {
  private final ExecutorService executors;
  public static final String MERGE_OP = "PLACEHOLDER_MERGE_OPERATION";

  public static final String EXPLODED_MERGE_OP = "PLACEHOLDER_EXPLODED_MERGE_OPERATION";
  public static final String PROFILES_TABLE = "PLACEHOLDER_PROFILES_TABLE";
  public static final String AGG_FIELD = "agg_data";
  public static final String EXPAND_ROW_SEGMENTS = "PLACEHOLDER_EXPAND_ROW_SEGMENT";
  public static final String EXPAND_COLUMN_SEGMENTS = "PLACEHOLDER_EXPAND_COLUMN_SEGMENT";
  public static final String SEGMENT_KEY_ROW_FILTER = "PLACEHOLDER_SEGMENT_KEY_ROW_FILTER";
  public static final String POSTAGG_OPERATION = "PLACEHOLDER_POSTAGG_OPERATION";

  public static final int TIMEOUT_IN_MINUTES = 5;

  public static final int MAX_CHUNK_SIZE = 15; // number of parallel DB queries

  private static final String referenceProfilesComparisonSql;

  private static final String aggBatchRangeComparisonSql;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  public DataEvaluationService() throws IOException {
    this.executors = Executors.newFixedThreadPool(128);
  }

  static {
    try {
      referenceProfilesComparisonSql =
          IOUtils.resourceToString(
              "/sql/query-data-evaluation-reference-profile.sql", StandardCharsets.UTF_8);
      aggBatchRangeComparisonSql =
          IOUtils.resourceToString(
              "/sql/query-data-evaluation-aggregated-batch-range.sql", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public List<CompletableFuture<List<EvaluationCellResult>>> referenceProfileQueryRunner(
      String orgId, ProfileTimeSeriesQuery query, DataEvaluationRequest request) {
    val futures = new ArrayList<CompletableFuture<List<EvaluationCellResult>>>();
    for (val refProfile : request.getReferenceProfiles()) {
      val future = new CompletableFuture<List<EvaluationCellResult>>();
      executors.submit(
          () -> {
            try {
              val queryResult =
                  this.executeReferenceProfileComparisonQuery(orgId, query, refProfile, request);
              future.complete(queryResult);

            } catch (Throwable e) {
              log.info("Error executing referenceProfileComparison query", e);
              future.complete(List.of());
            }
          });
      futures.add(future);
    }
    return futures;
  }

  public CompletableFuture<List<EvaluationCellResult>> segmentComparisonQueryRunner(
      String orgId, ProfileTimeSeriesQuery query, DataEvaluationRequest request) {
    val future = new CompletableFuture<List<EvaluationCellResult>>();
    executors.submit(
        () -> {
          try {
            val queryResult = this.executeSegmentComparisonQuery(orgId, query, request);
            future.complete(queryResult);

          } catch (Throwable e) {
            log.info("Error executing segmentComparison query", e);
            future.complete(List.of());
          }
        });
    return future;
  }

  private int calculateChunkSize(DataEvaluationRequest request, boolean isReferenceProfileQuery) {
    if (isReferenceProfileQuery) {
      // the reference profiles flow will queue one future request per ref-profile
      return MAX_CHUNK_SIZE / request.getReferenceProfiles().size();
    }
    return MAX_CHUNK_SIZE;
  }

  public DataEvaluationResponse dataEvaluationQueryProcessor(
      String orgId, DataEvaluationRequest request) {
    val allEntries = new ArrayList<DataEvaluationResult>();
    val isReferenceProfileQuery =
        request.getReferenceProfiles() != null && request.getReferenceProfiles().size() > 0;
    val chunkSize = calculateChunkSize(request, isReferenceProfileQuery);
    val chunks = Lists.partition(request.getQueries(), chunkSize);
    for (val parallelQueries : chunks) {
      val allFutures = Lists.<CompletableFuture<List<EvaluationCellResult>>>newArrayList();
      for (val query : parallelQueries) {
        if (isReferenceProfileQuery) {
          allFutures.addAll(this.referenceProfileQueryRunner(orgId, query, request));
        } else {
          allFutures.add(this.segmentComparisonQueryRunner(orgId, query, request));
        }
      }

      try {
        CompletableFuture.allOf(allFutures.toArray(CompletableFuture[]::new))
            .get(TIMEOUT_IN_MINUTES, TimeUnit.MINUTES);

      } catch (TimeoutException | InterruptedException | ExecutionException e) {
        log.info("Error executing data comparison futures", e);
      }

      val resultRows = new HashMap<String, DataEvaluationResult>();

      allFutures.forEach(
          f -> {
            // at this point we are in a list of a common columnGroup (ref-profile or segment) with
            // one item per row segment
            val valueIfAbsent = new ArrayList<EvaluationCellResult>();
            val queriesSegmentValues = f.getNow(valueIfAbsent);
            queriesSegmentValues.forEach(
                cell -> {
                  val rowId = this.getCellRowId(cell);
                  val currentRow = resultRows.get(rowId);
                  val rowColumn = new HashMap<String, Double>();
                  rowColumn.put(cell.getId(), cell.getValue());
                  if (currentRow == null) {
                    val evaluationResult =
                        DataEvaluationResult.builder()
                            .metric(cell.getMetric())
                            .segment(cell.getSegment())
                            .columnName(cell.getColumnName())
                            .rowColumns(List.of(rowColumn))
                            .queryId(cell.getQueryId())
                            .build();
                    resultRows.put(rowId, evaluationResult);
                  } else {
                    val currentColumns = new ArrayList<>(currentRow.getRowColumns());
                    currentColumns.add(rowColumn);
                    currentRow.setRowColumns(currentColumns);
                  }
                });
          });

      allEntries.addAll(resultRows.values());
    }

    return DataEvaluationResponse.builder().entries(allEntries).build();
  }

  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Transactional
  public List<EvaluationCellResult> executeReferenceProfileComparisonQuery(
      String orgId,
      ProfileTimeSeriesQuery requestQuery,
      String refProfileId,
      DataEvaluationRequest request) {
    val spec = requestQuery.getEffectiveMetrics().get(0).getSpec();
    String sqlQuery = buildReferenceProfilesComparisonSqlQuery(spec, request.getRowSegmentGroup());
    val query =
        createQueryWithCommonParameters(
            orgId, sqlQuery, requestQuery, spec, request.getRowSegmentGroup());
    query.setParameter("referenceProfile", refProfileId);

    log.debug("Executing reference profiles comparison query...");
    val resultList = query.getResultList();
    return parseQueryResult(resultList, requestQuery, spec.getPostAgg());
  }

  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Transactional
  public List<EvaluationCellResult> executeSegmentComparisonQuery(
      String orgId, ProfileTimeSeriesQuery requestQuery, DataEvaluationRequest request) {
    val spec = requestQuery.getEffectiveMetrics().get(0).getSpec();
    val interval = request.getInterval();
    String sqlQuery =
        buildSegmentComparisonSqlQuery(
            spec, request.getColumnSegments(), request.getRowSegmentGroup());
    val query =
        createQueryWithCommonParameters(
            orgId, sqlQuery, requestQuery, spec, request.getRowSegmentGroup());
    if (request.getColumnSegments() != null && request.getColumnSegments().size() > 0) {
      query.setParameter("columnSegmentsFilter", request.getColumnSegments());
    } else {
      query.setParameter("columnSegmentsFilter", null);
    }
    query.setParameter("startTimestamp", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTimestamp", new Timestamp(interval.getEndMillis()));

    log.debug("Executing segment aggregated batch range comparison query...");
    val resultList = query.getResultList();
    return parseQueryResult(resultList, requestQuery, spec.getPostAgg());
  }

  private Double extractRowValue(Object columnValue, PostAgg postAgg) {
    if (postAgg != null) {
      return postAgg.extractMetricValue(columnValue);
    }
    if (columnValue instanceof BigDecimal) {
      return ((BigDecimal) columnValue).doubleValue();
    }
    return (Double) columnValue;
  }

  private ArrayList<EvaluationCellResult> parseQueryResult(
      List<?> queryResultList, ProfileTimeSeriesQuery requestQuery, PostAgg postAgg) {
    val result = new ArrayList<EvaluationCellResult>();
    for (val row : queryResultList) {
      val objArray = (Object[]) row;
      val groupId = (String) objArray[0];
      val segment = (String) objArray[1];
      val cell = EvaluationCellResult.builder();
      result.add(
          cell.id(groupId)
              .value(extractRowValue(objArray[2], postAgg))
              .metric(requestQuery.getMetric())
              .segment(segment)
              .columnName(requestQuery.getColumnName())
              .queryId(requestQuery.getQueryId())
              .build());
    }
    return result;
  }

  private NativeQueryImpl<?> createQueryWithCommonParameters(
      String orgId,
      String sqlQuery,
      ProfileTimeSeriesQuery requestQuery,
      Spec spec,
      @Nullable String rowSegmentGroup) {
    val query = (NativeQueryImpl<?>) roEntityManager.createNativeQuery(sqlQuery);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", orgId);
    query.setParameter("resourceId", requestQuery.getResourceId());
    query.setParameter("columnName", requestQuery.getColumnName());
    query.setParameter("metricPath", spec.getMetricPath());
    if (rowSegmentGroup != null && !rowSegmentGroup.isEmpty()) {
      // if the segment has no '=' so it's a key, we should concat the '=' to avoid match partial
      // keys.
      query.setParameter(
          "rowSegmentGroup", rowSegmentGroup + (rowSegmentGroup.contains("=") ? "" : "="));
    }
    return query;
  }

  private String getCellRowId(EvaluationCellResult cell) {
    return String.join(
        "::",
        cell.getQueryId(),
        cell.getSegment(),
        cell.getColumnName(),
        cell.getMetric().toString());
  }

  public String buildReferenceProfilesComparisonSqlQuery(
      Spec spec, @Nullable String rowSegmentGroup) {
    String sqlQuery = referenceProfilesComparisonSql;
    val segmentFilterTerm = Optional.ofNullable(rowSegmentGroup).orElse("").trim();
    val isOverallSegment = segmentFilterTerm.isEmpty();
    val segmentFilter =
        segmentFilterTerm.contains("=")
            ? "where segment = :rowSegmentGroup"
            : "where starts_with(segment::text, :rowSegmentGroup)";
    sqlQuery =
        sqlQuery
            .replace(MERGE_OP, spec.getAgg().getSql())
            .replace(
                EXPAND_ROW_SEGMENTS,
                isOverallSegment ? "'All data'" : "jsonb_array_elements(segment_text)")
            .replace(SEGMENT_KEY_ROW_FILTER, isOverallSegment ? "" : segmentFilter);

    if (spec.getPostAgg() != null) {
      sqlQuery = sqlQuery.replace(POSTAGG_OPERATION, spec.getPostAgg().toSql());
    } else {
      sqlQuery = sqlQuery.replace(POSTAGG_OPERATION, AGG_FIELD);
    }

    sqlQuery = sqlQuery.replace("::", "::::");
    return sqlQuery;
  }

  public String buildSegmentComparisonSqlQuery(
      Spec spec, @Nullable List<String> columnSegments, @Nullable String rowSegmentGroup) {
    String sqlQuery = aggBatchRangeComparisonSql;
    val isColumnOverallSegment = columnSegments == null || columnSegments.isEmpty();

    val rowSegmentFilterTerm = Optional.ofNullable(rowSegmentGroup).orElse("").trim();
    val isRowOverallSegment = rowSegmentFilterTerm.isEmpty();
    val rowSegmentFilter =
        rowSegmentFilterTerm.contains("=")
            ? "where rowSegment = :rowSegmentGroup"
            : "where starts_with(rowSegment::text, :rowSegmentGroup)";
    // we relly that the SQL column is the first operation parameter
    val aggregationColumn = spec.getAgg().getColumn().split(",")[0];
    val tableName =
        isColumnOverallSegment && isRowOverallSegment
            ? "whylabs.profiles_overall"
            : "whylabs.profiles_segmented";
    sqlQuery =
        sqlQuery
            .replace(MERGE_OP, spec.getAgg().getSql() + String.format(" AS %s", aggregationColumn))
            .replace(PROFILES_TABLE, tableName)
            .replace(
                EXPAND_COLUMN_SEGMENTS,
                isColumnOverallSegment ? "'All data'" : "jsonb_array_elements(segment_text)")
            .replace(EXPLODED_MERGE_OP, spec.getAgg().getSql())
            .replace(
                EXPAND_ROW_SEGMENTS,
                isRowOverallSegment ? "'All data'" : "jsonb_array_elements(segment_text)")
            .replace(SEGMENT_KEY_ROW_FILTER, isRowOverallSegment ? "" : rowSegmentFilter);
    if (spec.getPostAgg() != null) {
      sqlQuery = sqlQuery.replace(POSTAGG_OPERATION, spec.getPostAgg().toSql());
    } else {
      sqlQuery = sqlQuery.replace(POSTAGG_OPERATION, AGG_FIELD);
    }

    sqlQuery = sqlQuery.replace("::", "::::");
    return sqlQuery;
  }
}
