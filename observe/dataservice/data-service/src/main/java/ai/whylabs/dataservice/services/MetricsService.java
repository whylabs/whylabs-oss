package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.requests.MaxIORequest;
import ai.whylabs.dataservice.requests.MaxIoSegmentedRequest;
import ai.whylabs.dataservice.responses.MaxIORow;
import ai.whylabs.dataservice.responses.MaxIORowSegmented;
import ai.whylabs.dataservice.strategies.ProfileTableResolutionStrategy;
import ai.whylabs.dataservice.util.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Inject;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
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
import org.apache.commons.io.IOUtils;
import org.hibernate.query.internal.NativeQueryImpl;
import org.joda.time.Interval;

@Slf4j
@Singleton
@JdbcRepository(dialect = Dialect.POSTGRES)
public abstract class MetricsService {

  @PersistenceContext(name = DatasourceConstants.BULK)
  private EntityManager rwEntityManager;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  @Inject private DataSource dataSource;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private ObjectMapper mapper;

  private static final String maxIOSql;
  private static final String maxIOSegmentedSql;
  private static final String maxIOSegmentedCacheHydrateSql;
  private static final String maxIOSegmentedCacheHitSql;
  @Inject private ProfileTableResolutionStrategy profileTableResolutionStrategy;

  static {
    try {
      maxIOSql =
          IOUtils.resourceToString("/sql/maxio.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
      maxIOSegmentedSql =
          IOUtils.resourceToString("/sql/maxio-segmented.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
      maxIOSegmentedCacheHydrateSql =
          IOUtils.resourceToString("/sql/maxio-segmented-cache-hydrate.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
      maxIOSegmentedCacheHitSql =
          IOUtils.resourceToString("/sql/maxio-segmented-cache-hit.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public MetricsService() throws IOException {}

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<MaxIORow> queryMaxIO(MaxIORequest rqst) {
    if (rqst.getSegment() != null && rqst.getSegment().size() > 0) {
      // Segmented
      String q =
          maxIOSegmentedSql.replace(
                  "whylabs." + ProfileService.PROFILES_OVERALL_VIEW,
                  profileTableResolutionStrategy.getTable(
                      rqst.getSegment(),
                      null,
                      rqst.getGranularity(),
                      rqst.getOrgId(),
                      rqst.getDatasetId()))
              + "\n"
              + rqst.getOrder().name();
      val segment = Optional.ofNullable(rqst.getSegment()).orElse(new ArrayList<>());
      val segmentTags =
          segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
      val query = (NativeQueryImpl<MaxIORow>) roEntityManager.createNativeQuery(q, MaxIORow.class);
      PostgresUtil.setStandardTimeout(query);
      maxIoSub(rqst, query);
      query.setParameter("segmentTags", segmentTags, StringArrayType.INSTANCE);
      return query.getResultList();
    } else {
      // Overall
      String q =
          maxIOSql.replace(
                  "whylabs." + ProfileService.PROFILES_OVERALL_VIEW,
                  profileTableResolutionStrategy.getTable(
                      rqst.getSegment(),
                      null,
                      rqst.getGranularity(),
                      rqst.getOrgId(),
                      rqst.getDatasetId()))
              + "\n"
              + rqst.getOrder().name();

      val query = (NativeQueryImpl<MaxIORow>) roEntityManager.createNativeQuery(q, MaxIORow.class);
      maxIoSub(rqst, query);
      return query.getResultList();
    }
  }

  @Async("render-hydration")
  public void maxIoSegmentedHydrateCacheAllData(List<MaxIoSegmentedRequest> requests, int weeks) {
    for (val request : requests) {
      ZonedDateTime end = ZonedDateTime.now().truncatedTo(ChronoUnit.DAYS).plus(1, ChronoUnit.DAYS);
      ZonedDateTime start = end.minusDays(1);

      val time = System.currentTimeMillis();
      for (int offset = 0; offset < weeks * 7; offset++) {
        start = start.minusDays(1);
        end = end.minusDays(1);
        Interval i = new Interval(start.toInstant().toEpochMilli(), end.toInstant().toEpochMilli());

        request.setInterval(i);
        log.info(
            "Rendering segmented maxio {} {} {}", request.getOrgId(), request.getDatasetId(), i);
        maxIoSegmentedHydrateCache(request);
      }

      log.info(
          "Rendering segmented maxio {} {} done. Took {}s",
          request.getOrgId(),
          request.getDatasetId(),
          (System.currentTimeMillis() - time) / 1000);
    }
    log.info("maxIoSegmentedHydrateCacheAllData has finished");
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  public void maxIoSegmentedHydrateCache(MaxIoSegmentedRequest rqst) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    // Obtain dataset upsert lock to avoid contention with other processes like data promotion
    @Cleanup
    val pst =
        db.prepareStatement(
            ConcurrencyUtils.getLockSql(
                rqst.getOrgId(), rqst.getDatasetId(), ConcurrencyUtils.Scope.segmented));
    pst.executeQuery();

    val query = db.prepareStatement(maxIOSegmentedCacheHydrateSql);
    query.setQueryTimeout(36000);
    val interval = rqst.getInterval();
    query.setString(1, rqst.getGranularity().asSQL());
    query.setArray(2, NativeQueryHelper.toArray(db, rqst.getOutputColumns()));
    query.setString(3, rqst.getOrgId());
    query.setString(4, rqst.getDatasetId());
    query.setTimestamp(5, new Timestamp(interval.getStartMillis()));
    query.setTimestamp(6, new Timestamp(interval.getEndMillis()));
    query.setString(7, rqst.getOrgId());
    query.setString(8, rqst.getDatasetId());
    query.executeUpdate();
  }

  private String fromRequest(MaxIoSegmentedRequest rqst) throws JsonProcessingException {
    List<List<String>> segments = new ArrayList<>();
    for (val seg : rqst.getSegments()) {
      val segmentTags =
          seg.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
      segments.add(Arrays.asList(segmentTags));
    }

    return mapper.writeValueAsString(segments);
  }

  public void populateSegmentedIoQueryParams(MaxIoSegmentedRequest rqst, NativeQueryImpl<?> query) {
    val interval = rqst.getInterval();
    val start = java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis()));
    val end = java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis()));
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter("startTS", start);
    query.setParameter("endTS", end);
    query.setParameter("granularity", rqst.getGranularity().asSQL());
    query.setParameter("outputColumns", rqst.getOutputColumns(), StringArrayType.INSTANCE);
  }

  private List<MaxIORowSegmented> parseSegmentedMaxiResults(NativeQueryImpl query)
      throws JsonProcessingException {
    List<MaxIORowSegmented> results = new ArrayList<>();

    val resultSet = query.getResultList();

    for (val result : resultSet) {
      val oa = (Object[]) result;

      val tags = mapper.readValue(((String) oa[4]), List.class);
      val tagset = SegmentUtils.parseTagsV3(tags);

      results.add(
          MaxIORowSegmented.builder()
              .id(((BigInteger) oa[0]).intValue())
              .timestamp(((BigDecimal) oa[1]).longValue())
              .isOutput(((Boolean) oa[2]))
              .maxCount(((BigDecimal) oa[3]).longValue())
              .tags(tagset)
              .build());
    }

    return results;
  }

  // For a notebook-ish example of how this works see segmented_maxIo_testing.sql
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<MaxIORowSegmented> queryMaxIOSegmented(MaxIoSegmentedRequest rqst) {

    // Aggregate all segments
    val query = (NativeQueryImpl<?>) roEntityManager.createNativeQuery(maxIOSegmentedSql);
    PostgresUtil.setStandardTimeout(query);
    populateSegmentedIoQueryParams(rqst, query);
    query.setParameter("querySegments", fromRequest(rqst));
    return parseSegmentedMaxiResults(query);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<MaxIORowSegmented> queryMaxIOSegmentedCacheTable(MaxIoSegmentedRequest rqst) {

    // Aggregate all segments
    val query = (NativeQueryImpl<?>) roEntityManager.createNativeQuery(maxIOSegmentedCacheHitSql);
    PostgresUtil.setStandardTimeout(query);
    populateSegmentedIoQueryParams(rqst, query);
    query.setParameter("querySegments", fromRequest(rqst));
    return parseSegmentedMaxiResults(query);
  }

  private void maxIoSub(MaxIORequest rqst, NativeQueryImpl<MaxIORow> query) {
    val interval = rqst.getInterval();
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter(
        "startTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("endTS", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    query.setParameter("granularity", rqst.getGranularity().asSQL());
    query.setParameter("outputColumns", rqst.getOutputColumns(), StringArrayType.INSTANCE);
  }
}
