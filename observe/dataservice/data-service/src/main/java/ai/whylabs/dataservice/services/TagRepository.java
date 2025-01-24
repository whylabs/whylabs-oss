package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.requests.TimeBoundaryQuery;
import ai.whylabs.dataservice.responses.TimeBoundaryResponse;
import ai.whylabs.dataservice.responses.TimeBoundaryResponseRow;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.PostgresUtil;
import io.micronaut.data.annotation.Repository;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.sql.*;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.hibernate.query.internal.NativeQueryImpl;

@Repository
@Slf4j
public abstract class TagRepository {

  public static final long MINIMUM_START_TIME =
      ZonedDateTime.of(2010, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC).toInstant().toEpochMilli();

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager entityManager;

  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Transactional
  public TimeBoundaryResponse timeBoundary(TimeBoundaryQuery timeBoundaryQuery) {

    StringBuilder sb =
        new StringBuilder(
            "SELECT date_trunc(:granularity, min(oldest_dataset_timestamp) AT TIME ZONE 'UTC') as min, "
                + " date_trunc('hour', max(latest_dataset_timestamp) AT TIME ZONE 'UTC') as max, "
                + " dataset_id "
                + " FROM whylabs.tags "
                + " WHERE org_id = :orgId AND dataset_id in (:datasetIds) ");
    if (timeBoundaryQuery.getSegment() != null
        && timeBoundaryQuery.getSegment().size() > 0
        && !StringUtils.isEmpty(timeBoundaryQuery.getSegment().get(0).getKey())) {
      List<String> tagExpressions = new ArrayList<>();
      for (int x = 0; x < timeBoundaryQuery.getSegment().size(); x++) {
        tagExpressions.add("(tag_key = :key" + x + " and tag_value = :val" + x + ")");
      }
      sb.append(" and (").append(StringUtils.join(tagExpressions, " or ")).append(")");
    }

    sb.append(" GROUP BY dataset_id");

    val query = (NativeQueryImpl<?>) entityManager.createNativeQuery(sb.toString());
    PostgresUtil.setStandardTimeout(query);
    var granularity = timeBoundaryQuery.getGranularity();
    if (granularity == null) {
      granularity = DataGranularity.hourly;
    }
    query.setParameter("granularity", granularity.asSQL());
    query.setParameter("orgId", timeBoundaryQuery.getOrgId());
    query.setParameter("datasetIds", timeBoundaryQuery.getDatasetIds());
    if (timeBoundaryQuery.getSegment() != null
        && timeBoundaryQuery.getSegment().size() > 0
        && !StringUtils.isEmpty(timeBoundaryQuery.getSegment().get(0).getKey())) {
      for (int x = 0; x < timeBoundaryQuery.getSegment().size(); x++) {
        query.setParameter("key" + x, timeBoundaryQuery.getSegment().get(x).getKey());
        query.setParameter("val" + x, timeBoundaryQuery.getSegment().get(x).getValue());
      }
    }
    val r = query.getResultList();

    List<TimeBoundaryResponseRow> rows = new ArrayList<>(r.size());
    for (val row : r) {
      long startTime = ((Timestamp) ((Object[]) row)[0]).toInstant().toEpochMilli();
      // we always limit the start time to 2010u
      long truncatedStartTime = Math.max(startTime, MINIMUM_START_TIME);
      rows.add(
          TimeBoundaryResponseRow.builder()
              .start(truncatedStartTime)
              .end(((Timestamp) ((Object[]) row)[1]).toInstant().toEpochMilli())
              .datasetId((String) ((Object[]) row)[2])
              .build());
    }

    return TimeBoundaryResponse.builder().rows(rows).build();
  }
}
