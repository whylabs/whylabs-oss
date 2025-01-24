package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.enums.SegmentRequestScope;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.responses.SegmentsRow;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.PostgresUtil;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.hibernate.query.internal.NativeQueryImpl;
import org.joda.time.Interval;

@Slf4j
@Singleton
@JdbcRepository(dialect = Dialect.POSTGRES)
public abstract class ModelService {

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource roDatasource;

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public ZonedDateTime getMostRecentUploadTimestamp(
      String orgId, String datasetId, Interval interval) {
    String sql =
        "select max(coalesce(last_updated_ts, ingest_timestamp)) from whylabs.profile_upload_audit where org_id = ? AND dataset_id = ?"
            + "and dataset_timestamp >= ? and dataset_timestamp < ?";
    @Cleanup Connection db = roDatasource.getConnection();
    @Cleanup PreparedStatement timeseries = db.prepareStatement(sql);
    timeseries.setString(1, orgId);
    timeseries.setString(2, datasetId);
    timeseries.setTimestamp(3, new Timestamp(interval.getStart().toInstant().getMillis()));
    timeseries.setTimestamp(4, new Timestamp(interval.getEnd().toInstant().getMillis()));
    val r = timeseries.executeQuery();
    while (r.next()) {
      val t = r.getTimestamp(1);
      if (t == null) {
        return null;
      }
      return ZonedDateTime.ofInstant(
          Instant.ofEpochMilli(t.toInstant().toEpochMilli()), ZoneOffset.UTC);
    }
    return null;
  }

  /**
   * @param orgId
   * @param datasetId
   * @param includeHidden includes segments that have been previously marked hidden.
   * @param scope determines whether to include reference profiles or not.
   * @param filter includes only segments with matching tag-value pairs in the results.
   * @return list of stringified segment tags separated by '&', e.g. \
   *     ["purpose=car&verification=Not Verified", "purpose=car&verification=Verified"]
   */
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<String> getSegments(
      String orgId,
      String datasetId,
      boolean includeHidden,
      SegmentRequestScope scope,
      List<SegmentTag> filter) {
    String table = "whylabs.legacy_segments_visible";
    if (includeHidden) {
      table = "whylabs.legacy_segments";
    }

    // filter includes only matching segments
    String sqlFilter =
        " AND (\n"
            + "        (:segmentTags = CAST('{}' as text[]))\n"
            + "        OR\n"
            + "        (segment_text \\?\\?& :segmentTags))\n";

    List<String> selectSources = new ArrayList<>();
    String selectTimeseries =
        "SELECT DISTINCT to_jsonb(segment_text) as segment\n"
            + "                  from "
            + table
            + "                  WHERE org_id = :orgId\n"
            + "                    AND dataset_id = :datasetId\n"
            + sqlFilter
            + "                    AND segment_text ->> 0 is not null";
    String selectRefProfiles =
        "SELECT DISTINCT to_jsonb(segment_text) as segment\n"
            + "                  from whylabs.reference_profiles"
            + "                  WHERE org_id = :orgId\n"
            + "                    AND dataset_id = :datasetId\n"
            + sqlFilter
            + "                    AND segment_text ->> 0 is not null";
    switch (scope) {
      case TIMESERIES:
        selectSources.add(selectTimeseries);
        break;
      case REFERENCE_PROFILE:
        selectSources.add(selectRefProfiles);
        break;
      case BOTH:
        selectSources.add(selectTimeseries);
        selectSources.add(selectRefProfiles);
        break;
      default:
        throw new IllegalArgumentException("Unsupported scope " + scope);
    }

    final String timeSeriesSql =
        "WITH all_tags as ("
            + StringUtils.join(selectSources, " union ")
            + "),\n"
            + "\n"
            + "     ordered_tags as (SELECT DISTINCT ARRAY(SELECT jsonb_array_elements_text(segment) ORDER BY 1 asc) as segment\n"
            + "                      FROM all_tags)\n"
            + "\n"
            + "select row_number() OVER () AS id, segment\n"
            + "from ordered_tags;";

    val segment = Optional.ofNullable(filter).orElse(new ArrayList<SegmentTag>());
    val segmentTags =
        segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
    val query =
        (NativeQueryImpl<SegmentsRow>)
            roEntityManager.createNativeQuery(timeSeriesSql, SegmentsRow.class);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", orgId);
    query.setParameter("datasetId", datasetId);
    query.setParameter("segmentTags", segmentTags, StringArrayType.INSTANCE);

    return query
        .getResultStream()
        .map(sr -> String.join("&", sr.getSegment()))
        .collect(Collectors.toList());
    // returns a list of stringified segment tags:
    //   ["purpose=car&verification_status=Not Verified",
    //    "purpose=car&verification_status=Source Verified"]
  }
}
