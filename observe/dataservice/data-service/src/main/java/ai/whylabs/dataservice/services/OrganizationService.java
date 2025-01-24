package ai.whylabs.dataservice.services;

import ai.whylabs.core.enums.IngestionRollupGranularity;
import ai.whylabs.core.structures.Org;
import ai.whylabs.core.utils.Constants;
import ai.whylabs.dataservice.requests.ResourceTag;
import ai.whylabs.dataservice.requests.ResourceTagConfigEntry;
import ai.whylabs.dataservice.requests.ResourceTagConfiguration;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.MicronautUtil;
import ai.whylabs.dataservice.util.NativeQueryHelper;
import ai.whylabs.dataservice.util.PostgresUtil;
import com.amazonaws.services.s3.AmazonS3;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.collect.Lists;
import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Property;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.io.Readable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.PageableRepository;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Types;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
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
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
public abstract class OrganizationService implements PageableRepository<Org, Integer> {

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  @jakarta.inject.Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource dataSource;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private ObjectMapper mapper;

  @Inject private AmazonS3 s3;

  @Property(name = "whylabs.dataservice.songbirdBucket")
  private String songbirdBucket;

  private String orgInsert;

  private String orgResourceTagUpsert;

  public OrganizationService(
      @Value("${sql-files.org-insert}") Readable orgInsert,
      @Value("${sql-files.org-resource-tag-upsert}") Readable orgResourceTagUpsert)
      throws IOException {
    this.orgInsert = MicronautUtil.getStringFromReadable(orgInsert).replace("?&", "\\?\\?&");
    this.orgResourceTagUpsert =
        MicronautUtil.getStringFromReadable(orgResourceTagUpsert).replace("?&", "\\?\\?&");
  }

  private static final Cache<String, Boolean> GRANULAR_DATA_ENABLED_CACHE =
      CacheBuilder.newBuilder().maximumSize(1000).expireAfterWrite(10, TimeUnit.MINUTES).build();
  private static final Cache<String, IngestionRollupGranularity> INGESTION_ROLLUP_GRANULARITY =
      CacheBuilder.newBuilder().maximumSize(1000).expireAfterWrite(10, TimeUnit.MINUTES).build();

  public void purgeCache() {
    GRANULAR_DATA_ENABLED_CACHE.invalidateAll();
    INGESTION_ROLLUP_GRANULARITY.invalidateAll();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public Org persist(Org org) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement preparedStatement = db.prepareStatement(orgInsert);
    preparedStatement.setString(1, org.getOrgId());
    preparedStatement.setObject(2, org.getDataRetentionDays());
    preparedStatement.setObject(3, org.getEnableGranularDataStorage());
    preparedStatement.setObject(4, org.getIngestionGranularity(), Types.VARCHAR);
    val r = preparedStatement.executeQuery();
    r.next();
    org.setId(r.getInt(1));
    return org;
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public Optional<Org> getByOrgId(@NotNull String orgId) {
    try {
      String q = "select * from whylabs.orgs where org_id = :orgId";
      val query = (NativeQueryImpl<Org>) roEntityManager.createNativeQuery(q, Org.class);
      PostgresUtil.setStandardTimeout(query);
      query.setParameter("orgId", orgId);
      val l = query.getResultList();
      if (l.size() < 1) {
        return Optional.empty();
      }
      if (l.size() > 1) {
        log.error("Multiple orgs found for orgId in whylabs.orgs: {}", orgId);
      }
      return Optional.of(l.get(0));
    } catch (Exception e) {
      log.error("Error retrieving org info: {}", orgId, e);
      return Optional.empty();
    }
  }

  /**
   * Feature check to see if this org gets unmerged levels of data storage. This is cached for
   * frequent access as it is part of the ingestion flow and will likely also get hit a lot by the
   * ui.
   */
  public boolean granularDataStorageEnabledCached(String orgId) {
    try {
      return GRANULAR_DATA_ENABLED_CACHE.get(
          orgId,
          () ->
              getByOrgId(orgId) //
                  .map(Org::getEnableGranularDataStorage) //
                  .orElse(false));
    } catch (ExecutionException e) {
      log.info("Error retrieving org " + orgId, e);
      return false;
    }
  }

  public IngestionRollupGranularity getIngestionRollupGranularityCached(String orgId) {
    try {
      return INGESTION_ROLLUP_GRANULARITY.get(
          orgId,
          () ->
              getByOrgId(orgId) //
                  .map(Org::getIngestionGranularity) //
                  .orElse(IngestionRollupGranularity.hourly));
    } catch (ExecutionException e) {
      log.error("Error retrieving org " + orgId, e);
      return IngestionRollupGranularity.hourly;
    }
  }

  /**
   * We need org level configs in S3 so EMR can scoop it up without having the networking in place
   * to reach out to dataservice for it. Being a small amount of data, we just dump it in a single
   * thread.
   */
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public void dumpOrgTableToS3() {
    String q = "select * from whylabs.orgs limit 10000";
    val query = (NativeQueryImpl<Org>) roEntityManager.createNativeQuery(q, Org.class);

    val tempFile = "/tmp/orgdump.json";
    PrintWriter writer = new PrintWriter("/tmp/orgdump.json", "UTF-8");
    for (val r : query.getResultList()) {
      writer.println(mapper.writeValueAsString(r));
    }

    writer.close();
    s3.putObject(songbirdBucket, Constants.ORG_CONFIG_SONGBIRD_PATH, new File(tempFile));
  }

  @Async
  public void applyDataRetentionAsync(String orgId, Integer days) {
    applyDataRetention(orgId, days);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void applyDataRetention(String orgId, Integer days) {
    @Cleanup val conn = bulkDatasource.getConnection();
    @Cleanup
    val pst =
        conn.prepareStatement(
            "delete from whylabs.profiles_segmented_hypertable where dataset_timestamp > cast(to_timestamp(?) as date) and dataset_timestamp <= cast(to_timestamp(?) as date)");
    @Cleanup
    val pst2 =
        conn.prepareStatement(
            "delete from whylabs.profiles_overall_hypertable where dataset_timestamp > cast(to_timestamp(?) as date) and dataset_timestamp <= cast(to_timestamp(?) as date)");

    ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.DAYS);
    // Delete one day of data at a time so we have small transactions
    for (int i = days; i < 5 * 365; i++) {
      val start = now.minusDays(i + 1);
      val end = now.minusDays(i);
      pst.setLong(1, start.toEpochSecond());
      pst.setLong(2, end.toEpochSecond());
      pst.executeUpdate();
      pst2.setLong(1, start.toEpochSecond());
      pst2.setLong(2, end.toEpochSecond());
      pst2.executeUpdate();
    }
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void upsertOrgResourceTagConfiguration(String orgId, ResourceTagConfiguration config) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement preparedStatement = db.prepareStatement(orgResourceTagUpsert);
    preparedStatement.setString(1, orgId);
    for (val entry : config.getTags().entrySet()) {
      val validValues =
          entry.getValue().getValues().stream()
              .filter(el -> el != null && !el.equals(ResourceTagConfiguration.LABEL_TAG_KEY))
              .collect(Collectors.toList());
      if (validValues.size() == 0) continue;
      preparedStatement.setString(2, entry.getKey());
      preparedStatement.setArray(3, NativeQueryHelper.toArray(db, validValues));
      preparedStatement.setString(4, entry.getValue().getColor());
      preparedStatement.setString(5, entry.getValue().getBgColor());
      preparedStatement.addBatch();
    }
    preparedStatement.executeBatch();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void removeOrgResourceTagConfigurationKeys(String orgId, Set<String> keys) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement preparedStatement =
        db.prepareStatement(
            "delete from whylabs.org_resource_tags where org_id = ? and tag_key = ?");

    for (String key : keys) {
      preparedStatement.setString(1, orgId);
      preparedStatement.setString(2, key);
      preparedStatement.addBatch();
    }

    preparedStatement.executeBatch();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public ResourceTagConfiguration getOrganizationResourceTags(String orgId) {
    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup
    PreparedStatement preparedStatement =
        db.prepareStatement(
            "select tag_key, tag_values, tag_color, tag_bgcolor from whylabs.org_resource_tags where org_id = ?");
    preparedStatement.setString(1, orgId);
    val r = preparedStatement.executeQuery();
    val resourceTagConfiguration = ResourceTagConfiguration.builder();
    val tags = new HashMap<String, ResourceTagConfigEntry>();
    val labels = new ArrayList<String>();
    while (r.next()) {
      val tagKey = r.getString(1);
      val tagValues = Lists.newArrayList((String[]) r.getArray(2).getArray());
      val tagColor = r.getString(3);
      val tagBgColor = r.getString(4);
      if (tagKey.equals(ResourceTagConfiguration.LABEL_TAG_KEY)) {
        labels.addAll(tagValues);
      } else {
        tags.put(
            tagKey,
            ResourceTagConfigEntry.builder()
                .values(tagValues)
                .color(tagColor)
                .bgColor(tagBgColor)
                .build());
      }
    }
    resourceTagConfiguration.tags(tags).labels(labels);
    return resourceTagConfiguration.build();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public List<ResourceTag> getActiveOrganizationResourceTags(String orgId) {
    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup
    PreparedStatement preparedStatement =
        db.prepareStatement(
            "select distinct tag_key, tag_value from whylabs.resource_tags where org_id = ?");
    preparedStatement.setString(1, orgId);
    val r = preparedStatement.executeQuery();
    val tags = new ArrayList<ResourceTag>();
    while (r.next()) {
      tags.add(
          ResourceTag.builder().orgId(orgId).key(r.getString(1)).value(r.getString(2)).build());
    }
    return tags;
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void deleteActiveOrganizationResourceTags(String orgId, List<ResourceTag> resourceTags) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement preparedStatement =
        db.prepareStatement(
            "delete from whylabs.resource_tags where org_id = ? and tag_key = ? and tag_value = ?");

    for (ResourceTag tag : resourceTags) {
      preparedStatement.setString(1, orgId);
      preparedStatement.setString(2, tag.getKey());
      preparedStatement.setString(3, tag.getValue());
      preparedStatement.addBatch();
    }

    preparedStatement.executeBatch();
  }
}
