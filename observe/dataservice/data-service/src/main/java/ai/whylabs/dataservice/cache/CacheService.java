package ai.whylabs.dataservice.cache;

import ai.whylabs.dataservice.requests.BaseRequest;
import ai.whylabs.dataservice.util.MicronautUtil;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.io.Readable;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.scheduling.annotation.Async;
import jakarta.inject.Inject;
import javax.inject.Singleton;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@JdbcRepository(dialect = Dialect.POSTGRES)
public class CacheService {

  @Inject private DataSource dataSource;

  @Inject private ObjectMapper mapper;

  @Inject private MeterRegistry meterRegistry;

  private String stalenessQuery;
  private HashFunction hashFunction;

  @SneakyThrows
  public CacheService(@Value("${sql-files.profile-staleness-query}") Readable staleness) {
    stalenessQuery = MicronautUtil.getStringFromReadable(staleness);
    hashFunction = Hashing.sha256();
  }

  @Transactional
  @Executable
  @Async("indexer") // Best effort and that's ok for a cache write
  public void write(BaseRequest request, Object response, String endpoint) {
    // Disabling cache until we get to the bottom of why we get stale requests
    /*

    if (CacheStrategy.skipCache(request)) {
      return;
    }

    try {
      @Cleanup Connection db = dataSource.getConnection();
      String insert =
          "INSERT INTO whylabs.cache "
              + "(org_id, dataset_id, endpoint, cache_key, updated_ts, content)"
              + "VALUES (?,?,?,?,?::timestamptz,?)"
              + "ON CONFLICT (cache_key) DO UPDATE set\n"
              + "            updated_ts = excluded.updated_ts::timestamptz, \n"
              + "                    content = excluded.content";

      val pst = db.prepareStatement(insert);
      pst.setString(1, request.getOrgId());
      pst.setString(2, request.getDatasetId());
      pst.setString(3, endpoint);
      pst.setString(4, hash(request, endpoint));
      pst.setTimestamp(5, Timestamp.from(Instant.now()));
      pst.setString(6, mapper.writeValueAsString(response));
      pst.executeUpdate();
      meterRegistry.counter("whylabs.cache.query.write").count();

    } catch (SQLException | JsonProcessingException e) {
      log.error("Error updating the cache for request {}", e, request);
    }*/
  }

  @Transactional
  @Executable
  public <T> T check(BaseRequest request, String endpoint) {
    return null;
    // Disabling until we get to the bottom of stale cache hits
    /*

    if (CacheStrategy.skipCache(request)) {
      return null;
    }

    try {
      @Cleanup Connection db = dataSource.getConnection();
      String select =
          "select content, org_id, dataset_id, updated_ts from whylabs.cache where cache_key = ? limit 1";
      val pst = db.prepareStatement(select);
      val h = hash(request, endpoint);
      pst.setObject(1, h, Types.OTHER);

      val result = pst.executeQuery();

      if (!result.next()) {
        meterRegistry.counter("whylabs.cache.query.miss").count();
        return null;
      }
      meterRegistry.counter("whylabs.cache.query.hit").count();
      String json = result.getString(1);
      String orgId = result.getString(2);
      String datasetId = result.getString(3);
      val cacheWritten = result.getTimestamp(4);

      // Sanity checks
      if (!request.getDatasetId().equals(datasetId)) {
        log.warn(
            "datasetId did to match as cached. Hash collision?. Req {} Cached datasetId {} Cache Key {}",
            request.getDatasetId(),
            datasetId,
            h);
        return null;
      }

      if (!request.getOrgId().equals(orgId)) {
        log.warn(
            "orgId did to match as cached. Hash collision?. Req {} Cached orgId {} Cache Key {}",
            request.getOrgId(),
            orgId,
            h);
        return null;
      }

      // Check tags table to see if the cache was based on stale data
      val tag = db.prepareStatement(stalenessQuery);
      tag.setString(1, request.getOrgId());
      tag.setString(2, request.getDatasetId());
      tag.setString(3, request.getOrgId());
      tag.setString(4, request.getDatasetId());
      val tagResult = tag.executeQuery();
      if (tagResult.next()) {
        val mostRecentUpload = tagResult.getTimestamp(1);
        if (mostRecentUpload != null && cacheWritten.getTime() < mostRecentUpload.getTime()) {
          // Cache is more than 10s older than data uploaded, avoid returning stale data
          meterRegistry.counter("whylabs.cache.query.too_stale").count();
          return null;
        }
      }

      return mapper.readValue(json, new TypeReference<T>() {});
    } catch (SQLException | JsonProcessingException e) {
      log.error("Error retrieving cache for request {}", e, request);
      return null;
    }*/
  }

  private String hash(BaseRequest request, String endpoint) throws JsonProcessingException {
    return DruidStringUtils.encodeBase64String(
        hashFunction
            .newHasher()
            .putUnencodedChars(mapper.writeValueAsString(request))
            .putUnencodedChars(endpoint)
            .hash()
            .asBytes());
  }
}
