package ai.whylabs.dataservice.services;

import static java.lang.Math.min;

import ai.whylabs.core.configV3.structure.Tag;
import ai.whylabs.dataservice.requests.ListDebugEventsRequest;
import ai.whylabs.dataservice.requests.QueryDebugEventsRequest;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.responses.DebugEventResponse;
import ai.whylabs.dataservice.responses.QueryDebugEventsResponse;
import ai.whylabs.dataservice.structures.DebugEvent;
import ai.whylabs.dataservice.util.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.io.Readable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.PageableRepository;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
public abstract class DebugEventService implements PageableRepository<DebugEvent, Integer> {

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private ObjectMapper mapper;

  private final String querySegmentedSql;
  private final String querySql;
  private final String querySqlV2;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  public DebugEventService(
      @Value("${sql-files.debug-events-query-segmented}") Readable querySegmented,
      @Value("${sql-files.debug-events-query}") Readable query)
      throws IOException {
    querySegmentedSql =
        MicronautUtil.getStringFromReadable(querySegmented).replace("?&", "\\?\\?&");
    querySql = MicronautUtil.getStringFromReadable(query).replace("?&", "\\?\\?&");
    querySqlV2 = IOUtils.resourceToString("/sql/debug-events-query-v2.sql", StandardCharsets.UTF_8);
  }

  @SuppressWarnings("JpaQueryApiInspection")
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void save(List<DebugEvent> events) {
    String insert =
        "INSERT INTO whylabs.debug_events(org_id, dataset_id, segment_tags, content, creation_timestamp, dataset_timestamp, trace_id, tags) "
            + " VALUES (?, ?, ?::jsonb, ?::jsonb, ?, ?, ?, ?::text[])";

    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement preparedStatement = db.prepareStatement(insert);

    for (val a : events) {
      String segmentTagsJson = segmentTagsToJson(a.getSegmentTags());

      preparedStatement.setString(1, a.getOrgId());
      preparedStatement.setString(2, a.getDatasetId());
      preparedStatement.setString(3, segmentTagsJson);
      preparedStatement.setObject(4, a.getContent());
      preparedStatement.setTimestamp(5, new Timestamp(a.getCreationTimestamp()));
      preparedStatement.setTimestamp(6, new Timestamp(a.getDatasetTimestamp()));
      preparedStatement.setString(7, a.getTraceId());
      preparedStatement.setArray(8, NativeQueryHelper.toArray(db, a.getTags()));
      preparedStatement.addBatch();
    }
    preparedStatement.executeBatch();
  }

  @SneakyThrows
  private String segmentTagsToJson(List<SegmentTag> segmentTags) {
    List<String> tags = new ArrayList<>();
    if (segmentTags != null) {
      for (val t : segmentTags) {
        String tagKV = t.getKey() + "=" + t.getValue();
        tags.add(tagKV);
      }

      return mapper.writeValueAsString(tags);
    }
    return null;
  }

  @SneakyThrows
  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public DebugEventResponse getDebugEvents(ListDebugEventsRequest request) {
    val interval = request.getInterval();

    String sql = querySql;
    if (request.getSegmentTags() != null) {
      sql = querySegmentedSql;
    }
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(sql);
    String segmentTagsJson = SegmentUtils.toQueryableJson(request.getSegmentTags());

    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetId", request.getDatasetId());
    query.setParameter("traceId", request.getTraceId());
    query.setParameter(
        "startTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("endTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));

    if (request.getSegmentTags() != null) {
      query.setParameter("querySegments", segmentTagsJson);
    }
    // request one additional row to detect more results available
    query.setParameter("limit", request.getLimit() + 1);
    query.setParameter("offset", request.getOffset());

    val rows = query.getResultList();
    List<DebugEvent> events = new ArrayList<>();
    int maxRows = min(request.getLimit(), rows.size());
    for (int i = 0; i < maxRows; i++) {
      val o = (Object[]) rows.get(i);

      val builder =
          DebugEvent.builder()
              .content((String) o[0])
              .segmentTags(fromSegmentJson((String) o[1]))
              .creationTimestamp(((Timestamp) o[2]).toInstant().toEpochMilli())
              .datasetTimestamp(((Timestamp) o[3]).toInstant().toEpochMilli())
              .traceId((String) o[4]);
      if (o[5] != null) {
        // Arrays.asList parameter is @NonNull
        builder.tags(Arrays.asList((String[]) o[5]));
      }
      builder.build();
      events.add(builder.build());
    }

    return DebugEventResponse.builder()
        .isTruncated(rows.size() > request.getLimit())
        .nextOffset((request.getOffset() + maxRows))
        .events(events)
        .build();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public QueryDebugEventsResponse query(QueryDebugEventsRequest request) {
    String sqlQuery =
        querySqlV2.replace("order by creation_timestamp desc", request.orderByClause());
    val query = (NativeQueryImpl<?>) roEntityManager.createNativeQuery(sqlQuery);
    request.createQuery(query);

    val r = query.getResultList();

    List<DebugEvent> entries =
        r.stream() //
            .map(DebugEvent::fromRow) //
            .filter(Objects::nonNull) //
            .collect(Collectors.toList());

    Integer nextOffset = null;
    int maxPageSize = request.getEffectiveMaxPageSize();
    // important to use the raw result size rather than the entries list since we filter out null
    // entries
    if (r.size() > maxPageSize) {
      entries = entries.subList(0, maxPageSize);
      nextOffset = Optional.ofNullable(request.getStartOffset()).orElse(0) + maxPageSize;
    }
    return QueryDebugEventsResponse.builder() //
        .events(entries) //
        .nextOffset(nextOffset) //
        .isTruncated(nextOffset != null) //
        .build();
  }

  List<SegmentTag> fromSegmentJson(String json) throws JsonProcessingException {
    if (json == null) {
      return null;
    }
    val tags = mapper.readValue(json, List.class);
    List<Tag> tagset = SegmentUtils.parseTagsV3(tags);
    List<SegmentTag> results = new ArrayList<>();
    for (val t : tagset) {
      results.add(SegmentTag.builder().key(t.getKey()).value(t.getValue()).build());
    }
    return results;
  }
}
