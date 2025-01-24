package ai.whylabs.dataservice.services;

import ai.whylabs.core.structures.Org;
import ai.whylabs.dataservice.requests.ResourceTag;
import ai.whylabs.dataservice.responses.LoopedDatasetResponse;
import ai.whylabs.dataservice.responses.LoopeddataResponseRow;
import ai.whylabs.dataservice.structures.Dataset;
import ai.whylabs.dataservice.structures.KeyValueTag;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.ingestion.S3ClientFactory;
import com.amazonaws.services.s3.AmazonS3URI;
import com.amazonaws.services.s3.model.ObjectListing;
import com.amazonaws.services.s3.model.S3ObjectSummary;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.collect.Lists;
import com.google.gson.Gson;
import com.google.gson.JsonParser;
import io.micronaut.context.annotation.Executable;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Inject;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.zip.GZIPInputStream;
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
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class DatasetService {

  /**
   * Bad upload patterns like failure to re-use the logger can create 100k+ profiles in short order.
   * Revoke staging table access if there's been this many profiles uploaded recently.
   */
  private static long STAGING_ACCESS_RECENT_UPLOAD_THRESHOLD = 10000;

  /**
   * Highly segmented datasets aren't appropriate to be queried pre-rollup as it has to do that
   * rollup at query time. Don't allow staging table access once they've exceeded this many
   * segments.
   */
  private static long STAGING_ACCESS_SEGMENTED_THRESHOLD = 200;

  private static final Cache<String, Long> RECENT_PROFILE_UPLOAD_COUNT_CACHE =
      CacheBuilder.newBuilder().maximumSize(100000).expireAfterWrite(5, TimeUnit.MINUTES).build();
  private static final Cache<String, Long> SEGMENT_COUNT_COUNT_CACHE =
      CacheBuilder.newBuilder().maximumSize(100000).expireAfterWrite(5, TimeUnit.MINUTES).build();
  private static final Cache<String, Dataset> DATASET_CACHE =
      CacheBuilder.newBuilder().maximumSize(100000).expireAfterWrite(5, TimeUnit.MINUTES).build();

  private static final Gson GSON = new Gson();

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource dataSource;

  @PersistenceContext private EntityManager entityManager;

  @Inject private OrganizationService organizationService;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  private static final String datasetInsertSql;
  private static final String datasetListSql;
  private static final String resourceTagsInsertSql;

  static {
    try {
      datasetInsertSql =
          IOUtils.resourceToString("/sql/dataset-insert.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
      datasetListSql = IOUtils.resourceToString("/sql/dataset-list.sql", StandardCharsets.UTF_8);
      resourceTagsInsertSql =
          IOUtils.resourceToString("/sql/resource-tags-insert.sql", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public void adjustStagingAccessThreshold(long n) {
    STAGING_ACCESS_RECENT_UPLOAD_THRESHOLD = n;
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public long countSegments(@NotNull String orgId, @NotNull String datasetId) {
    @Cleanup Connection db = dataSource.getConnection();

    String q =
        "select count(segment_text) as c from whylabs.legacy_segments where org_id = ? and dataset_id = ?";
    @Cleanup val query = db.prepareStatement(q);
    query.setString(1, orgId);
    query.setString(2, datasetId);
    query.execute();
    val resultSet = query.getResultSet();
    if (resultSet != null) {
      while (resultSet.next()) {
        return resultSet.getLong(1);
      }
    }
    return 0l;
  }

  /**
   * How to create the dump location. Open AWS console
   *
   * <p>DynamoDB>Tables>development-songbird-MetadataTable-df098b7>Exports And Streams Hit [Export
   * To S3] and pick the deltalake bucket. It'll create a unique key prefix. The path to the dump is
   * passed in here and will look like
   * `s3://development-deltalake-20210520193724829400000001/AWSDynamoDB/01727117222085-7a0df1d8/data`
   *
   * <p>At first I tried using athena to access this, but it just turned into an IAM nightmare. Its
   * something we may only bother doing a couple times a year so its not bad as a playbook.
   *
   * @param dumpLocation
   */
  @SneakyThrows
  @Async
  public void populateOrgDatasetTables(String dumpLocation, Boolean justCreationTime) {
    if (dumpLocation.endsWith(".json.gz")) {
      processSingleFile(dumpLocation, justCreationTime);
    } else {
      // Its a dir, list all the files and work from there
      AmazonS3URI s3URI = new AmazonS3URI(dumpLocation);
      val client = S3ClientFactory.getS3Client();
      ObjectListing listing = client.listObjects(s3URI.getBucket(), s3URI.getKey());
      List<S3ObjectSummary> summaries = listing.getObjectSummaries();
      while (listing.isTruncated()) {
        listing = client.listNextBatchOfObjects(listing);
        summaries.addAll(listing.getObjectSummaries());
      }
      log.info("Backfilling dataset table from {} files", summaries.size());
      for (val o : summaries) {
        String path = "s3://" + o.getBucketName() + "/" + o.getKey();
        processSingleFile(path, justCreationTime);
      }
    }
    log.info("Dataset table backfilled");
  }

  @SneakyThrows
  public void processSingleFile(String dumpLocation, Boolean justCreationTime) {
    log.info("Scanning {} for datasets", dumpLocation);
    val s3c = new S3ClientFactory(null);
    GZIPInputStream gzip = new GZIPInputStream(s3c.get(dumpLocation).getContentStream());
    BufferedReader br = new BufferedReader(new InputStreamReader(gzip));
    int successful = 0;
    List<String> failedList = Lists.newArrayList();
    String content;
    while ((content = br.readLine()) != null) {
      try {
        val jso = new JsonParser().parse(content).getAsJsonObject().get("Item").getAsJsonObject();

        if (!jso.get("sk").getAsJsonObject().get("S").getAsString().equalsIgnoreCase("MODEL")) {
          continue;
        }
        String orgId = jso.get("org_id").getAsJsonObject().get("S").getAsString();
        String datasetId = jso.get("model_id").getAsJsonObject().get("S").getAsString();

        String datasetName = datasetId;
        if (jso.get("model_name") != null) {
          datasetName = jso.get("model_name").getAsJsonObject().get("S").getAsString();
        }

        String timePeriod = "PT1H";
        if (jso.get("timePeriod") != null) {
          timePeriod = jso.get("timePeriod").getAsJsonObject().get("S").getAsString();
        }
        String datasetType = null;
        if (jso.get("model_type") != null) {
          datasetType = jso.get("model_type").getAsJsonObject().get("S").getAsString();
        }
        boolean active = true;
        if (jso.get("active") != null) {
          active = jso.get("active").getAsJsonObject().get("N").getAsInt() == 1;
        }
        long creationTimestamp = System.currentTimeMillis();
        if (jso.get("creation_time") != null) {
          creationTimestamp =
              ZonedDateTime.parse(
                      jso.get("creation_time").getAsJsonObject().get("S").getAsString(),
                      DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                  .toInstant()
                  .toEpochMilli();
        }
        Dataset.DatasetBuilder builder =
            justCreationTime
                ? Dataset.builder().orgId(orgId).datasetId(datasetId).createdTs(creationTimestamp)
                : Dataset.builder()
                    .orgId(orgId)
                    .datasetId(datasetId)
                    .granularity(timePeriod)
                    .name(datasetName)
                    .type(datasetType)
                    .active(active)
                    .createdTs(creationTimestamp);
        if (!active && !justCreationTime) builder.ingestionDisabled(true);
        persist(builder.build());
        successful += 1;
      } catch (Exception e) {
        log.error("Failed to backfill dataset", e);
        failedList.add(content);
      }
    }
    int failed = failedList.size();
    if (failed == 0) {
      log.info("Successfully processed all {} datasets in {}", successful, dumpLocation);
    } else {
      log.error(
          "Failed to process {} out of {} datasets in {}",
          failed,
          failed + successful,
          dumpLocation);
      for (String failedDataset : failedList) {
        log.error(failedDataset);
      }
    }
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public Dataset persist(Dataset dataset) {
    Org org = new Org();
    org.setOrgId(dataset.getOrgId());
    org = organizationService.persist(org);

    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement preparedStatement = db.prepareStatement(datasetInsertSql);
    preparedStatement.setInt(1, org.getId());
    preparedStatement.setString(2, dataset.getDatasetId());
    preparedStatement.setObject(3, dataset.getGranularity());
    preparedStatement.setObject(4, dataset.getIngestionDisabled());
    preparedStatement.setString(5, dataset.getName());
    preparedStatement.setObject(6, dataset.getType());
    preparedStatement.setObject(7, dataset.getActive());
    if (dataset.getCreatedTs() != null) {
      preparedStatement.setObject(8, new Timestamp(dataset.getCreatedTs()));
    } else {
      preparedStatement.setObject(8, null);
    }
    val r = preparedStatement.executeQuery();
    r.next();
    dataset.setId(r.getInt(1));
    return dataset;
  }

  @SneakyThrows
  @Transactional
  public ResourceTag saveResourceTag(ResourceTag resourceTag) {
    val tagsInsert = (NativeQueryImpl) entityManager.createNativeQuery(resourceTagsInsertSql);
    tagsInsert.setParameter("orgId", resourceTag.getOrgId());
    tagsInsert.setParameter("resourceId", resourceTag.getResourceId());
    tagsInsert.setParameter("tagKey", resourceTag.getKey());
    tagsInsert.setParameter("tagValue", resourceTag.getValue());
    tagsInsert.setParameter("updateTimestamp", new Timestamp(Instant.now().toEpochMilli()));
    tagsInsert.executeUpdate();

    return resourceTag;
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public List<KeyValueTag> listResourceTags(String orgId, String resourceId) {
    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup
    PreparedStatement preparedStatement =
        db.prepareStatement(
            "select tag_key, tag_value from whylabs.resource_tags where org_id = ? and resource_id = ?");
    preparedStatement.setString(1, orgId);
    preparedStatement.setString(2, resourceId);
    val r = preparedStatement.executeQuery();
    List<KeyValueTag> resourceTags = Lists.newArrayList();
    while (r.next()) {
      resourceTags.add(
          KeyValueTag.builder()
              .key(r.getString("tag_key"))
              .value(r.getString("tag_value"))
              .build());
    }
    return resourceTags;
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void replaceResourceTag(ResourceTag resourceTag) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "select id from whylabs.resource_tags where org_id = ? and resource_id = ? and tag_key = ?");
    pst.setString(1, resourceTag.getOrgId());
    pst.setString(2, resourceTag.getResourceId());
    pst.setString(3, resourceTag.getKey());
    val id = pst.executeQuery();
    if (id.next()) {
      val resourceTagPk = id.getInt("id");

      @Cleanup
      PreparedStatement updateQuery =
          db.prepareStatement(
              "update whylabs.resource_tags set tag_value = ?, update_timestamp = ? where id = ?");
      updateQuery.setString(1, resourceTag.getValue());
      updateQuery.setObject(2, new Timestamp(Instant.now().toEpochMilli()));
      updateQuery.setLong(3, resourceTagPk);
      updateQuery.execute();
    } else {
      saveResourceTag(resourceTag);
    }
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(value = DatasourceConstants.BULK)
  @Executable
  public void deleteResourceTags(String orgId, String resourceId, Set<String> tagKeys) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement deleteQuery =
        db.prepareStatement(
            "delete from whylabs.resource_tags where org_id = ? and resource_id = ? and tag_key = ?");
    if (tagKeys.isEmpty()) return;
    for (val key : tagKeys) {
      deleteQuery.setString(1, orgId);
      deleteQuery.setString(2, resourceId);
      deleteQuery.setString(3, key);
      deleteQuery.addBatch();
    }
    deleteQuery.executeBatch();
  }

  @SneakyThrows
  @Transactional
  public void deleteResourceTagKeyValue(
      String orgId, String resourceId, String tagKey, String tagValue) {
    val deleteTag =
        (NativeQueryImpl<?>)
            entityManager.createNativeQuery(
                "delete from whylabs.resource_tags where org_id = :orgId and resource_id = :resourceId and tag_key = :tagKey and tag_value = :tagValue");
    if (tagKey == null || tagValue == null) return;
    deleteTag.setParameter("orgId", orgId);
    deleteTag.setParameter("resourceId", resourceId);
    deleteTag.setParameter("tagKey", tagKey);
    deleteTag.setParameter("tagValue", tagValue);
    deleteTag.executeUpdate();
  }

  @SneakyThrows
  public Dataset getDatasetCached(String orgId, String datasetId) {
    try {
      return DATASET_CACHE.get(orgId + datasetId, () -> getDataset(orgId, datasetId));
    } catch (CacheLoader.InvalidCacheLoadException e) {
      // Null entries are possible, don't blow up
      return null;
    }
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public Dataset getDataset(String orgId, String datasetId) {
    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup PreparedStatement preparedStatement = db.prepareStatement(datasetListSql);
    preparedStatement.setString(1, orgId);
    preparedStatement.setString(2, datasetId);
    preparedStatement.setString(3, datasetId);
    preparedStatement.setBoolean(4, true);
    val r = preparedStatement.executeQuery();
    if (r.next()) {
      var active = r.getBoolean(6);
      if (r.wasNull()) {
        active = true;
      }
      val tagArray = r.getArray(9);
      List<KeyValueTag> tags = Lists.newArrayList();

      if (tagArray != null) {
        val ta = (String[]) tagArray.getArray();
        for (val t : ta) {
          tags.add(GSON.fromJson(t, KeyValueTag.class));
        }
      }
      return Dataset.builder()
          .orgId(orgId)
          .datasetId(datasetId)
          .name(r.getString(2))
          .granularity(r.getString(3))
          .ingestionDisabled(r.getBoolean(4))
          .type(r.getString(5))
          .active(active)
          .createdTs(r.getTimestamp(7).getTime())
          .tags(tags)
          .build();
    }

    return null;
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public List<Dataset> listDatasets(String orgId, Boolean includeInactive) {
    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup PreparedStatement preparedStatement = db.prepareStatement(datasetListSql);
    preparedStatement.setString(1, orgId);
    preparedStatement.setString(2, null);
    preparedStatement.setString(3, null);
    preparedStatement.setBoolean(4, includeInactive);
    val r = preparedStatement.executeQuery();
    List<Dataset> datasets = Lists.newArrayList();
    while (r.next()) {
      var active = r.getBoolean(6);
      if (r.wasNull()) active = true;
      val tagArray = r.getArray(9);
      List<KeyValueTag> tags = Lists.newArrayList();

      if (tagArray != null) {
        val ta = (String[]) tagArray.getArray();
        for (val t : ta) {
          tags.add(GSON.fromJson(t, KeyValueTag.class));
        }
      }
      datasets.add(
          Dataset.builder()
              .orgId(orgId)
              .datasetId(r.getString(1))
              .name(r.getString(2))
              .granularity(r.getString(3))
              .ingestionDisabled(r.getBoolean(4))
              .type(r.getString(5))
              .active(active)
              .createdTs(r.getTimestamp(7).getTime())
              .tags(tags)
              .build());
    }
    return datasets;
  }

  /**
   * Enable a dataset to have its data continuously looped. This is for demo datasets where a
   * carefully crafted scenario is uploaded, but only covers a hanful of weeks. Rather than
   * requiring every demo dataset to be re-uploaded from a notebook on a cron this will flag the
   * dataset triggering the data to be re-uploaded on a loop.
   */
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void enableDataLooping(
      String orgId, String datasetId, Long timeBoundaryStart, Long timeBoundaryEnd) {
    val start = ZonedDateTime.ofInstant(Instant.ofEpochMilli(timeBoundaryStart), ZoneOffset.UTC);
    val end = ZonedDateTime.ofInstant(Instant.ofEpochMilli(timeBoundaryEnd), ZoneOffset.UTC);
    // Cap the loop size to 3months
    long window = Math.min(90, Duration.between(start, end).toDays());

    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement preparedStatement =
        db.prepareStatement(
            "update whylabs.datasets set loop_data_enabled = true, loop_data_timestamp = ?, loop_data_lookback_buckets = ? where org_id = ? and dataset_id = ? ");
    preparedStatement.setTimestamp(1, new Timestamp(timeBoundaryEnd));
    preparedStatement.setLong(2, window);
    preparedStatement.setLong(3, organizationService.getByOrgId(orgId).get().getId());
    preparedStatement.setString(4, datasetId);
    preparedStatement.executeUpdate();
  }

  /** Advance to the next bucket for a continuously looped dataset */
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void advanceDataLoop(String orgId, String datasetId, long nextBucket) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement preparedStatement =
        db.prepareStatement(
            "update whylabs.datasets set  loop_data_timestamp = ? where org_id = ? and dataset_id = ? ");
    preparedStatement.setTimestamp(1, new Timestamp(nextBucket));
    preparedStatement.setLong(2, organizationService.getByOrgId(orgId).get().getId());
    preparedStatement.setString(3, datasetId);
    preparedStatement.executeUpdate();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public LoopedDatasetResponse getLoopedDatasets() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    // select orgs.org_id, dataset_id, loop_data_timestamp, loop_data_lookback_hours from
    // whylabs.datasets inner join whylabs.orgs on datasets.org_id = orgs.id
    @Cleanup
    PreparedStatement preparedStatement =
        db.prepareStatement(
            "select orgs.org_id, dataset_id, loop_data_timestamp, loop_data_lookback_buckets from  whylabs.datasets inner join whylabs.orgs on datasets.org_id = orgs.id where loop_data_enabled = true and loop_data_timestamp < now() - interval '48 hours'");
    val r = preparedStatement.executeQuery();

    List<LoopeddataResponseRow> rows = new ArrayList<>();
    while (r.next()) {
      rows.add(
          LoopeddataResponseRow.builder()
              .orgId(r.getString(1))
              .datasetId(r.getString(2))
              .bucket(r.getTimestamp(3).toInstant().toEpochMilli())
              .window(r.getLong(4))
              .build());
    }
    return LoopedDatasetResponse.builder().rows(rows).build();
  }
}
