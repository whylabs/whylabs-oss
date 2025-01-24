package ai.whylabs.dataservice.services;

import static ai.whylabs.batch.utils.TraceIdUtils.getTraceId;
import static ai.whylabs.dataservice.enums.StandardMetrics.*;
import static ai.whylabs.dataservice.services.DatasetMetricsService.METRIC_PATH_CLASSIFICATION;
import static ai.whylabs.dataservice.services.DatasetMetricsService.METRIC_PATH_REGRESSION;
import static ai.whylabs.dataservice.streaming.AuditRow.IngestState;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.*;
import static ai.whylabs.ingestion.WhylogsFileIterator.*;
import static java.lang.Math.min;
import static java.time.Instant.now;
import static java.util.Objects.isNull;
import static java.util.Objects.nonNull;

import ai.whylabs.core.aggregation.VarianceAccumulator;
import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.enums.IngestionRollupGranularity;
import ai.whylabs.core.enums.TargetTable;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.utils.Constants;
import ai.whylabs.core.utils.DeleteOnCloseFile;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.Variance;
import ai.whylabs.dataservice.calculations.PostAggregators;
import ai.whylabs.dataservice.entitySchema.DefaultSchemaMetadata;
import ai.whylabs.dataservice.enums.AnalysisMetric;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.enums.StandardMetrics;
import ai.whylabs.dataservice.operationalMetrics.EntitySchemaInstrumentation;
import ai.whylabs.dataservice.operationalMetrics.EntitySchemaInstrumentationImpl;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.responses.*;
import ai.whylabs.dataservice.responses.GetTracesResponse.TraceRow;
import ai.whylabs.dataservice.strategies.ProfileTableResolutionStrategy;
import ai.whylabs.dataservice.streaming.AuditRow;
import ai.whylabs.dataservice.structures.ProfileIngestionStats;
import ai.whylabs.dataservice.structures.UploadPattern;
import ai.whylabs.dataservice.tokens.RetrievalTokenService;
import ai.whylabs.dataservice.tokens.RetrievalTokenV1;
import ai.whylabs.dataservice.util.*;
import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import ai.whylabs.ingestion.*;
import com.amazonaws.AmazonClientException;
import com.amazonaws.arn.Arn;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3URI;
import com.amazonaws.services.s3.model.CopyObjectRequest;
import com.amazonaws.services.s3.model.ListObjectsV2Request;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Iterators;
import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.stream.JsonReader;
import com.shaded.whylabs.org.apache.datasketches.ArrayOfStringsSerDe;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllFloatsSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import com.whylogs.core.message.ColumnMessage;
import com.whylogs.core.message.MetricComponentMessage;
import com.whylogs.v0.core.message.RegressionMetricsMessage;
import com.whylogs.v0.core.message.ScoreMatrixMessage;
import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.util.NamedThreadFactory;
import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Property;
import io.micronaut.context.annotation.Value;
import io.micronaut.http.annotation.Body;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.io.*;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.ByteOrder;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.Instant;
import java.time.Period;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.Date;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.LongAccumulator;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import java.util.zip.GZIPInputStream;
import javax.inject.Named;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import liquibase.util.StringUtil;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.QuoteMode;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.logging.log4j.util.Strings;
import org.hibernate.query.internal.NativeQueryImpl;
import org.hibernate.type.LongType;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.joda.time.DateTime;
import org.joda.time.Interval;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class ProfileService {
  // Common JDBC batch size
  private static final int BATCH_SIZE = 100;
  private static final String UPLOAD_TS_PATH = "whylabs/last_upload_ts";
  public static final String TRACE_ID_PATH = "whylabs/traceid";

  // When writing you'll hit the staging tables
  public static final String TABLE_NAME_SEGMENTED_STAGING = "profiles_segmented_staging";
  public static final String TABLE_NAME_OVERALL_STAGING = "profiles_overall_staging";

  public static final String TABLE_NAME_UNMERGED = "profiles_unmerged_hypertable";

  // Data gets promoted to the staging=>hypertable periodically
  public static final String TABLE_NAME_SEGMENTED_HYPERTABLE = "profiles_segmented_hypertable";

  public static final String TABLE_NAME_OVERALL_HYPERTABLE = "profiles_overall_hypertable";

  // When querying you want to use the views
  // TODO: When you get back, implement querying the correct table based on the query
  public static final String PROFILES_SEGMENTED_VIEW = "profiles_segmented";
  public static final String PROFILES_OVERALL_VIEW = "profiles_overall";

  // signal value in some SQL queries to be replace with applicable table relation.
  // Uses nonexistent table name to cause error if not replaced.
  public static final String REPLACEMENT_TABLE_SIGNAL_VALUE = "bad_table_replace_me";

  private static final ArrayOfStringsSerDe ARRAY_OF_STRINGS_SER_DE = new ArrayOfStringsSerDe();
  private final HashFunction hf = Hashing.md5();
  public static final int DEFAULT_PROMOTION_LOOKBACK_DAYS = 2;
  @Inject private ObjectMapper objectMapper;

  @Inject private final DataSvcConfig config;
  @Inject private EntitySchemaService entitySchemaService;

  @Inject private final DataSource dataSource;
  @PersistenceContext private EntityManager entityManager;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource readonlyDatasource;

  @Inject private OrganizationService organizationService;
  @Inject private DatasetService datasetService;
  @Inject private final ObjectMapper mapper;
  @Inject private final AmazonS3 s3;
  @Inject private final LegacySegmentRepository legacySegmentRepository;
  @Inject private RetrievalTokenService retrievalTokenService;

  @Inject DatasetMetricsService datasetMetricsService;
  @Inject private ProfileTableResolutionStrategy profileTableResolutionStrategy;

  @Inject private final MeterRegistry meterRegistry;

  private static final String active_batch_columns_query;
  private static final String active_reference_columns_query;
  private static final String allTagsSql;
  private static final String auditCreateSql;
  private static final String auditLockSql;
  private static final String auditMetricsSql;
  private static final String auditQueueSql;
  private static final String auditReaperSql;
  private static final String auditUpdateSql;
  private static final String bootstrapManifest;
  private static final String copyDataSql;
  private static final String copyRefProfileSql;
  private static final String copySingleRefProfileSql;
  private static final String numericMetricByProfileSql;
  public static final String promoteOverallTableSql;
  public static final String promoteSegmentedTableSql;
  private static final String referenceProfileSql;
  private static final String rollupProfileSql;
  private static final String tagsInsertSql;
  private static final String tagsRollupSql;

  static {
    try {
      active_batch_columns_query =
          IOUtils.resourceToString("/sql/active-batch-columns.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
      active_reference_columns_query =
          IOUtils.resourceToString("/sql/active-reference-columns.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
      allTagsSql = IOUtils.resourceToString("/sql/all-tags.sql", StandardCharsets.UTF_8);
      auditCreateSql = IOUtils.resourceToString("/sql/audit-create.sql", StandardCharsets.UTF_8);
      auditLockSql =
          IOUtils.resourceToString("/sql/audit-lock-pending.sql", StandardCharsets.UTF_8);
      auditMetricsSql = IOUtils.resourceToString("/sql/audit-metrics.sql", StandardCharsets.UTF_8);
      auditQueueSql = IOUtils.resourceToString("/sql/audit-queue.sql", StandardCharsets.UTF_8);
      auditReaperSql = IOUtils.resourceToString("/sql/audit-reaper.sql", StandardCharsets.UTF_8);
      auditUpdateSql = IOUtils.resourceToString("/sql/audit-update.sql", StandardCharsets.UTF_8);
      bootstrapManifest =
          IOUtils.resourceToString("/unit-test-bootstrap.txt", StandardCharsets.UTF_8);
      copyDataSql = IOUtils.resourceToString("/sql/copy-profile-data.sql", StandardCharsets.UTF_8);
      copyRefProfileSql =
          IOUtils.resourceToString("/sql/copy-ref-profiles.sql", StandardCharsets.UTF_8);
      copySingleRefProfileSql =
          IOUtils.resourceToString("/sql/copy-single-ref-profile.sql", StandardCharsets.UTF_8);
      numericMetricByProfileSql =
          IOUtils.resourceToString("/sql/numeric-metric-by-profile.sql", StandardCharsets.UTF_8);
      promoteOverallTableSql =
          IOUtils.resourceToString("/sql/promote-overall.sql", StandardCharsets.UTF_8);
      promoteSegmentedTableSql =
          IOUtils.resourceToString("/sql/promote-segmented.sql", StandardCharsets.UTF_8);
      referenceProfileSql =
          IOUtils.resourceToString("/sql/reference-metrics.sql", StandardCharsets.UTF_8);
      rollupProfileSql =
          IOUtils.resourceToString("/sql/profile-rollup.sql", StandardCharsets.UTF_8);
      tagsInsertSql = IOUtils.resourceToString("/sql/tags-insert.sql", StandardCharsets.UTF_8);
      tagsRollupSql = IOUtils.resourceToString("/sql/tags-rollup.sql", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  private final String ingestionStaleAfter;

  private final MetadataSvc metadataSvc;

  private final ExecutorService ingestionPool; // blocking thread pool of limited capacity

  @Property(name = "whylabs.dataservice.auditMetricsPeriod")
  private String auditMetricsPeriod;

  private AtomicInteger promotionsInFlight = new AtomicInteger();

  public static final int MAX_PROMOTIONS_IN_FLIGHT = 6;

  @Property(name = "whylabs.dataservice.whylabsArtifactsBucket")
  private String whylabsArtifactsBucket;

  @Property(name = "whylabs.dataservice.csvPrefix")
  private String csvPrefix;

  private final Period profileIngestCutoff; // limit oldest ingested profile

  public ProfileService(
      DataSource dataSource,
      ObjectMapper mapper,
      @Value("${whylabs.dataservice.ingestionPoolThreads}") Integer ingestionPoolThreads,
      @Value("${whylabs.dataservice.ingestionPoolQueueSize}") Integer ingestionPoolQueueSize,
      @Value("${whylabs.dataservice.ingestionStaleAfter}") String ingestionStaleAfter,
      @Value("${whylabs.dataservice.profileIngestCutoff}") String profileIngestCutoff,
      AmazonS3 s3,
      LegacySegmentRepository legacySegmentRepository,
      DataSvcConfig config,
      MeterRegistry meterRegistry)
      throws IOException {
    this.dataSource = dataSource;
    this.mapper = mapper;
    this.s3 = s3;
    this.legacySegmentRepository = legacySegmentRepository;
    this.config = config;
    this.metadataSvc = new MetadataSvc(s3);

    this.meterRegistry = meterRegistry;
    this.ingestionStaleAfter = ingestionStaleAfter;

    // Threadpool for profile ingestion.  Controls #threads and max queue depth.
    // Don't make queue size too large or greedy container will grab more pending profiles than it
    // can chew.
    this.ingestionPool =
        newFixedThreadPoolWithQueueSize(ingestionPoolThreads, ingestionPoolQueueSize);

    // Limit profiles to timestamps within ISO-8601 period interval,
    // e.g profileIngestCutoff = 'P5Y', new profiles must have timestamp within last 5 years.
    if (Strings.isEmpty(profileIngestCutoff)) profileIngestCutoff = "P5Y";
    this.profileIngestCutoff = Period.parse(profileIngestCutoff);
  }

  /**
   * Scan audit table for stale `processing` rows, move back to `pending` state. Rows become stale
   * if they remain in processing state for too long.
   *
   * <p>Return number of modified rows.
   */
  @Transactional
  public int auditReaper() {
    val query = (NativeQueryImpl) entityManager.createNativeQuery(auditReaperSql);
    return query.executeUpdate();
  }

  /**
   * Create thread pool for async profile ingestion. Limits the number of threads that may be queued
   * waiting for execution.
   */
  private static ExecutorService newFixedThreadPoolWithQueueSize(int nThreads, int queueSize) {
    return new ThreadPoolExecutor(
        nThreads,
        nThreads,
        5000L,
        TimeUnit.MILLISECONDS,
        new ArrayBlockingQueue<Runnable>(queueSize, true),
        new NamedThreadFactory("ingestion-pool-"));
  }

  /**
   * Select and lock `pending` rows in audit table. Each row is marked with `processing` state, the
   * time it was locked, and uuid. The same uuid must be match at the end of ingestion or the
   * ingestion fails.
   *
   * @param howMany max number of rows to return
   * @param uuid - rows are locked for this uuid
   * @return list of ProfileMetadata for profiles to be ingested
   */
  @Transactional
  public List<AuditRow> lockPending(int howMany, UUID uuid) {
    log.debug("scanning for {} pending profiles", howMany);
    // replace limit in query with `howMany`
    val sql = auditLockSql.replace("limit 20", "limit " + howMany);
    val query = (NativeQueryImpl<AuditRow>) entityManager.createNativeQuery(sql, AuditRow.class);
    query.setParameter("uuid", uuid);
    return query.getResultList();
  }

  /**
   * gather count of profiles in each state over a recent fixed interval. A full index on
   * last_update_ts and state make this query fast.
   */
  @Transactional
  public Map<String, BigInteger> queryAuditStates() {
    val query =
        (NativeQueryImpl<Tuple>) entityManager.createNativeQuery(auditMetricsSql, Tuple.class);
    // query.setParameter("metricsPeriod", auditMetricsPeriod);
    PostgresUtil.setStandardTimeout(query);
    return query.getResultList().stream()
        .collect(
            Collectors.toMap(
                row -> ((String) row.get("state")), row -> ((BigInteger) row.get("count"))));
  }

  /**
   * gather total count of profiles in `pending` and `processing` states. Partial indicies on the
   * audit table make this query fast.
   */
  @Transactional
  public Map<String, Number> queryQueueDepth() {
    val query =
        (NativeQueryImpl<Tuple>) entityManager.createNativeQuery(auditQueueSql, Tuple.class);
    PostgresUtil.setStandardTimeout(query);
    return query.getResultList().stream()
        .collect(
            Collectors.toMap(
                row -> ((String) row.get("state")), row -> ((Number) row.get("count"))));
  }

  /**
   * Scan audit table for rows marked `pending` and ingest the profile contents. Parallel ingestion
   * is limited by available capacity in ingestion thread pool. Updates the state of rows in the
   * audit table to `processing`, followed by either `ingested` or `failed`.
   *
   * <p>NB do not make this transactional. Doing so will prevent the call to `lockPending` from
   * persisting changes before it returns. Each individual profile ingestion is an async transaction
   * but the entire group is not.
   */
  @Transactional(Transactional.TxType.NEVER)
  public void ingestPending() {
    // create uuid used to lock audit row during ingestion.  If uuid is different at end of
    // ingestion, that profile ingestion fails.
    val cap = ((ThreadPoolExecutor) ingestionPool).getQueue().remainingCapacity();
    if (cap > 0) {
      val uuid = UUID.randomUUID();
      val rows = lockPending(cap, uuid);
      if (rows.size() > 0) log.debug("ingesting {} pending profiles", rows.size());
      meterRegistry.gauge("whylabs.profileservice.ingestion.pending", rows.size());
      for (val pm : rows) {
        ingestionPool.submit(() -> ingestProfile(pm, uuid));
      }
    }
  }

  /** Queue profile for ingestion. Call this API from controller's profile indexing endpoint. */
  public int indexProfile(String originalFile, String method) {
    return indexProfile(originalFile, method, null);
  }

  // Queue profile for ingestion. Call this API from CloudTrail parser to
  // supply event timestamp.
  //
  // Note this does not ingest the profile! Creates unique entry in the audit table for `uri`,
  // marked `pending`.  If a row exists no update
  // is made to the audit table.
  @Timed(value = "whylabs.profileservice.index")
  @Transactional
  public int indexProfile(String uri, String method, @Nullable Long eventTs) {
    //  Don't explicitly check for duplicate entry here,
    //  updateAuditLog will dedup in postgres
    log.debug("index profile {}", uri);
    val meta = metadataSvc.fetchMetadata(uri);
    if (meta == null) {
      // Note: do not create audit table entry if metadata unavailable
      log.warn("metadata not available for {}", uri);
      meterRegistry.counter("whylabs.profileservice.index.metadata.unavailable").increment();
      return 0;
    }
    meta.setEventTs(eventTs);

    final int res = createAuditLog(meta, method);
    meterRegistry.counter("whylabs.profileservice.index.audited").increment();
    return res;
  }

  /**
   * Ingest profile directly without going through audit table queue.
   *
   * <p>Available for testing and debugging through controller's profile ingestion endpoint, but not
   * a normal part of the ingestion flow.
   */
  public void ingestProfile(String uri, String method) {
    log.info("direct ingest profile {}", uri);
    AuditRow auditRow = metadataSvc.fetchMetadata(uri);
    auditRow.setIngestMethod(method);
    val lockUuid = UUID.randomUUID();
    ingestProfile(auditRow, lockUuid);
  }

  /**
   * Called from periodic process that scans audit table for work to do. Note this is not called
   * directly from CloudTrail handler, instead this consumes audit table rows in the pending state.
   *
   * @param pm - metadata read from audit table.
   */
  @Transactional
  @Timed(value = "whylabs.profileservice.ingest")
  public void ingestProfile(AuditRow pm, UUID lockUuid) {
    int metricsIndexed = 0;

    log.debug("ingesting {}", pm.getFilePath());
    pm.setIngestStartTs(System.currentTimeMillis());

    Counter indexedMetrics = null;
    if (pm.getIngestMethod() != null) {
      indexedMetrics =
          meterRegistry.counter(
              "whylabs.profileservice.index.metrics", "method", pm.getIngestMethod());
    }

    try (val fit = new WhylogsFileIterator(pm.getFilePath(), s3)) {
      // iterate over delimited regions in the profile
      String traceId = null;
      while (fit.hasNext()) {
        // get metrics iterator from file iterator
        val mit = fit.next();

        // WhylogsFileIterator collects file-specific metadata, like name, size, modification time.
        // Add that to the metadata supplied by the customer.
        final V1Metadata metadata = mit.getMetadata();
        metadata.addAll(fit.getMetadata());

        val n = write(metadata, mit);
        metricsIndexed += n;
        if (indexedMetrics != null) {
          indexedMetrics.increment(metricsIndexed);
        }

        val props = metadata.getProperties();
        val tags = props.getTagsMap();
        traceId = getTraceId(props.getMetadataMap());
        val refID = Optional.ofNullable(tags.get(REFERENCE_PROFILE_ID));

        // don't ingest batch profiles with very old timestamps.
        // avoid time-bombing unit tests one day.
        if (config.isDeployed() && !refID.isPresent()) {
          val cutoff = ZonedDateTime.now().minus(profileIngestCutoff).toInstant().toEpochMilli();
          if (metadata.getDatasetTimestamp() < cutoff)
            throw new IllegalArgumentException(
                "Cannot ingest profile with timestamp outside of ingestion window");
        }

        if (!refID.isPresent()) {
          // segment traces table is used to find batch single profiles.
          // Don't put reference profiles in there.
          updateSegmentTraces(metadata);
        }

        // Detect if we are ingesting multiple entries in an aggregate (e.g. zip file).
        // Each entry needs their own row in the audit table, in addition to a row for the overall
        // binary file.
        val binPath = props.getMetadataMap().get(META_URI);
        if (!binPath.equals(pm.getFilePath())) {
          // make a new ProfileMetadata with some overrides from the file entry

          val auditRow =
              pm.toBuilder()
                  .filePath(props.getMetadataMap().get(META_URI))
                  .size(Long.valueOf(props.getMetadataMap().get(META_SIZE)))
                  .datasetTs(metadata.getDatasetTimestamp())
                  .modifiedTs(Long.valueOf(props.getMetadataMap().get(META_MODIFIED)))
                  .ingestEndTs(System.currentTimeMillis())
                  .build();
          updateAuditTableQuietly(auditRow, null, IngestState.ingested, traceId);
        }
      }
      pm.setSize(fit.getLength());
      pm.setModifiedTs(fit.getModifiedTimestamp());
      pm.setIngestEndTs(System.currentTimeMillis());

      // lockUuid must match uuid used to lock the row in `ingestPending`.
      updateAuditTableQuietly(pm, lockUuid, IngestState.ingested, traceId);
      log.debug("File {} ingested with {} metrics", pm.getFilePath(), metricsIndexed);
    } catch (Exception e) {
      log.error("Skipping " + pm.getFilePath(), e);
      meterRegistry
          .counter("whylabs.profileservice.index.metrics.error", "method", pm.getIngestMethod())
          .count();

      // lockUuid must match uuid used to lock the row in `ingestPending`.
      updateAuditTableQuietly(pm, lockUuid, IngestState.failed, null);
    }
  }

  private void updateAuditTableQuietly(
      AuditRow pm, UUID lockUuid, IngestState state, String traceId) {
    try {
      // lockUuid must match uuid used to lock the row in `ingestPending`.
      int ingestedCnt = updateAuditLog(pm, lockUuid, state, traceId);
      if (ingestedCnt != 1) {
        throw new IllegalStateException(
            "Failed to update audit table to "
                + state
                + ". Expected update count 1, got "
                + ingestedCnt);
      }
    } catch (Exception e) {
      log.error(
          "Failed to update audit table! {}/{} uri={} ",
          pm.getOrgId(),
          pm.getDatasetId(),
          pm.getFilePath(),
          e);
    }
  }

  /**
   * Helper routine for unit testing - gets ingestion state associated with a specific file. This is
   * not used in the normal course of business.
   */
  @SuppressWarnings("JpaQueryApiInspection")
  @Transactional
  @SneakyThrows
  public AuditRow.IngestState getIngestState(String filename) {
    final String sql = "SELECT state FROM whylabs.profile_upload_audit WHERE s3_path=?";

    try (Connection db = dataSource.getConnection();
        val st = db.prepareStatement(sql)) {
      st.setString(1, filename);
      st.execute();
      val resultSet = st.getResultSet();
      if (resultSet != null) {
        while (resultSet.next()) {
          String state = resultSet.getString(1);
          return IngestState.valueOf(state);
        }
      }
    }
    return null;
  }

  @SuppressWarnings("JpaQueryApiInspection")
  @Transactional
  @SneakyThrows
  public void deleteAuditEntry(String filename) {
    final String sql = "delete FROM whylabs.profile_upload_audit WHERE s3_path=?";

    try (Connection db = dataSource.getConnection();
        val st = db.prepareStatement(sql)) {
      st.setString(1, filename);
      st.execute();
    }
  }

  /**
   * Convenience function to return fresh instance of EntitySchemaInstrumentation. Class takes a
   * number of parameters that make construction awkward.
   */
  EntitySchemaInstrumentationImpl entitySchemaInferenceFactory(V1Metadata metadata) {
    DefaultSchemaMetadata schemaMetadata = entitySchemaService.getDefaultSchemaMetadata();
    return new EntitySchemaInstrumentationImpl(metadata, schemaMetadata, config, meterRegistry);
  }

  /**
   * Expect this to be called once per delimited profile region.
   *
   * @param metadata v1-format metadata message headers
   * @param it iterator of pairs <feature_name, metrics>
   * @return The number of metrics indexed
   */
  @SuppressWarnings("JpaQueryApiInspection")
  @SneakyThrows
  @Transactional
  public int write(V1Metadata metadata, Iterator<Pair<String, ColumnMessage>> it) {
    val props = metadata.getProperties();
    val tags = props.getTagsMap();
    val dataset = datasetService.getDatasetCached(tags.get(ORG_ID), tags.get(DATASET_ID));
    if (dataset != null && dataset.getIngestionDisabled()) {
      // This dataset was marked disabled, short circuit ingestion
      return 0;
    }

    val refID = Optional.ofNullable(tags.get(REFERENCE_PROFILE_ID));
    val binPath = props.getMetadataMap().get(META_URI);
    String traceId = getTraceId(props.getMetadataMap());
    val ingestionStatBuilder = ProfileIngestionStats.builder().traceId(traceId);

    List<TargetTable> targetTables = new ArrayList<>();
    if (refID.isPresent()) {
      targetTables.add(TargetTable.PROFILE_REFERENCE_PROFILE);
    } else {
      targetTables.add(TargetTable.PROFILE_OVERALL);
      val segments = metadata.extractSegments();
      if (segments != null && segments.size() > 0) {
        targetTables.add(TargetTable.PROFILE_SEGMENTED);
      }
      if (organizationService.granularDataStorageEnabledCached(tags.get(ORG_ID))) {
        targetTables.add(TargetTable.PROFILE_UNMERGED);
      }
    }

    @Cleanup Connection db = dataSource.getConnection();
    List<PreparedStatement> sts = new ArrayList<>();
    try {
      for (TargetTable targetTable : targetTables) {
        Long profile_id = null;
        String query;
        switch (targetTable) {
          case PROFILE_REFERENCE_PROFILE:
            query =
                "INSERT INTO whylabs.reference_profiles "
                    + "(profile_id, trace_id, dataset_timestamp, org_id, dataset_id, dataset_type, column_name,"
                    + " metric_path, mergeable_segment, segment_text, kll, hll, frequent_items, n_sum, n_min, n_max, d_sum, d_min, d_max, variance,"
                    + " classification_profile, regression_profile, last_upload_ts, first_upload_ts, reference_profile_id)"
                    + "VALUES (?,?, ?::timestamp,?,?,?::dataset_type_enum,?,?,?,?::json,?::kll_double_sketch,?::hll_sketch,?::frequent_strings_sketch,?,?,?,?,?,?,?,?,?, current_timestamp, current_timestamp,?)";
            break;
          case PROFILE_OVERALL:
            if (metadata.getProperties().getDatasetTimestamp() == 0) {
              meterRegistry.counter("whylabs.profileservice.write.overall.zerotimestamp").count();
              log.info(
                  "Profile {} had a zero timestamp, ingestion will be skipped",
                  metadata.getProperties().getMetadataMap().get(META_URI));
              return 0;
            }
            query =
                "INSERT INTO whylabs."
                    + TABLE_NAME_OVERALL_STAGING
                    + "(profile_id, trace_id, dataset_timestamp, org_id, dataset_id, dataset_type, column_name,"
                    + " metric_path, mergeable_segment, segment_text, kll, hll, frequent_items, n_sum, n_min, n_max, d_sum, d_min, d_max, variance,"
                    + " classification_profile, regression_profile, last_upload_ts, first_upload_ts)"
                    + "VALUES (?,?,?::timestamp,?,?,?::dataset_type_enum,?,?,?,?::json,?::kll_double_sketch,?::hll_sketch,?::frequent_strings_sketch,?,?,?,?,?,?,?,?,?, current_timestamp, current_timestamp)";
            break;
          case PROFILE_UNMERGED:
            // Only the unmerged table gets the profile id where we assign a unique hash we can use
            // in the group by
            profile_id = hf.newHasher().putString(binPath, StandardCharsets.UTF_8).hash().asLong();
          case PROFILE_SEGMENTED:
            if (metadata.getProperties().getDatasetTimestamp() == 0) {
              meterRegistry.counter("whylabs.profileservice.write.segmented.zerotimestamp").count();
              log.info(
                  "Profile {} had a zero timestamp, ingestion will be skipped",
                  metadata.getProperties().getMetadataMap().get(META_URI));
              return 0;
            }

            query =
                "INSERT INTO whylabs."
                    + TABLE_NAME_SEGMENTED_STAGING
                    + "(profile_id, trace_id, dataset_timestamp, org_id, dataset_id, dataset_type, column_name,"
                    + " metric_path, mergeable_segment, segment_text, kll, hll, frequent_items, n_sum, n_min, n_max, d_sum, d_min, d_max, variance,"
                    + " classification_profile, regression_profile, last_upload_ts, first_upload_ts)"
                    + "VALUES (?,?,?::timestamp,?,?,?::dataset_type_enum,?,?,?,?::json,?::kll_double_sketch,?::hll_sketch,?::frequent_strings_sketch,?,?,?,?,?,?,?,?,?, current_timestamp, current_timestamp)";
            if (targetTable.equals(TargetTable.PROFILE_UNMERGED)) {
              // Unmerged table is identical to segmented table, just diff table name
              query = query.replace(TABLE_NAME_SEGMENTED_STAGING, TABLE_NAME_UNMERGED);
            }
            break;
          default:
            log.error("FATAL: Unknown target table {}", targetTable);
            throw new IllegalArgumentException("Unknown target table " + targetTable);
        }

        val st = db.prepareStatement(query);
        sts.add(st);
        long rolledUpTimestamp =
            rollupTimestamp(
                tags.get(ORG_ID),
                tags.get(DATASET_ID),
                metadata.getProperties().getDatasetTimestamp(),
                targetTable);

        st.setTimestamp(FIELD.dataset_timestamp.ordinal(), new Timestamp(rolledUpTimestamp));
        st.setString(FIELD.org_id.ordinal(), tags.get(ORG_ID));
        st.setString(FIELD.dataset_id.ordinal(), tags.get(DATASET_ID));
        ingestionStatBuilder
            .orgId(tags.get(ORG_ID))
            .datasetId(tags.get(DATASET_ID))
            .datasetTimestamp(rolledUpTimestamp);

        // Null for all but the unmerged profile table
        st.setObject(FIELD.profile_id.ordinal(), profile_id, LongType.INSTANCE.sqlType());
        st.setString(FIELD.trace_id.ordinal(), traceId);
        val segments = metadata.extractSegments();
        if (segments != null
            && segments.size() > 0
            && !targetTable.equals(TargetTable.PROFILE_OVERALL)) {

          st.setString(FIELD.segment_text.ordinal(), mapper.writeValueAsString(segments));
          ingestionStatBuilder.segmentTags(segments);
        } else {
          st.setString(FIELD.segment_text.ordinal(), null);
        }

        if (refID.isPresent()) {
          st.setString(FIELD.reference_id.ordinal(), refID.get());
        }
      }

      // accumulate entity scheme for this profile.
      val entitySchemaInference = entitySchemaInferenceFactory(metadata);

      // We want to count how many records got loaded. This is the easiest object that
      // will count something; we're using it because it's here, but because we're multithreaded
      // or long-sized
      final LongAccumulator metricCount = new LongAccumulator(Long::sum, 0L);
      Iterators.partition(it, BATCH_SIZE)
          .forEachRemaining(
              batch -> metricCount.accumulate(write(sts, entitySchemaInference, batch)));
      entitySchemaInference.publish();

      try {
        val entitySchema = entitySchemaInference.getEntitySchema();
        entitySchemaService.fastSave(tags.get(ORG_ID), tags.get(DATASET_ID), entitySchema);
      } catch (Exception e) {
        log.error("Error updating entity schema. ATM this is a non-critical flow, skipping", e);
      }

      if (!refID.isPresent()) {
        updateTimeseriesRollupTable(
            metadata,
            rollupTimestamp(
                tags.get(ORG_ID),
                tags.get(DATASET_ID),
                metadata.getProperties().getDatasetTimestamp(),
                TargetTable.PROFILE_OVERALL));
        legacySegmentRepository.updateLegacySegments(metadata);
        // update tags if not reference profile. Note we do this last to reduce how long a tag can
        // be tied up by a transaction
        updateTagsTable(metadata);
      }

      log.debug("Batch of {} records ingested.", metricCount.intValue());
      return metricCount.intValue();
    } finally {
      // Don't use @Cleanup, it closes the prepared statement too early when you're generating
      // multiple in a loop
      for (val s : sts) {
        if (!s.isClosed()) {
          s.close();
        }
      }
    }
  }

  public long rollupTimestamp(
      String orgId, String datasetId, long timestamp, TargetTable targetTable) {
    if (targetTable.equals(TargetTable.PROFILE_UNMERGED)) {
      // Unmerged table doesn't truncate timestamps
      return timestamp;
    }
    val ingestionGranularity = organizationService.getIngestionRollupGranularityCached(orgId);
    val dataset = datasetService.getDatasetCached(orgId, datasetId);
    if (dataset != null && dataset.getGranularity() != null) {
      switch (dataset.getGranularity()) {
          /**
           * For a long time we used to truncate everything to the hour. Zooming out to daily for
           * daily models makes them take 1/24 the storage which matters now. Now we could map week
           * to week, but that raises questions around what day of the week does the week start and
           * should that be configurable. Thus for now we're taking baby steps and rolling up data
           * by 1 level. Eventually we can look into weekly/monthly, its just not a significant
           * enough amount of data to justify the discussion at the time of writing.
           */
        case "P1D":
        case "P1M":
        case "P1W":
          return ComputeJobGranularities.truncateByIngestionGranularity(
              IngestionRollupGranularity.daily, timestamp);
      }
    }

    return ComputeJobGranularities.truncateByIngestionGranularity(ingestionGranularity, timestamp);
  }

  /**
   * Turn a batch of v1 feature metrics into a complete V1 profile.
   *
   * <p>Expect this to be called one-or-more times per delimited profile region, depending on the
   * batching condition that applies in the caller.
   */
  @SneakyThrows
  private int write(
      List<PreparedStatement> sts,
      EntitySchemaInstrumentation schemaInference,
      List<Pair<String, ColumnMessage>> batch) {

    for (val st : sts) {
      for (val b : batch) {
        write(st, schemaInference, b);
      }
      st.executeBatch();
    }
    return batch.size();
  }

  /**
   * Our lowest-level metric writer, writes multiple metrics for single feature to the database. The
   * featurename is found in `pair.getKey()` and the set of metric associated with that feature is
   * in `pair.getValue().getMetricComponentsMap()`
   *
   * <p>Returns total number of rows written to database.
   */
  @SneakyThrows
  private void write(
      PreparedStatement st,
      EntitySchemaInstrumentation schemaInference,
      Pair<String, ColumnMessage> pair) {

    // note: assumes all three metrics that go into variance are included in a single batch.
    st.setString(FIELD.dataset_type.ordinal(), "column");
    st.setString(FIELD.column_name.ordinal(), pair.getKey());

    val varianceAccumulator = new VarianceAccumulator();
    for (val entry : pair.getValue().getMetricComponentsMap().entrySet()) {
      val metricPath = entry.getKey();
      val metric = entry.getValue();
      varianceAccumulator.accumulate(metricPath, metric);
      if (buildStatement(st, metricPath, metric)) {
        st.addBatch();
      } else {
        meterRegistry.counter("whylabs.profileservice.write.unrecognized.metric").count();
        log.debug("unrecognized metric {}", metric.toString());
      }
    }

    if (varianceAccumulator.isComplete()) {
      val v =
          Variance.builder()
              .count(varianceAccumulator.getCount())
              .mean(varianceAccumulator.getMean())
              .sum(varianceAccumulator.getSum())
              .build();
      // note - should write variance even if it is incomplete?
      for (int i = FIELD.kll.ordinal(); i <= FIELD.regression.ordinal(); i++) {
        st.setObject(i, null);
      }
      st.setString(FIELD.metric_path.ordinal(), "distribution/variance");
      st.setArray(FIELD.variance.ordinal(), v);
      st.setBoolean(FIELD.mergeable_segment.ordinal(), true);
      st.addBatch();
    }

    // accumulate entity schema for this profile after we successfully execute the insert
    // statements
    schemaInference.accummulateSchema(pair.getKey(), pair.getValue());
  }

  @SneakyThrows
  private boolean buildStatement(
      PreparedStatement st, String metricPath, MetricComponentMessage metric) {
    for (int i = FIELD.kll.ordinal(); i <= FIELD.regression.ordinal(); i++) {
      st.setObject(i, null);
    }

    st.setString(FIELD.metric_path.ordinal(), metricPath);

    // TODO: Extract from message
    st.setBoolean(FIELD.mergeable_segment.ordinal(), true);

    if (metric.hasD()) {
      val value = metric.getD();
      // a couple special metric paths go into variance tracker,
      // but are not entered into their own row.
      switch (metricPath) {
        case "distribution/mean":
        case "distribution/m2":
          return true;
        default:
          // typeId determines aggregation method for numeric metrics
          switch (metric.getTypeId()) {
            case Constants.TYPE_SUM:
              st.setDouble(FIELD.d_sum.ordinal(), value);
              return true;
            case Constants.TYPE_MIN:
              st.setDouble(FIELD.d_min.ordinal(), value);
              return true;
            case Constants.TYPE_MAX:
              st.setDouble(FIELD.d_max.ordinal(), value);
              return true;
            default:
              log.warn("Unrecognized typeId value {}, metric {}} ", metric.getTypeId(), metricPath);
          }
      }
    }

    if (metric.hasN()) {
      val value = metric.getN();
      // typeId determines aggregation method for numeric metrics
      switch (metric.getTypeId()) {
        case Constants.TYPE_SUM:
          st.setLong(FIELD.n_sum.ordinal(), value);
          return true;
        case Constants.TYPE_MIN:
          st.setLong(FIELD.n_min.ordinal(), value);
          return true;
        case Constants.TYPE_MAX:
          st.setLong(FIELD.n_max.ordinal(), value);
          return true;
        default:
          log.warn("Unrecognized typeId value {}, metric {}} ", metric.getTypeId(), metricPath);
      }
    }

    if (metric.hasKll()) {
      // if we know it is V1, we can assume it is KllDoublesSketch
      // otherwise we need this try/catch
      val message = metric.getKll().getSketch();
      Memory hMem = Memory.wrap(message.toByteArray());
      KllDoublesSketch sketch;
      try {
        sketch = KllDoublesSketch.heapify(hMem);
      } catch (Exception e) {
        meterRegistry.counter("whylabs.profileservice.index.metrics.kll.v0").count();
        KllFloatsSketch kllFloats = KllFloatsSketch.heapify(hMem);
        sketch = KllDoublesSketch.fromKllFloat(kllFloats);
      }
      st.setString(FIELD.kll.ordinal(), DruidStringUtils.encodeBase64String(sketch.toByteArray()));
      return true;
    }

    if (metric.hasHll()) {
      val bytes = metric.getHll().getSketch().toByteArray();
      // Throw exception if sketch cannot be deserialized
      assert (HllSketch.wrap(Memory.wrap(bytes, ByteOrder.LITTLE_ENDIAN)) != null);
      st.setString(FIELD.hll.ordinal(), DruidStringUtils.encodeBase64String(bytes));
      return true;
    }

    if (metric.hasFrequentItems()) {
      val bytes = metric.getFrequentItems().getSketch().toByteArray();
      if (bytes.length > 8) {
        // Throw exception if sketch cannot be deserialized
        assert (ItemsSketch.getInstance(Memory.wrap(bytes), ARRAY_OF_STRINGS_SER_DE) != null);
      }
      st.setString(FIELD.frequent_items.ordinal(), DruidStringUtils.encodeBase64String(bytes));
      return true;
    }

    if (metric.hasMsg()) {
      switch (metricPath) {
        case METRIC_PATH_CLASSIFICATION:
          {
            // Throw exception if message cannot be deserialized
            val msg = metric.getMsg().unpack(ScoreMatrixMessage.class);
            assert (com.whylogs.core.metrics.ClassificationMetrics.fromProtobuf(msg) != null);
            st.setString(
                FIELD.classification.ordinal(),
                DruidStringUtils.encodeBase64String(msg.toByteArray()));
            return true;
          }
        case METRIC_PATH_REGRESSION:
          {
            val msg = metric.getMsg().unpack(RegressionMetricsMessage.class);
            assert (com.whylogs.core.metrics.RegressionMetrics.fromProtobuf(msg) != null);
            st.setString(
                FIELD.regression.ordinal(), DruidStringUtils.encodeBase64String(msg.toByteArray()));
            return true;
          }
      }
    }
    return false;
  }

  /**
   * Keep the timeseries rollup table up to date. There's a long comment in 44-timeseries-table.sql
   * if you want some history on this flow.
   */
  @SneakyThrows
  @VisibleForTesting
  public void updateTimeseriesRollupTable(V1Metadata metadata, Long rolledUpTimestamp) {
    String sql =
        "INSERT INTO whylabs.profile_timeseries (org_id, dataset_id, dataset_timestamp) values (?, ?, ?) ON CONFLICT DO NOTHING";

    try (Connection db = dataSource.getConnection()) {
      val st = db.prepareStatement(sql);
      val props = metadata.getProperties();
      val tags = props.getTagsMap();

      int i = 1;
      st.setString(i++, tags.get(ORG_ID));
      st.setString(i++, tags.get(DATASET_ID));
      st.setTimestamp(i++, new Timestamp(rolledUpTimestamp));
      st.executeUpdate();
    }
  }

  /**
   * create row in audit table, set ingestion method and set state to "pending". Safe to call
   * multiple times as profile is reingested. If the row already exists, do not modify row.
   *
   * @return number of modified rows
   */
  public int createAuditLog(AuditRow pm, String method) {
    val query = (NativeQueryImpl) entityManager.createNativeQuery(auditCreateSql);
    query.setParameter("s3Path", pm.getFilePath());
    query.setParameter("orgId", pm.getOrgId());
    query.setParameter("datasetId", pm.getDatasetId());
    query.setParameter(
        "datasetTs", Optional.ofNullable(pm.getDatasetTs()).map(Timestamp::new).orElse(null));
    query.setParameter("ingestMethod", method);
    query.setParameter("size", pm.getSize());
    query.setParameter("refId", pm.getReferenceId());
    query.setParameter(
        "modifiedTs", Optional.ofNullable(pm.getModifiedTs()).map(Timestamp::new).orElse(null));
    query.setParameter(
        "eventTs", Optional.ofNullable(pm.getEventTs()).map(Timestamp::new).orElse(null));
    return query.executeUpdate();
  }

  /**
   * Update row in audit table. Under normal circumstances the row already exists, and this routine
   * just updates the state and some timestamps.
   *
   * @return number of modified rows - should always be 1.
   */
  public int updateAuditLog(AuditRow pm, UUID lockUuid, IngestState ingestState, String traceId) {
    return updateAuditLog(pm, null, lockUuid, ingestState, traceId);
  }

  /**
   * upsert a row into the `profile_upload_audit`. This may be called more than once per uploaded
   * file. Will never allow a row to be moved to pending state if already ingested or failed.
   */
  @SuppressWarnings("JpaQueryApiInspection")
  @SneakyThrows
  @VisibleForTesting
  public int updateAuditLog(
      @NonNull AuditRow pm,
      String method,
      UUID lockUuid,
      @NonNull IngestState ingestState,
      String traceId) {
    val query = (NativeQueryImpl) entityManager.createNativeQuery(auditUpdateSql);
    query.setParameter("s3Path", pm.getFilePath());
    query.setParameter("auditState", ingestState.name());
    query.setParameter("orgId", pm.getOrgId());
    query.setParameter("datasetId", pm.getDatasetId());
    query.setParameter(
        "datasetTs", Optional.ofNullable(pm.getDatasetTs()).map(Timestamp::new).orElse(null));
    query.setParameter("ingestMethod", method);
    query.setParameter("size", pm.getSize());
    query.setParameter("refId", pm.getReferenceId());
    query.setParameter(
        "modifiedTs", Optional.ofNullable(pm.getModifiedTs()).map(Timestamp::new).orElse(null));
    query.setParameter(
        "eventTs", Optional.ofNullable(pm.getEventTs()).map(Timestamp::new).orElse(null));
    query.setParameter(
        "ingestStartTs",
        Optional.ofNullable(pm.getIngestStartTs()).map(Timestamp::new).orElse(null));
    query.setParameter(
        "ingestEndTs", Optional.ofNullable(pm.getIngestEndTs()).map(Timestamp::new).orElse(null));
    query.setParameter("uuid", Optional.ofNullable(lockUuid).map(UUID::toString).orElse(null));
    query.setParameter("traceId", traceId);
    // do not store segments in audit table.
    query.setParameter("segmentTags", null);

    return query.executeUpdate();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public GetTracesResponse listTraces(@Body GetTracesRequest request) {
    val useTraceIdFilter = request.getTraceId() != null;
    val hasInterval = request.getInterval() != null;

    if (!hasInterval && !useTraceIdFilter) {
      throw new IllegalArgumentException("Either interval or traceId must be specified");
    }

    String traceIdFilter = "  and d.trace_id = :traceId ";
    String q =
        "select  dataset_timestamp, trace_id, s3_path \n"
            + "from whylabs.profile_upload_audit d "
            + "where d.org_id = :orgId "
            + "  and d.dataset_id = :datasetId "
            + (hasInterval
                ? "  and d.dataset_timestamp >= :start and d.dataset_timestamp < :end"
                : "")
            + (useTraceIdFilter ? traceIdFilter : "")
            + "  and d.trace_id is not null"
            + "  order by d.dataset_timestamp desc "
            + "  limit :limit offset :offset";

    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetId", request.getDatasetId());
    if (useTraceIdFilter) {
      query.setParameter("traceId", request.getTraceId());
    }
    if (hasInterval) {
      query.setParameter(
          "start",
          java.sql.Date.from(Instant.ofEpochMilli(request.getInterval().getStartMillis())));
      query.setParameter(
          "end", java.sql.Date.from(Instant.ofEpochMilli(request.getInterval().getEndMillis())));
    }
    // request one additional row to detect more results available
    query.setParameter("limit", request.getLimit() + 1);
    query.setParameter("offset", request.getOffset());

    val rows = query.getResultList();
    List<TraceRow> traces = new ArrayList<>();
    int maxRows = min(request.getLimit(), rows.size());
    for (int i = 0; i < maxRows; i++) {
      val oa = (Object[]) rows.get(i);
      val g =
          TraceRow.builder()
              .datasetTimestamp(((Timestamp) oa[0]).toInstant().toEpochMilli())
              .traceId((String) oa[1])
              .file((String) oa[2])
              .build();
      traces.add(g);
    }

    return GetTracesResponse.builder()
        .isTruncated(rows.size() > request.getLimit())
        .nextOffset((request.getOffset() + maxRows))
        .traces(traces)
        .build();
  }

  @SneakyThrows
  @Transactional
  public void updateSegmentTraces(V1Metadata metadata) {
    val props = metadata.getProperties();
    val tags = props.getTagsMap();
    val m = metadata.getProperties().getMetadataMap();
    String traceId = props.getMetadataMap().get(TRACE_ID);
    if (StringUtil.isEmpty(traceId)) {
      return;
    }
    val binPath = m.get(META_URI);
    Long profileId = hf.newHasher().putString(binPath, StandardCharsets.UTF_8).hash().asLong();

    String insert =
        "insert into whylabs.segment_traces (org_id, dataset_id, segment_tags, dataset_timestamp, trace_id, profile_id) values (?, ?, ?, ?::timestamptz, ?, ?)";
    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup val pst = db.prepareStatement(insert);
    pst.setString(1, tags.get(ORG_ID));
    pst.setString(2, tags.get(DATASET_ID));

    val segments = metadata.extractSegments();
    if (segments == null) {
      pst.setObject(3, null, Types.VARCHAR);
    } else {
      pst.setString(3, mapper.writeValueAsString(segments));
    }

    pst.setTimestamp(4, new Timestamp(metadata.getDatasetTimestamp()));
    pst.setString(5, traceId);
    pst.setLong(6, profileId);
    pst.executeUpdate();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public GetTracesBySegmentResponse listTracesBySegment(@Body GetTracesBySegmentRequest request) {
    val segment = Optional.ofNullable(request.getSegment()).orElse(new ArrayList<SegmentTag>());
    val tags = segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);

    String q =
        "select  dataset_timestamp, trace_id, cast (segment_tags as varchar), profile_id  \n"
            + "from whylabs.segment_traces d "
            + "where d.org_id = :orgId "
            + "  and d.dataset_id = :datasetId "
            + "  and d.dataset_timestamp >= :start\n"
            + "  and d.dataset_timestamp < :end\n";

    if (tags.length > 0) {
      q = q + " and d.segment_tags \\?\\?& CAST(:tags as text[])\n";
    }

    q = q + "  order by d.dataset_timestamp desc " + "  limit :limit offset :offset";
    val interval =
        Optional.ofNullable(request.getInterval())
            .orElse(new Interval(0, System.currentTimeMillis()));
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetId", request.getDatasetId());
    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    // request one additional row to detect more results available
    query.setParameter("limit", request.getLimit() + 1);
    query.setParameter("offset", request.getOffset());
    if (tags.length > 0) {
      query.setParameter("tags", tags, StringArrayType.INSTANCE);
    }

    val rows = query.getResultList();
    List<GetTracesBySegmentResponse.TraceRow> traces = new ArrayList<>();
    int maxRows = min(request.getLimit(), rows.size());
    for (int i = 0; i < maxRows; i++) {
      val oa = (Object[]) rows.get(i);
      long ts = ((Timestamp) oa[0]).toInstant().toEpochMilli();

      List<SegmentTag> segmentTags = new ArrayList<>();
      if (oa[2] != null) {
        segmentTags = SegmentUtils.toSegmentTags(mapper.readValue((String) oa[2], String[].class));
      }

      // legacy profileID is empty; allow for this possibility.
      BigDecimal profileId = ((BigDecimal) oa[3]);
      val token =
          RetrievalTokenV1.builder()
              .traceId((String) oa[1])
              .segmentTags(segmentTags)
              .interval(new Interval(ts, ts + 1))
              .profileId(nonNull(profileId) ? profileId.longValue() : null);

      val g =
          GetTracesBySegmentResponse.TraceRow.builder()
              .datasetTimestamp(ts)
              .traceId((String) oa[1])
              .segmentTags(segmentTags)
              .retrievalToken(retrievalTokenService.toString(token.build()))
              .build();
      traces.add(g);
    }

    return GetTracesBySegmentResponse.builder()
        .isTruncated(rows.size() > request.getLimit())
        .nextOffset((request.getOffset() + maxRows))
        .traces(traces)
        .build();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<ProfileAuditEntryResponse> listAudit(@Body GetProfileAuditEntries request) {
    val segment = Optional.ofNullable(request.getSegment()).orElse(new ArrayList<SegmentTag>());
    val tags = segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);

    String q =
        "select  dataset_timestamp, trace_id, s3_path, ingest_timestamp, reference_id, failure \n"
            + "from whylabs.profile_upload_audit d "
            + "where d.org_id = :orgId "
            + "  and d.dataset_id = :datasetId "
            + "  and d.dataset_timestamp >= :start\n"
            + "  and d.dataset_timestamp < :end\n";
    if (tags.length > 0) {
      q = q + " and d.segment_tags \\?\\?& CAST(:tags as text[])\n";
    }
    q = q + "  order by d.dataset_timestamp desc limit :limit offset :offset";

    val interval = request.getInterval();
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetId", request.getDatasetId());

    if (tags.length > 0) {
      query.setParameter("tags", tags, StringArrayType.INSTANCE);
    }

    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    query.setParameter("limit", request.getLimit());
    query.setParameter("offset", request.getOffset());

    val r = query.getResultList();
    List<ProfileAuditEntryResponse> responses = new ArrayList<>();
    for (val row : r) {
      val oa = (Object[]) row;
      val g =
          ProfileAuditEntryResponse.builder()
              .datasetTimestamp(((Timestamp) oa[0]).toInstant().toEpochMilli())
              .traceId((String) oa[1])
              .file((String) oa[2])
              .ingestTimestamp(((Timestamp) oa[3]).toInstant().toEpochMilli())
              .referenceId((String) oa[4])
              .failure((String) oa[5])
              .build();
      responses.add(g);
    }
    return responses;
  }

  @Timed(value = "whylabs.profileservice.timeseries")
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<TimeSeriesProfileResponse> timeSeriesQuery(TimeSeriesProfileRequest request) {
    /**
     * Made a change to hit the audit table instead of the profiles table as there's 1-2 orders of
     * magnitude fewer rows. This works under the assumption that a V1 profile upload only contains
     * a single dataset timestamp. If or when we break that assumption we'll have to reconsider the
     * approach here.
     */
    String q =
        "select extract(epoch from date_trunc(:granularity, d.dataset_timestamp AT TIME ZONE 'UTC'))*1000 as timestamp\n"
            + "from whylabs.profile_timeseries d "
            + "where d.org_id = :orgId "
            + "  and d.dataset_id in (:datasetIds) "
            + "  and d.dataset_timestamp >= :start\n"
            + "  and d.dataset_timestamp < :end\n"
            + "  group by timestamp ";

    val interval = request.getInterval();
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetIds", request.getDatasetIds());
    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    query.setParameter("granularity", request.getGranularity().asSQL());

    val r = query.getResultList();
    List<TimeSeriesProfileResponse> responses = new ArrayList<>();
    for (val row : r) {
      val g = TimeSeriesProfileResponse.builder().ts(((BigDecimal) row).longValue()).build();
      responses.add(g);
    }

    return responses;
  }

  /**
   * Infer entity-schema from metrics in postgres. This API exists to allowed resetting schema
   * attributes like discrete or column types if they change after initial ingestion.
   */
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public EntitySchema inferEntitySchema(InferSchemaRequest rqst) {
    String granularity = "P1D";
    val dataset = datasetService.getDatasetCached(rqst.getOrgId(), rqst.getDatasetId());
    if (dataset != null && dataset.getGranularity() != null) {
      granularity = dataset.getGranularity();
    }
    rqst.validateInterval(granularity);

    // Rollup all metrics over an interval in postgres. Granularity is always "all".
    // Segment is always "overall".
    val rollupRqst =
        ProfileRollupRequest.builder()
            .orgId(rqst.getOrgId())
            .datasetId(rqst.getDatasetId())
            .interval(rqst.getInterval())
            .granularity(DataGranularity.all)
            .build();
    final LinkedHashMap<Object, Map<String, Map<String, ColumnMetric>>> rollup =
        rawRollupGrouped(rollupRqst);

    val entitySchemaInference = entitySchemaInferenceFactory(null);

    rollup
        .values()
        .forEach(
            m ->
                m.forEach(
                    (columnName, metrics) ->
                        entitySchemaInference.accummulateSchema(
                            columnName, toColumnMessage(metrics))));

    return entitySchemaInference.getEntitySchema();
  }

  /**
   * schema inference operates on raw whylog profiles, encoded as protobuf messages. In order to
   * facilitate inference on metrics extracted from postgres, convert ColumnMetric map to
   * protobuf-defined ColumnMessage.
   */
  private static ColumnMessage toColumnMessage(Map<String, ColumnMetric> m) {
    val colMsgBuilder = ColumnMessage.newBuilder();

    final Consumer<StandardMetrics> addMsg =
        (stdMetric) -> {
          if (m.get(stdMetric.getPath()) != null)
            colMsgBuilder.putMetricComponents(
                stdMetric.getPath(), m.get(stdMetric.getPath()).toProtobuf());
        };

    // these are the only metrics that are relevant for determining entity schema
    addMsg.accept(COUNT_TYPES_OBJECTS);
    addMsg.accept(COUNT_TYPES_FRACTIONAL);
    addMsg.accept(COUNT_TYPES_INTEGRAL);
    addMsg.accept(COUNT_TYPES_BOOLEAN);
    addMsg.accept(COUNT_TYPES_STRING);
    addMsg.accept(COUNT_N);
    addMsg.accept(HLL);

    return colMsgBuilder.build();
  }

  public ai.whylabs.core.configV3.structure.EntitySchema getEntitySchema(String originalFile) {
    try (val fit = new WhylogsFileIterator(originalFile, s3)) {
      // iterate over delimited regions in the profile
      while (fit.hasNext()) {
        val mit = fit.next();
        val metadata = mit.getMetadata();
        metadata.addAll(fit.getMetadata());

        // publish reassembled V1 profiles to downstream consumer
        val schemaInference = entitySchemaInferenceFactory(metadata);
        mit.forEachRemaining(
            pair -> schemaInference.accummulateSchema(pair.getKey(), pair.getValue()));
        return schemaInference.getEntitySchema();
      }
    } catch (IllegalArgumentException | IOException e) {
      log.error("Cannot read {} - {}", originalFile, e.getMessage());
    }

    return null;
  }

  @SneakyThrows
  public void publishEntitySchema(String originalFile) {
    try (val fit = new WhylogsFileIterator(originalFile, s3)) {
      // iterate over delimited regions in the profile
      while (fit.hasNext()) {
        val mit = fit.next();
        val metadata = mit.getMetadata();
        metadata.addAll(fit.getMetadata());

        // infer entity schema from profile
        val entitySchemaInference = entitySchemaInferenceFactory(metadata);
        mit.forEachRemaining(
            pair -> entitySchemaInference.accummulateSchema(pair.getKey(), pair.getValue()));

        // publish entity schema to kinesis stream
        entitySchemaInference.publish();

        // send entity schema to postgres too!
        val schema = entitySchemaInference.getEntitySchema();
        entitySchemaService.save(metadata.getOrgId(), metadata.getDatasetId(), schema, true);
      }
    } catch (IllegalArgumentException | IOException e) {
      log.error("Cannot read {} - {}", originalFile, e.getMessage());
      throw e;
    }
  }

  // order of FIELD enums follows order of parameters in sql 'INSERT INTO' statement.
  // field indexes begin with 1, so skip the first enum value
  private enum FIELD {
    __spacer__,
    profile_id,
    trace_id,
    dataset_timestamp,
    org_id,
    dataset_id,
    dataset_type,
    column_name,
    metric_path,
    mergeable_segment,
    segment_text,
    kll,
    hll,
    frequent_items,
    n_sum,
    n_min,
    n_max,
    d_sum,
    d_min,
    d_max,
    variance,
    classification,
    regression,
    // Tip: Keep ref id as the last one and you'll have an easier time
    reference_id,
    __last__
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @VisibleForTesting
  public List<ModelRollup> rollup(ProfileRollupRequest rqst) throws SQLException, IOException {

    val metrics = rawRollupGrouped(rqst);

    // Gather all maps into ModelRollup struct(s).
    // Apply postaggregators.
    val splitPoints =
        Optional.ofNullable(rqst.getSplitPoints())
            .map(f -> f.stream().mapToDouble(Double::doubleValue).toArray())
            .orElse(null);
    val numBins = rqst.getNumBins();
    val fractions =
        Optional.ofNullable(rqst.getFractions())
            .map(f -> f.stream().mapToDouble(Double::doubleValue).toArray())
            .orElse(null);

    val postAgg = new PostAggregators(numBins, splitPoints, fractions);
    val rollup =
        metrics.entrySet().stream()
            .map(
                me -> {
                  return ModelRollup.builder()
                      .timestamp((Long) me.getKey())
                      .features(
                          me.getValue().entrySet().stream()
                              .collect(
                                  Collectors.toMap(
                                      fe -> fe.getKey(),
                                      fe -> {
                                        val rows = postAgg.calculate(fe.getValue());
                                        return new FeatureRollup(rows);
                                      })))
                      .build();
                })
            .collect(Collectors.toList());

    return rollup;
  }

  @NotNull
  public LinkedHashMap<Object, Map<String, Map<String, ColumnMetric>>> rawRollupGrouped(
      ProfileRollupRequest rqst) {

    // results will be grouped by timestamp or by segmentKeyValue, but not both.
    val metrics =
        rawRollup(rqst).stream()
            .collect(
                Collectors.groupingBy(
                    ColumnMetricEntity::getGroupBy,
                    LinkedHashMap::new,
                    Collectors.groupingBy(
                        ColumnMetricEntity::getColumnName,
                        Collectors.toMap(
                            ColumnMetricEntity::getMetricPath, row -> new ColumnMetric(row)))));

    return metrics;
  }

  @NotNull
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<ColumnMetricEntity> rawRollup(ProfileRollupRequest rqst) {
    log.trace("rollupRequest: {}", rqst);

    val granularity = Optional.ofNullable(rqst.getGranularity()).orElse(DataGranularity.daily);
    val columnNames = Optional.ofNullable(rqst.getColumnNames()).orElse(new ArrayList<String>());
    val segment = Optional.ofNullable(rqst.getSegment()).orElse(new ArrayList<SegmentTag>());
    val tags = segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
    val interval = rqst.getInterval();

    val query =
        (NativeQueryImpl)
            roEntityManager.createNativeQuery(
                rollupProfileSql.replace(
                    REPLACEMENT_TABLE_SIGNAL_VALUE,
                    profileTableResolutionStrategy.getTable(
                        rqst.getSegment(),
                        rqst.getSegmentKey(),
                        rqst.getGranularity(),
                        rqst.getOrgId(),
                        rqst.getDatasetId())),
                ColumnMetricEntity.class);

    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter("columnNames", columnNames, StringArrayType.INSTANCE);
    query.setParameter("traceId", rqst.getTraceId());
    query.setParameter("profileId", rqst.getProfileId());
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTS", new Timestamp(interval.getEndMillis()));
    query.setParameter("granularity", granularity.asSQL());
    query.setParameter("tags", tags, StringArrayType.INSTANCE);
    query.setParameter("segmentKey", rqst.getSegmentKey());

    return query.getResultList();
  }

  @Transactional
  @VisibleForTesting
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<ColumnMetricEntity> getReferenceProfileSketchesRaw(ReferenceProfileRequest rqst) {
    val segment = Optional.ofNullable(rqst.getSegment()).orElse(Collections.emptyList());
    val tags = segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);

    val query =
        (NativeQueryImpl)
            roEntityManager.createNativeQuery(referenceProfileSql, ColumnMetricEntity.class);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter("referenceId", rqst.getReferenceProfileId());
    val columnNames = Optional.ofNullable(rqst.getColumnNames()).orElse(new ArrayList<String>());
    query.setParameter("columnNames", columnNames, StringArrayType.INSTANCE);
    query.setParameter("segment_tags", tags, StringArrayType.INSTANCE);

    return query.getResultList();
  }

  @Transactional
  @VisibleForTesting
  public List<ModelRollup> getReferenceProfileSketches(ReferenceProfileRequest rqst)
      throws SQLException, IOException {

    List<ColumnMetricEntity> results = getReferenceProfileSketchesRaw(rqst);

    // Group `results` by dataset_timestamp and column_name into hierarchy of maps.
    val metrics =
        results.stream()
            .collect(
                Collectors.groupingBy(
                    ColumnMetricEntity::getReferenceId,
                    LinkedHashMap::new,
                    Collectors.groupingBy(
                        ColumnMetricEntity::getColumnName,
                        Collectors.toMap(ColumnMetricEntity::getMetricPath, ColumnMetric::new))));

    // Gather all maps into ModelRollup struct(s).
    // Apply postaggregators.
    val splitPoints =
        Optional.ofNullable(rqst.getSplitPoints())
            .map(f -> f.stream().mapToDouble(Double::doubleValue).toArray())
            .orElse(null);
    val numBins = rqst.getNumBins();
    val fractions =
        Optional.ofNullable(rqst.getFractions())
            .map(f -> f.stream().mapToDouble(Double::doubleValue).toArray())
            .orElse(null);
    val postAgg = new PostAggregators(numBins, splitPoints, fractions);
    val rollup =
        metrics.entrySet().stream()
            .map(
                me -> {
                  return ModelRollup.builder()
                      .referenceId(me.getKey()) //
                      .timestamp(0L) //
                      .features(
                          me.getValue().entrySet().stream()
                              .collect(
                                  Collectors.toMap(
                                      Map.Entry::getKey,
                                      fe -> {
                                        val rows = postAgg.calculate(fe.getValue());
                                        return new FeatureRollup(rows);
                                      })))
                      .build();
                })
            .collect(Collectors.toList());

    return rollup;
  }

  @Data
  static class NumericMetricsResult {
    private final String datasetId;
    private final String columnName;
    private final double sum;
  }

  /**
   * Request application of various analyzer metrics to rolled-up profile statistics. The set of
   * possible metrics were derived from those available to the Monitor analyzer. Results from this
   * request are structured in the same way as results from `getReferenceProfileSketches()` and
   * `rollup()`, a hierarchy of maps, grouped by timestamp at the top level, then by feature name,
   * then by metric name.
   *
   * <p>"metric" is admittedly overused, and sometimes refers to statistical values or sketches
   * extracted from whylogs profiles, and at other times refers to derived metrics calculated from
   * those statistical profiles.
   *
   * @param rqst
   * @return
   * @throws SQLException
   */
  @SneakyThrows
  public List<ModelRollup> getNumericMetricsForTimeRange(NumericMetricsForTimeRangeRequest rqst)
      throws SQLException {

    // Issue rollup query for each DatasetAndColumn specification in the request.
    val results = new ArrayList();
    for (val selector : rqst.getDatasetColumnSelectors()) {

      val metricsRequest =
          NumericMetricsRequest.builder()
              .orgId(rqst.getOrgId())
              .segment(rqst.getSegment())
              .granularity(rqst.getGranularity())
              .interval(rqst.getInterval())
              .selector(selector)
              .build();

      val rollup = fetchRollupMetrics(metricsRequest);

      // Query results are collected into a hierarchy of maps, grouped by timestamp at the top
      // level, then by feature name,
      // then by metric_path.
      //
      // unpack query results and apply derived metric calculations.
      val metrics =
          rollup.entrySet().stream()
              .map(
                  byTimestamp -> {
                    return ModelRollup.builder()
                        .datasetId(selector.getDatasetId())
                        .timestamp((Long) byTimestamp.getKey())
                        .features(
                            byTimestamp.getValue().entrySet().stream()
                                .map(
                                    e -> {
                                      val m =
                                          applyMetric(
                                              selector.getMetric(),
                                              (Map<String, ColumnMetric>) e.getValue());
                                      if (m == null) return null; // skip - no metric available.
                                      m.put(UPLOAD_TS_PATH, e.getValue().get(UPLOAD_TS_PATH));
                                      e.setValue(m);
                                      return e;
                                    })
                                .filter(e -> e != null)
                                .collect(
                                    Collectors.toMap(
                                        byFeature -> byFeature.getKey(),
                                        byFeature -> new FeatureRollup(byFeature.getValue()))))
                        .build();
                  })
              .collect(Collectors.toList());

      // collect results from all DatasetColumnSelectors together.
      results.addAll(metrics);
    }
    return results;
  }

  /**
   * The distinction between this query and getNumericMetricsForTimeRange is this query aggregates
   * metrics by tag value, in addition to the usual org/model/feature and timestamp.
   *
   * <p>For example, if this query is called with segmentKey="age", the results would be grouped by
   * all the distinct values of age, "age=old"m "age=middle", and "age=young".
   */
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @SneakyThrows
  public List<ModelRollup> getNumericMetricsForSegmentKey(NumericMetricsForSegmentKeyRequest rqst)
      throws SQLException {

    val interval = Interval.parse(rqst.getInterval());

    // Issue rollup query for each DatasetAndColumn specification in the request.
    val results = new ArrayList();
    for (val selector : rqst.getDatasetColumnSelectors()) {

      val metricsRequest =
          NumericMetricsRequest.builder()
              .orgId(rqst.getOrgId())
              .segmentKey(rqst.getSegmentKey())
              .granularity(DataGranularity.all)
              .interval(interval)
              .selector(selector)
              .build();

      val rollup = fetchRollupMetrics(metricsRequest);

      // rollup contains metrics for a single model that have been aggregated by
      // segmentKeyValue (e.g. age=old) and feature name.
      //
      // unpack results and apply derived metric calculation.
      val metrics =
          rollup.entrySet().stream()
              .map(
                  bySegmentValue -> {
                    return SegmentKeyRollup.builder()
                        .datasetId(selector.getDatasetId())
                        .segmentKeyValue((String) bySegmentValue.getKey())
                        .features(
                            bySegmentValue.getValue().entrySet().stream()
                                .map(
                                    e -> {
                                      val m = applyMetric(selector.getMetric(), e.getValue());
                                      if (m == null) return null; // skip - no metric available.
                                      m.put(UPLOAD_TS_PATH, e.getValue().get(UPLOAD_TS_PATH));
                                      e.setValue(m);
                                      return e;
                                    })
                                .filter(Objects::nonNull)
                                .collect(
                                    Collectors.toMap(
                                        byFeature -> byFeature.getKey(),
                                        byFeature -> new FeatureRollup(byFeature.getValue()))))
                        .build();
                  })
              .collect(Collectors.toList());

      // collect results from all DatasetColumnSelectors together.
      results.addAll(metrics);
    }
    return results;
  }

  /**
   * Apply `metricName` extractor to metrics for a single feature. Each `ColumnMetric` must hold
   * metrics for a single org/model/columnName/timestamp.
   *
   * <p>Returns a transformed Map entry with feature name as the key and a map with a single
   * ColumnMetric containing the extracted metric.
   */
  @Nullable
  private static Map<String, ColumnMetric> applyMetric(
      String metricName, Map<String, ColumnMetric> byMetricPath) {
    // byMetricPath will map of one-or-more columnMetrics,
    // e.g. "counts/null" -> { longs: 292992 }

    // the metric requested in DatasetColumnSelectors
    AnalysisMetric metric = AnalysisMetric.fromName(metricName);
    // apply the metric extractor and package the results.
    Double aDouble = metric.apply(byMetricPath);
    // if extractor did not produce a value, do not wrap in a new map entry
    // so they can be filtered out of the stream.
    if (aDouble == null) return null;
    val result = new ColumnMetric(metricName, aDouble);
    val row = new HashMap<String, ColumnMetric>();
    row.put(result.getMetricPath(), result);
    return row;
  }

  /** Collect rolled up results from which analysis metrics can be derived */
  @NotNull
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public LinkedHashMap<Object, Map<String, Map<String, ColumnMetric>>> fetchRollupMetrics(
      NumericMetricsRequest rqst) throws SQLException {

    // For expediency, portions of other queries are used to fetch profile values from postgres.
    // Feature columns, classification metrics, and regression metrics are each fetched by different
    // queries.
    //
    // Each query is constrained to a single org/model over a time interval. Query results
    // are rolled-up to the requested granularity or segmentKey, and post-aggregators are NOT
    // applied.

    val selector = rqst.getSelector();

    if (selector.getMetric().equals("prediction_count")) {
      // prediction_count is a special case; tries regression and fallback to classification
      val results = fetchRegression(rqst);
      if (!results.isEmpty()) {
        return results;
      }
      return fetchClassification(rqst);
    }
    if (selector.getMetric().startsWith("classification_")) {
      return fetchClassification(rqst);
    }
    if (selector.getMetric().startsWith("regression_")) {
      return fetchRegression(rqst);
    }

    val r_rqst =
        ProfileRollupRequest.builder()
            .orgId(rqst.getOrgId())
            .datasetId(selector.getDatasetId())
            .segment(rqst.getSegment())
            .interval(rqst.getInterval())
            .columnNames(selector.getColumnNames())
            .segmentKey(rqst.getSegmentKey())
            .granularity(rqst.getGranularity())
            .build();

    return rawRollupGrouped(r_rqst);
  }

  @NotNull
  private LinkedHashMap<Object, Map<String, Map<String, ColumnMetric>>> fetchRegression(
      NumericMetricsRequest rqst) throws SQLException {
    // build a request to internal model metrics service
    val mmRqst =
        ModelMetricsRqst.builder()
            .orgId(rqst.getOrgId())
            .datasetId(rqst.getSelector().getDatasetId())
            .segment(rqst.getSegment())
            .interval(rqst.getInterval())
            .segmentKey(rqst.getSegmentKey())
            .granularity(rqst.getGranularity())
            .build();

    // fetch results from postgres and aggregate according to granularity
    Map<Object, RegressionMetrics> results = datasetMetricsService.queryRegressionMetrics(mmRqst);

    val byTimestamp = new LinkedHashMap<Object, Map<String, Map<String, ColumnMetric>>>();
    for (val e : results.entrySet()) {
      val byMetricPath = new HashMap<String, ColumnMetric>();
      byMetricPath.put("regression", new ColumnMetric("regression", e.getValue()));
      byMetricPath.put(
          UPLOAD_TS_PATH, new ColumnMetric(UPLOAD_TS_PATH, e.getValue().getLastUploadTs()));
      val byFeatureName = new HashMap<String, Map<String, ColumnMetric>>();
      byFeatureName.put("", byMetricPath); // no feature name for dataset metrics
      byTimestamp.put(e.getKey(), byFeatureName);
    }
    return byTimestamp;
  }

  @NotNull
  private LinkedHashMap<Object, Map<String, Map<String, ColumnMetric>>> fetchClassification(
      NumericMetricsRequest rqst) throws SQLException {
    // build a request to internal model metrics service
    val mmRqst =
        ModelMetricsRqst.builder()
            .orgId(rqst.getOrgId())
            .datasetId(rqst.getSelector().getDatasetId())
            .segment(rqst.getSegment())
            .interval(rqst.getInterval())
            .segmentKey(rqst.getSegmentKey())
            .granularity(rqst.getGranularity())
            .build();

    // fetch results from postgres and aggregate according to granularity
    Map<Object, ClassificationMetrics> results =
        datasetMetricsService.queryClassificationMetrics(mmRqst);

    val byTimestamp = new LinkedHashMap<Object, Map<String, Map<String, ColumnMetric>>>();
    for (val e : results.entrySet()) {
      val byMetricPath = new HashMap<String, ColumnMetric>();
      byMetricPath.put("classification", new ColumnMetric("classification", e.getValue()));
      byMetricPath.put(
          UPLOAD_TS_PATH, new ColumnMetric(UPLOAD_TS_PATH, e.getValue().getLastUploadTs()));
      val byFeatureName = new HashMap<String, Map<String, ColumnMetric>>();
      byFeatureName.put("", byMetricPath); // no feature name for dataset metrics
      byTimestamp.put(e.getKey(), byFeatureName);
    }
    return byTimestamp;
  }

  @SuppressWarnings("JpaQueryApiInspection")
  @SneakyThrows
  @VisibleForTesting
  @Async("indexer") // It's important this happens in a separate transaction so two profile updates
  // with the same tag aren't contending for row locks
  public void updateTagsTable(V1Metadata metadata) {
    val props = metadata.getProperties();
    val tags = props.getTagsMap();
    final String orgId = tags.get(ORG_ID);
    final String datasetId = tags.get(DATASET_ID);
    for (val segment : metadata.getSegmentHeader().getSegmentsList()) {
      for (val tag : segment.getTagsList()) {
        updateTagsRow(props.getDatasetTimestamp(), orgId, datasetId, tag.getKey(), tag.getValue());
      }
    }
    // insert overall segment
    updateTagsRow(props.getDatasetTimestamp(), orgId, datasetId, "", "");
  }

  @SneakyThrows
  @Transactional
  public void updateTagsRow(
      long datasetTimestamp, String orgId, String datasetId, String key, String value) {

    val tagsInsert = (NativeQueryImpl) entityManager.createNativeQuery(tagsInsertSql);
    tagsInsert.setParameter("orgId", orgId);
    tagsInsert.setParameter("datasetId", datasetId);
    tagsInsert.setParameter("tag_key", key);
    tagsInsert.setParameter("tag_value", value);
    tagsInsert.setParameter(
        "datasetTimestamp",
        java.sql.Date.from(
            Instant.ofEpochMilli(
                ComputeJobGranularities.truncateTimestamp(datasetTimestamp, Granularity.hourly))));
    tagsInsert.setParameter("uploadTimestamp", new Timestamp(now().toEpochMilli()));

    tagsInsert.executeUpdate();
  }

  @SneakyThrows
  @Transactional
  public void rollupTagsTable() {
    val tagsRollup = (NativeQueryImpl) entityManager.createNativeQuery(tagsRollupSql);
    tagsRollup.executeUpdate();
  }

  @Transactional
  public Optional<Date> getMostRecentUploadForRange(
      String orgId, String datasetId, long gte, long lt) {
    String q =
        "select max(last_upload_ts) from whylabs.profiles_overall_hypertable where org_id = :orgId and dataset_id = :datasetId and dataset_timestamp >= :gte and dataset_timestamp < :lt limit 1";
    val getLatestUpload = (NativeQueryImpl) entityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(getLatestUpload);
    getLatestUpload.setParameter("orgId", orgId);
    getLatestUpload.setParameter("datasetId", datasetId);
    getLatestUpload.setParameter("gte", java.sql.Date.from(Instant.ofEpochMilli(gte)));
    getLatestUpload.setParameter("lt", java.sql.Date.from(Instant.ofEpochMilli(lt)));
    val l = getLatestUpload.getResultList();
    if (l.size() < 1 || l.get(0) == null) {
      return Optional.empty();
    }
    return Optional.of((Date) l.get(0));
  }

  /**
   * Heuristic for typical time delay between a dataset timestamp and when it gets uploaded. This is
   * a fuzzy number which only looks at the most recent 3 months of data. In attempt to exclude
   * backfills from skewing the heuristic too much, only data uploaded within a 3d span is
   * considered.
   *
   * @param orgId
   * @param datasetId
   * @return
   */
  @Transactional
  public Optional<UploadPattern> getApproximateUploadLag(String orgId, String datasetId) {
    String q =
        "select percentile_cont(0.95) within group (order by EXTRACT(EPOCH FROM (last_upload_ts - dataset_timestamp)) / 60 asc ) as uploadLag, "
            + " percentile_cont(0.95) within group (order by EXTRACT(EPOCH FROM (last_upload_ts - first_upload_ts)) / 60 asc ) as uploadWindow "
            + " from whylabs.profiles_overall where dataset_timestamp >= :gte and last_upload_ts is not null and org_id = :orgId and dataset_id = :datasetId and EXTRACT(EPOCH FROM (last_upload_ts - dataset_timestamp)) / 60 < 4320 limit 1";
    val getLatestUpload = (NativeQueryImpl) entityManager.createNativeQuery(q);
    getLatestUpload.setParameter("orgId", orgId);
    getLatestUpload.setParameter("datasetId", datasetId);
    val cutoff = ZonedDateTime.now().minusMonths(12).toInstant().toEpochMilli();
    getLatestUpload.setParameter("gte", java.sql.Date.from(Instant.ofEpochMilli(cutoff)));
    val l = getLatestUpload.getResultList();
    if (l.size() < 1) {
      return Optional.empty();
    }
    val oa = (Object[]) l.get(0);
    val uploadLag = (Double) oa[0];
    val uploadWindow = (Double) oa[1];
    if (uploadLag == null) {
      return Optional.empty();
    }
    val u =
        UploadPattern.builder()
            .approximateUploadLagMinutes(uploadLag.longValue())
            .approximateUploadWindowMinutes(uploadWindow.longValue())
            .build();
    return Optional.of(u);
  }

  /** get the list of segments represented with non-null metrics over the given time period. */
  @Transactional
  public List<String> metricSegments(
      String orgId, String datasetId, Interval interval, String columnName, String metricPath) {
    String q =
        "select cast(segment_text as varchar) segment_text from "
            + "(select distinct(segment_text)  segment_text from whylabs.profiles_segmented\n"
            + "where org_id=:orgId AND dataset_id=:datasetId\n"
            + "AND dataset_timestamp >= CAST(:startTS as TIMESTAMP)  at time zone 'UTC' \n"
            + "AND dataset_timestamp < CAST(:endTS as TIMESTAMP)  at time zone 'UTC' \n"
            + "AND column_name=:columnName\n"
            + "AND metric_path = :metricPath) subquery";

    val query = (NativeQueryImpl<String>) entityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", orgId);
    query.setParameter("datasetId", datasetId);
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTS", new Timestamp(interval.getEndMillis()));
    query.setParameter("columnName", columnName);
    query.setParameter("metricPath", metricPath);

    val l = query.getResultList();
    return l;
  }

  @Transactional
  public TagListResponse listTagKeyValues(TagListRequest request) {

    val query = (NativeQueryImpl) entityManager.createNativeQuery(allTagsSql);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetId", request.getDatasetId());
    query.setParameter("limit", request.getLimit());
    query.setParameter("offset", request.getOffset());

    Map<String, String[]> tags = new HashMap<>();
    ArrayList<Object[]> l = (ArrayList<Object[]>) query.getResultList();
    for (val row : l) {
      String key = (String) ((Object[]) row)[0];
      String[] values = (String[]) ((Object[]) row)[1];
      tags.put(key, values);
    }

    return TagListResponse.builder().results(tags).build();
  }

  @Async
  public void copyAysnc(CopyDataRequest request) {
    copy(request);
  }

  @Transactional
  public void copy(CopyDataRequest request) {
    if (request.getInterval() != null) {
      val query = (NativeQueryImpl<String>) entityManager.createNativeQuery(copyDataSql);
      query.setParameter("sourceOrgId", request.getSourceOrgId());
      query.setParameter("targetOrgId", request.getTargetOrgId());
      query.setParameter("sourceDatasetId", request.getSourceDatasetId());
      query.setParameter("targetDatasetId", request.getTargetDatasetId());
      query.setParameter("start", new Timestamp(request.getInterval().getStartMillis()));
      query.setParameter("end", new Timestamp(request.getInterval().getEndMillis()));
      query.executeUpdate();
    }

    if (request.getProfileId() == null) {
      return;
    }
    if (request.getProfileId().equals("*")) {
      val query = (NativeQueryImpl<String>) entityManager.createNativeQuery(copyRefProfileSql);
      query.setParameter("sourceOrgId", request.getSourceOrgId());
      query.setParameter("targetOrgId", request.getTargetOrgId());
      query.setParameter("sourceDatasetId", request.getSourceDatasetId());
      query.setParameter("targetDatasetId", request.getTargetDatasetId());
      query.executeUpdate();
    } else {
      val query =
          (NativeQueryImpl<String>) entityManager.createNativeQuery(copySingleRefProfileSql);
      query.setParameter("sourceOrgId", request.getSourceOrgId());
      query.setParameter("targetOrgId", request.getTargetOrgId());
      query.setParameter("sourceDatasetId", request.getSourceDatasetId());
      query.setParameter("targetDatasetId", request.getTargetDatasetId());
      query.setParameter("referenceProfileId", request.getProfileId());
      query.executeUpdate();
    }
  }

  @SneakyThrows
  @Transactional
  @Executable
  public void delete(DeleteProfileRequest req) {
    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup
    val pst =
        db.prepareStatement(
            ConcurrencyUtils.getLockSql(
                req.getOrgId(), req.getDatasetId(), ConcurrencyUtils.Scope.both));
    pst.executeQuery();

    // Delete profile records
    List<String> tables =
        Arrays.asList(
            TABLE_NAME_OVERALL_HYPERTABLE,
            TABLE_NAME_SEGMENTED_HYPERTABLE,
            TABLE_NAME_SEGMENTED_STAGING,
            TABLE_NAME_OVERALL_STAGING);

    for (String table : tables) {
      String sql = "delete from whylabs." + table + buildWhereClause(req);
      val query = (NativeQueryImpl) entityManager.createNativeQuery(sql);
      substituteParams(query, req);
      query.executeUpdate();
    }

    // Flag entries as deleted in the audit table, but leave the record there to prevent
    // re-ingestion
    String auditSql = "update whylabs.profile_upload_audit set deleted = true ";
    if (req.getReingestAfterDeletion()) {
      // Queue up for re-ingestion
      auditSql =
          "update whylabs.profile_upload_audit set state = 'pending', deleted = false, ingest_method = 'indexProfile' ";
    }
    auditSql = auditSql + " where org_id=:orgId \n" + "    and dataset_id = :datasetId\n";
    if (req.getDelete_gte() != null) {
      auditSql = auditSql + "    and dataset_timestamp >= :start\n";
    }
    if (req.getDelete_lt() != null) {
      auditSql = auditSql + " and dataset_timestamp < :end\n";
    }
    if (req.getBeforeUploadTs() != null) {
      auditSql = auditSql + " and ingest_timestamp < :beforeLastUploadTs\n";
    }
    val query = (NativeQueryImpl) entityManager.createNativeQuery(auditSql);
    query.setParameter("orgId", req.getOrgId());
    query.setParameter("datasetId", req.getDatasetId());
    if (req.getDelete_gte() != null) {
      query.setParameter("start", java.sql.Date.from(Instant.ofEpochMilli(req.getDelete_gte())));
    }
    if (req.getDelete_lt() != null) {
      query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(req.getDelete_lt())));
    }
    if (req.getBeforeUploadTs() != null) {
      query.setParameter(
          "beforeLastUploadTs", java.sql.Date.from(Instant.ofEpochMilli(req.getBeforeUploadTs())));
    }
    query.executeUpdate();

    // Timeseries table
    String timeSeriesSql =
        "delete from whylabs.profile_timeseries where org_id=:orgId \n"
            + "    and dataset_id = :datasetId\n";
    if (req.getDelete_gte() != null) {
      timeSeriesSql = timeSeriesSql + "    and dataset_timestamp >= :start\n";
    }
    if (req.getDelete_lt() != null) {
      timeSeriesSql = timeSeriesSql + " and dataset_timestamp < :end\n";
    }
    val timeseriesDelete = (NativeQueryImpl) entityManager.createNativeQuery(timeSeriesSql);
    timeseriesDelete.setParameter("orgId", req.getOrgId());
    timeseriesDelete.setParameter("datasetId", req.getDatasetId());
    if (req.getDelete_gte() != null) {
      timeseriesDelete.setParameter(
          "start", java.sql.Date.from(Instant.ofEpochMilli(req.getDelete_gte())));
    }
    if (req.getDelete_lt() != null) {
      timeseriesDelete.setParameter(
          "end", java.sql.Date.from(Instant.ofEpochMilli(req.getDelete_lt())));
    }
    timeseriesDelete.executeUpdate();
  }

  private void substituteParams(NativeQueryImpl query, DeleteProfileRequest req) {
    query.setParameter("orgId", req.getOrgId());
    query.setParameter("datasetId", req.getDatasetId());
    if (req.getDelete_gte() != null) {
      query.setParameter("start", java.sql.Date.from(Instant.ofEpochMilli(req.getDelete_gte())));
    }
    if (req.getDelete_lt() != null) {
      query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(req.getDelete_lt())));
    }
    if (req.getBeforeUploadTs() != null) {
      query.setParameter(
          "beforeLastUploadTs", java.sql.Date.from(Instant.ofEpochMilli(req.getBeforeUploadTs())));
    }
    if (req.getColumnName() != null) {
      query.setParameter("columnName", req.getColumnName());
    }
  }

  private String buildWhereClause(DeleteProfileRequest req) {
    String sql = " where org_id=:orgId \n" + "    and dataset_id = :datasetId\n";
    if (req.getDelete_gte() != null) {
      sql = sql + "    and dataset_timestamp >= :start\n";
    }
    if (req.getDelete_lt() != null) {
      sql = sql + " and dataset_timestamp < :end\n";
    }
    if (req.getBeforeUploadTs() != null) {
      sql = sql + " and last_upload_ts < :beforeLastUploadTs\n";
    }
    if (req.getColumnName() != null) {
      sql = sql + " and column_name = :columnName\n";
    }
    return sql;
  }

  @Transactional
  public DataDeletionPreviewResponse deletePreview(DeleteProfileRequest req) {

    String sql =
        "select count(*) as rows, count(distinct(dataset_timestamp)) as unique_timestamps from whylabs."
            + PROFILES_OVERALL_VIEW
            + buildWhereClause(req);
    val query = (NativeQueryImpl) entityManager.createNativeQuery(sql);
    substituteParams(query, req);

    val r = query.getResultList();

    for (val row : r) {
      return DataDeletionPreviewResponse.builder()
          .numRows(((BigInteger) ((Object[]) row)[0]).longValue())
          .uniqueDates(((BigInteger) ((Object[]) row)[1]).longValue())
          .build();
    }

    return DataDeletionPreviewResponse.builder().numRows(0l).uniqueDates(0l).build();
  }

  private static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyy/MM/dd");
  private static final CharsetDecoder DECODER = StandardCharsets.UTF_8.newDecoder();

  private static final String EVENTTIME = "eventTime";
  private static final String ERRORCODE = "errorCode";
  private static final String ERRORMESSAGE = "errorMessage";

  private static final String TYPE = "type";
  private static final String OBJECT_TYPE = "AWS::S3::Object";
  private static final String ARN = "ARN";
  private static final String S3_PREFIX = "s3://";
  private static final String JSON_SUFFIX = ".json";

  /**
   * Replay CloudTrail events from S3. Note we only keep a limit number of days of CloudTrail
   * archive.
   */
  public void replay(ReindexFromCloudTrailRequest rqst) throws SQLException {
    ZonedDateTime d = rqst.getStart();
    while (d.isBefore(rqst.getEnd())) {
      replay(rqst.getBucket(), rqst.getPrefix(), d);
      d = d.plusDays(1);
    }
  }

  @Timed(value = "whylabs.cloudtrail.replay")
  public void replay(String bucket, String prefix, ZonedDateTime date) {
    String dateString = DATE_TIME_FORMATTER.format(date.truncatedTo(ChronoUnit.DAYS));
    String datedPrefix = prefix + dateString + "/";
    log.info("Replay scanning s3://{}/{}", bucket, datedPrefix);
    val s3ContentFetcher = new S3ClientFactory(this.s3);

    boolean hasNext = true;
    val req = new ListObjectsV2Request().withBucketName(bucket).withPrefix(datedPrefix);
    while (hasNext) {
      val batch = s3.listObjectsV2(req);
      for (val obj : batch.getObjectSummaries()) {
        String path = "s3://" + obj.getBucketName() + "/" + obj.getKey();
        if (!path.endsWith(".json.gz")) {
          // skip non-cloudtrail files
          log.info("Replay skipping S3 path {}", path);
          continue;
        }
        log.info("Replay reading s3 path {}", path);
        S3ObjectWrapper s3ObjectWrapper = s3ContentFetcher.get(path);
        InputStream contents = s3ObjectWrapper.getContentStream();
        try {
          InputStream uncompressed = new GZIPInputStream(contents);
          processRecords(uncompressed);
        } catch (IOException e) {
          // Do not let exception on one file derail ingestion.
          log.error(path, e);
        }
      }

      hasNext = batch.isTruncated();
      req.setContinuationToken(batch.getContinuationToken());
    }
  }

  /**
   * process records extracted from CloudTrail notifications. Each record is a JSON format object
   * containing potentially multiple object names that have been updated in S3. The full S3 path of
   * each object NOT ending in ".json" is extracted from the record and processed through the
   * profile ingestion path.
   */
  public void processRecords(InputStream recordStream) throws IOException {
    val reader = new JsonReader(new InputStreamReader(recordStream));
    val records = JsonParser.parseReader(reader).getAsJsonObject().getAsJsonArray("Records");

    for (JsonElement record : records) {
      // Each archived record is a single cloudtrail notification.
      //
      // This used to parse the "resources" key, but that key contains extraneous objects for
      // "CopyObject" notifications, like the source of the copy.  Better to use
      // "requestParameters" key as that works with both "PutObject" and "CopyObject" notifications.
      final JsonObject r = record.getAsJsonObject();
      final JsonObject params = r.get("requestParameters").getAsJsonObject();
      final String bucketName = params.get("bucketName").getAsString();
      final String key = params.get("key").getAsString();
      final String s3Path = "s3://" + bucketName + "/" + key;
      if (s3Path.endsWith(JSON_SUFFIX)) {
        continue;
      }
      // ignore notifications that indicate an error during upload.
      if (r.get(ERRORCODE) != null) {
        val errMsg = r.get(ERRORCODE).getAsString() + ": " + r.get(ERRORMESSAGE).getAsString();
        log.warn("%s\nskip %s", errMsg, s3Path);
        continue;
      }
      val eventTime = DateTime.parse(r.get(EVENTTIME).getAsString()).getMillis();

      log.info("Replay triggering async ingestion for path {}", s3Path);
      indexProfile(s3Path, "processRecords", eventTime);
    }
  }

  /**
   * extract S3 paths from CloudTrail notification resource objects. Each JSON resource object
   * contains Type and ARN fields. Returns a list of S3 paths NOT ending in ".json"
   */
  public static Queue<String> getPathsFromS3UploadCloudTrailNotification(JsonArray resources) {
    Queue<String> s3Paths = new LinkedList<>();

    for (JsonElement record : resources) {
      JsonObject jso = record.getAsJsonObject();
      if (jso.get(TYPE).getAsString().equals(OBJECT_TYPE)) {
        String bucketArn = jso.get(ARN).getAsString();
        String path = S3_PREFIX + Arn.fromString(bucketArn).getResourceAsString();
        if (path.endsWith(JSON_SUFFIX)) {
          continue;
        }
        s3Paths.add(path);
        log.info("Replay adding cloudtrail paths to process {}", path);
      }
    }
    return s3Paths;
  }

  /** for unit tests */
  @SneakyThrows
  @Transactional
  public void promoteHistoricalData(String orgId, String datasetId) {
    promote(ProfileService.promoteOverallTableSql, orgId, datasetId, false, false);
    promote(ProfileService.promoteSegmentedTableSql, orgId, datasetId, true, false);
  }

  /**
   * We used to promote all data written in the past hour in a single query. Unfortunately at large
   * enough data volumes that crashes PG, so we have to chunk them up into small transactions. We do
   * this by promoting single datasets per query, but multithreading it so it doesn't take forever.
   *
   * @param async
   * @throws SQLException
   */
  @SneakyThrows
  @Timed(value = "whylabs.profileservice.promote.enqueue")
  @Transactional
  public void promoteHistoricalData(boolean async, int dayThreshold, boolean avoidLockContention)
      throws SQLException {
    if (promotionsInFlight.get() > 0) {
      log.error(
          "Data promotions are taking longer than an hour, currently still have {} in flight. Either something's broken or additional threads are needed. Skipping this cycle.",
          promotionsInFlight.get());
      return;
    }

    try (Connection db = dataSource.getConnection()) {
      // Get a list of org/dataset combos that have uploaded data recently
      val st =
          db.prepareStatement(
              "select org_id, dataset_id from whylabs.dataset_statistics_rollup_2d where bucket > ? group by org_id, dataset_id");
      st.setTimestamp(1, Timestamp.from(now().minus(dayThreshold, ChronoUnit.DAYS)));
      val resultSet = st.executeQuery();

      Integer c = 0;
      while (resultSet.next()) {
        c++;
        String orgId = resultSet.getString(1);
        String datasetId = resultSet.getString(2);
        log.info("In flight promotions {}", promotionsInFlight.get());
        if (async) {
          // Merge+Move data in a multithreaded fashion, but one dataset at a time to keep the
          // query/transactions small
          promoteAsync(promoteOverallTableSql, orgId, datasetId, false, avoidLockContention);
          promoteAsync(promoteSegmentedTableSql, orgId, datasetId, true, avoidLockContention);
        } else {
          promote(promoteOverallTableSql, orgId, datasetId, false, avoidLockContention);
          promote(promoteSegmentedTableSql, orgId, datasetId, true, avoidLockContention);
        }
      }
      log.info("Triggered data promotion for {} datasets", c);
      if (c > 10000) {
        log.error(
            "Promoting over 10000 unique datasets, might be time to re-eval how well this is working");
      }
    }
  }

  public void bootstrapDatabaseForUnitTests() {
    val files = bootstrapManifest.split(System.lineSeparator());
    for (val f : files) {
      // skip blank lines and comments
      if (f.isBlank() || f.startsWith("#")) continue;
      ingestProfile(f, "bootstrap");
    }
  }

  @Async("data-promotion")
  @Transactional
  public void promoteAsync(
      String promoteSql,
      String orgId,
      String datasetId,
      boolean segmented,
      boolean avoidLockContention)
      throws SQLException {
    promote(promoteSql, orgId, datasetId, segmented, avoidLockContention);
  }

  /**
   * Pull data from the temp table we stream data into and promote it to the appropriate hypertable.
   * This gives us a chance to both merge records up to hourly granularity as well. It also gives us
   * a chance to reorder the data by org/dataset/column/ts/etc prior to promoting so that when
   * written to the hypertable its been packed more nicely at the storage level. A packed table is
   * ~2 orders of magnitude faster to query with an index scan, so we have an opportunity to
   * pre-pack data to reduce the frequency for when we'd need to repack our biggest table.
   */
  @SneakyThrows
  @Timed(value = "whylabs.profileservice.promote.processing")
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Transactional
  public void promote(
      String promoteSql,
      String orgId,
      String datasetId,
      boolean segmented,
      boolean avoidLockContention)
      throws SQLException {
    try {

      Timestamp cutoff;
      if (avoidLockContention) {
        /**
         * Retention policies on the staging tables clash with these promotion queries with postgres
         * locks
         */
        cutoff =
            new Timestamp(ZonedDateTime.now().minus(6, ChronoUnit.DAYS).toInstant().toEpochMilli());
      } else {
        cutoff = new Timestamp(0);
      }

      throttlePromotions();
      log.debug("{} promotions in flight", promotionsInFlight.incrementAndGet());
      long start = System.currentTimeMillis();
      @Cleanup Connection db = bulkDatasource.getConnection();
      if (segmented) {
        @Cleanup
        val pst =
            db.prepareStatement(
                ConcurrencyUtils.getLockSql(orgId, datasetId, ConcurrencyUtils.Scope.segmented));
        pst.executeQuery();
      } else {
        @Cleanup
        val pst =
            db.prepareStatement(
                ConcurrencyUtils.getLockSql(orgId, datasetId, ConcurrencyUtils.Scope.overall));
        pst.executeQuery();
      }

      @Cleanup val c = db.prepareCall("set jit = off");
      c.execute();

      String lineageSql =
          "select min(dataset_timestamp), max(dataset_timestamp) from whylabs.profiles_overall_staging where org_id = ? and dataset_id = ? and last_upload_ts > ?";
      List<String> segments = new ArrayList<>();
      if (segmented) {
        lineageSql =
            "select min(dataset_timestamp), max(dataset_timestamp) from whylabs.profiles_segmented_staging where org_id = ? and dataset_id = ? and last_upload_ts > ?";

        @Cleanup
        val segmentList =
            db.prepareStatement(
                "select distinct(segment_text) from whylabs.profiles_segmented_staging where org_id = ? and dataset_id = ? and last_upload_ts > ?");
        segmentList.setString(1, orgId);
        segmentList.setString(2, datasetId);
        segmentList.setTimestamp(3, cutoff);
        segmentList.execute();
        val r = segmentList.getResultSet();
        while (r.next()) {
          segments.add(r.getString(1));
        }
      }
      @Cleanup val rangeQuery = db.prepareStatement(lineageSql);
      rangeQuery.setString(1, orgId);
      rangeQuery.setString(2, datasetId);
      rangeQuery.setTimestamp(3, cutoff);
      rangeQuery.execute();
      val r = rangeQuery.getResultSet();
      while (r.next()) {
        Timestamp min = r.getTimestamp(1);
        Timestamp max = r.getTimestamp(2);
        if (min == null || max == null) {
          // No data, we can skip promotion query
          return;
        }
        @Cleanup val updateQuery = db.prepareStatement(promoteSql);
        updateQuery.setQueryTimeout(36000);

        for (val chunk : TimestampChunker.chunkTimestampsByDay(min, max)) {
          if (segmented) {
            /**
             * Promote one segment at a time to avoid seg faults when there's a lot of segments on
             * wide datasets
             */
            for (val segment : segments) {
              CountDownLatch latch = new CountDownLatch(1);
              promoteSingle(
                  promoteSql,
                  orgId,
                  datasetId,
                  chunk.getLeft(),
                  chunk.getRight(),
                  cutoff,
                  segment,
                  latch);
              latch.await(1, TimeUnit.HOURS);
            }
          } else {
            CountDownLatch latch = new CountDownLatch(1);
            promoteSingle(
                promoteSql,
                orgId,
                datasetId,
                chunk.getLeft(),
                chunk.getRight(),
                cutoff,
                null,
                latch);
            latch.await(1, TimeUnit.HOURS);
          }
        }
      }

      log.info(
          "Promoting data for {}/{} took {}ms",
          orgId,
          datasetId,
          System.currentTimeMillis() - start);
    } finally {
      promotionsInFlight.decrementAndGet();
    }
  }

  /**
   * Promote a chunk of a dataset from staging to historical tables. The main reason for breaking
   * this out into a separate method is to break the work into smaller transactions rather than a
   * bunch of queries that comprise one huge transaction. Hopefully this reduces row lock contention
   * with long running data promotions.
   */
  @SneakyThrows
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Transactional
  @Async("indexer")
  public void promoteSingle(
      String promoteSql,
      String orgId,
      String datasetId,
      Timestamp gte,
      Timestamp lt,
      Timestamp cutoff,
      String segment,
      CountDownLatch latch) {
    try {
      @Cleanup Connection db = bulkDatasource.getConnection();
      @Cleanup val updateQuery = db.prepareStatement(promoteSql);
      updateQuery.setQueryTimeout(36000);
      if (segment != null) {
        updateQuery.setString(1, orgId);
        updateQuery.setString(2, datasetId);
        updateQuery.setTimestamp(3, gte);
        updateQuery.setTimestamp(4, lt);
        updateQuery.setString(5, segment);
        updateQuery.setTimestamp(6, cutoff);
        updateQuery.setString(7, segment);
        updateQuery.addBatch();
        updateQuery.execute();
      } else {
        updateQuery.setString(1, orgId);
        updateQuery.setString(2, datasetId);
        updateQuery.setTimestamp(3, gte);
        updateQuery.setTimestamp(4, lt);
        updateQuery.setTimestamp(5, cutoff);
        updateQuery.addBatch();
        updateQuery.execute();
      }
    } finally {
      latch.countDown();
    }
  }

  @SneakyThrows
  private void throttlePromotions() {
    while (promotionsInFlight.get() >= MAX_PROMOTIONS_IN_FLIGHT) {
      Thread.sleep(100);
    }
  }

  public List<NumericMetricByProfileResponse> getNumericMetricByProfile(
      NumericMetricByProfile request) throws SQLException {

    List<ColumnMetricEntity> rows = pgRowsByProfile(request);

    final Map<Long, List<ColumnMetricEntity>> byProfile =
        rows.stream().collect(Collectors.groupingBy(ColumnMetricEntity::getProfileId));

    final List<NumericMetricByProfileResponse> results =
        byProfile.entrySet().stream()
            .map(
                e -> {
                  final Long profileId = e.getKey();
                  final List<ColumnMetricEntity> profileMetrics = e.getValue();

                  return applyNumericMetric(request.getMetric(), profileId, profileMetrics);
                })
            .collect(Collectors.toList());
    return results;
  }

  public String downloadNumericMetricByProfile(NumericMetricByProfile request) throws SQLException {

    List<NumericMetricByProfileResponse> results = getNumericMetricByProfile(request);

    CSVFormat formatHeader =
        CSVFormat.DEFAULT
            .withHeader(
                new String[] {
                  "timestamp", "trace_id", "column_name", "metric_name", "metric_value"
                })
            .withEscape('"')
            .withQuoteMode(QuoteMode.NONE);
    CSVFormat formatRecord = CSVFormat.DEFAULT.withQuoteMode(QuoteMode.NON_NUMERIC);
    String csvPath = csvPrefix + UUID.randomUUID() + ".csv";

    try (val deleter = DeleteOnCloseFile.of("NumericMetricByProfile", ".csv")) {
      FileOutputStream file = new FileOutputStream(deleter.getFile());
      OutputStreamWriter writer = new OutputStreamWriter(file);

      CSVPrinter headerPrinter = new CSVPrinter(writer, formatHeader);
      headerPrinter.flush();

      CSVPrinter recordPrinter = new CSVPrinter(writer, formatRecord);
      val csvStream =
          results.stream()
              .map(
                  r ->
                      Arrays.asList(
                          org.joda.time.Instant.ofEpochMilli(r.getDatasetTimestamp()),
                          r.getTraceId(),
                          request.getColumnName(),
                          r.getMetricName(),
                          r.getMetricValue()));

      recordPrinter.printRecords(csvStream);
      recordPrinter.flush();

      // first close will also close the FileOutputStream
      headerPrinter.close();
      recordPrinter.close();

      // upload tmp file to S3.
      s3.putObject(whylabsArtifactsBucket, csvPath, deleter.getFile());

    } catch (IOException ex) {
      throw new RuntimeException(ex);
    }

    return S3Utils.createPresignedDownload(s3, whylabsArtifactsBucket, csvPath).toString();
  }

  /**
   * Apply derived metric `metricName` to a list of profile metrics derived from a single profile.
   * Note the list of profileMetrics must contain data from a single feature (column_name) from a
   * single profile. The list is expected to contain distinct `metric_path` elements (e.g.
   * "distribution/kll", "count/n", etc) without duplicates.
   *
   * <p>Returns a single NumericMetricByProfileResponse instance; must be combined into a list to
   * complete getNumericMetricByProfile.
   */
  private NumericMetricByProfileResponse applyNumericMetric(
      final String metricName,
      final Long profileId,
      final List<ColumnMetricEntity> profileMetrics) {
    // for each set of metrics from postgres (grouped by profileID),
    // apply the requested derived metric and create a NumericMetricByProfileResponse
    // instance.
    final Comparator<SegmentTag> TAG_ORDER_V3 =
        Comparator.comparing(SegmentTag::getKey).thenComparing(SegmentTag::getValue);

    // make a map indexed by metricPath
    val metricMap =
        profileMetrics.stream()
            .collect(Collectors.toMap(ColumnMetricEntity::getMetricPath, r -> new ColumnMetric(r)));
    Map<String, ColumnMetric> m = applyMetric(metricName, metricMap);
    val metricValue = (isNull(m) ? null : m.get(metricName).getDoubles());
    val uploadTs = metricMap.get(UPLOAD_TS_PATH);
    val traceId = metricMap.get(TRACE_ID_PATH);

    final ColumnMetricEntity first = profileMetrics.get(0);
    // segment is the same in all rows
    val segment = first.getSegmentText();

    // timestamp is the same in all rows
    val ts = first.getTimestamp();
    String tokenStr = null;
    if (ts != null) {
      val token =
          RetrievalTokenV1.builder()
              .profileId(profileId)
              .interval(new Interval(ts, ts + 1))
              .segmentTags(segment);
      tokenStr = retrievalTokenService.toString(token.build());
    }

    return NumericMetricByProfileResponse.builder()
        .segment(segment)
        .lastUploadTimestamp(nonNull(uploadTs) ? uploadTs.getLongs() : null)
        .datasetTimestamp(ts)
        .metricName(metricName)
        .metricValue(metricValue)
        .retrievalToken(tokenStr)
        .traceId(nonNull(traceId) ? traceId.getStrings() : null)
        .build();
  }

  @NotNull
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<ColumnMetricEntity> pgRowsByProfile(NumericMetricByProfile rqst) {
    log.debug("rollupRequest: {}", rqst);

    val segment = Optional.ofNullable(rqst.getSegment()).orElse(new ArrayList<SegmentTag>());
    val tags = segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
    val interval = rqst.getInterval();
    val query =
        (NativeQueryImpl)
            roEntityManager.createNativeQuery(numericMetricByProfileSql, ColumnMetricEntity.class);
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter(
        "columnNames", Arrays.asList(rqst.getColumnName()), StringArrayType.INSTANCE);
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTS", new Timestamp(interval.getEndMillis()));
    query.setParameter("tags", tags, StringArrayType.INSTANCE);
    query.setParameter("traceId", rqst.getTraceId());
    query.setReadOnly(true);
    return query.getResultList();
  }

  public List<NumericMetricByProfileResponse> getNumericMetricByReference(
      NumericMetricByReference rqst) throws SQLException {

    val rawRqst =
        ReferenceProfileRequest.builder()
            .referenceProfileId(rqst.getReferenceId())
            .orgId(rqst.getOrgId())
            .datasetId(rqst.getDatasetId())
            .columnNames(Collections.singletonList(rqst.getColumnName()))
            .segment(rqst.getSegment())
            .build();
    List<ColumnMetricEntity> rows = getReferenceProfileSketchesRaw(rawRqst);
    // short-circuit if no matching reference profile.
    if (rows.size() == 0) {
      return Collections.emptyList();
    }

    final Map<Long, List<ColumnMetricEntity>> byProfile = ImmutableMap.of(0L, rows);

    final List<NumericMetricByProfileResponse> results =
        byProfile.entrySet().stream()
            .map(
                e -> {
                  final Long profileId = e.getKey();
                  final List<ColumnMetricEntity> profileMetrics = e.getValue();

                  return applyNumericMetric(rqst.getMetric(), profileId, profileMetrics);
                })
            .collect(Collectors.toList());
    return results;
  }

  /**
   * Returns list of columns (feature names) that have metrics within a given time range and
   * segment. Intended to address the sparse-profile problem seen on the profiles page, when some or
   * many of the features in entity schema are not present in the given time range.
   */
  @SneakyThrows
  @NotNull
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<String> getActiveColumns(ColumnNameListRequest rqst) throws SQLException {
    //  Chooses between two different sql queries, depending on whether referenceID is set or not.
    // All queries include orgID, datasetID, and segment.

    final NativeQueryImpl query;
    if (rqst.getRefProfileId() == null) {
      // query batch profiles...
      String activeColumnsSql =
          active_batch_columns_query.replace(
              REPLACEMENT_TABLE_SIGNAL_VALUE,
              profileTableResolutionStrategy.getTable(
                  rqst.getSegment(),
                  null,
                  DataGranularity.all,
                  rqst.getOrgId(),
                  rqst.getDatasetId()));

      // note: query accesses `profiles_overall_hypertable`, which is eventually consistent
      // without the overhead of querying the staging table.
      query = (NativeQueryImpl) roEntityManager.createNativeQuery(activeColumnsSql);
      val interval = rqst.getInterval();
      if (interval == null) {
        throw new IllegalArgumentException("interval must not be null");
      }
      query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
      query.setParameter("endTS", new Timestamp(interval.getEndMillis()));
    } else {
      // query reference profiles...
      query = (NativeQueryImpl) roEntityManager.createNativeQuery(active_reference_columns_query);
      query.setParameter("referenceProfileId", rqst.getRefProfileId());
    }

    val segment = Optional.ofNullable(rqst.getSegment()).orElse(new ArrayList<SegmentTag>());
    val segmentTags =
        segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter("segmentTags", segmentTags, StringArrayType.INSTANCE);
    query.setReadOnly(true);
    return query.getResultList();
  }

  @SneakyThrows
  @NotNull
  @Transactional
  public Map<String, Long> getTableSizes() {
    Map<String, Long> counts = new HashMap<>();

    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup
    val pst = db.prepareStatement("select count(*) as c from whylabs.profiles_overall_hypertable");
    val r = pst.executeQuery();
    r.next();
    counts.put("profiles_overall_hypertable", r.getLong("c"));

    /* Hold off til more PRs get merged for the new profile table
    @Cleanup
    val pst2 =
            db.prepareStatement("select count(*) as c from whylabs.profiles_overall_hypertable_rev2");
    val r2 = pst2.executeQuery();
    r2.next();
    counts.put("profiles_overall_hypertable_rev2", r2.getLong("c"));*/

    @Cleanup
    val pst3 = db.prepareStatement("select count(*) as c from whylabs.profiles_overall_staging");
    val r3 = pst3.executeQuery();
    r3.next();
    counts.put("profiles_overall_staging", r3.getLong("c"));

    @Cleanup
    val pst4 =
        db.prepareStatement("select count(*) as c from whylabs.profiles_segmented_hypertable");
    val r4 = pst4.executeQuery();
    r4.next();
    counts.put("profiles_segmented_hypertable", r4.getLong("c"));

    @Cleanup
    val pst5 = db.prepareStatement("select count(*) as c from whylabs.profiles_segmented_staging");
    val r5 = pst5.executeQuery();
    r5.next();
    counts.put("profiles_segmented_staging", r5.getLong("c"));

    @Cleanup
    val pst6 =
        db.prepareStatement("select count(*) as c from whylabs.profiles_segmented_staging_silver");
    val r6 = pst5.executeQuery();
    r6.next();
    counts.put("profiles_segmented_staging_silver", r6.getLong("c"));

    @Cleanup
    val pst7 =
        db.prepareStatement("select count(*) as c from whylabs.profiles_overall_staging_silver");
    val r7 = pst5.executeQuery();
    r7.next();
    counts.put("profiles_overall_staging_silver", r7.getLong("c"));

    return counts;
  }

  @SneakyThrows
  @NotNull
  @Transactional
  public void populateTraceId(String orgId, String datasetId, String traceId) {
    @Cleanup Connection db = dataSource.getConnection();
    for (val table :
        Arrays.asList(
            TABLE_NAME_SEGMENTED_HYPERTABLE,
            TABLE_NAME_SEGMENTED_STAGING,
            TABLE_NAME_OVERALL_STAGING,
            TABLE_NAME_OVERALL_HYPERTABLE,
            TABLE_NAME_UNMERGED)) {
      @Cleanup
      val pst =
          db.prepareStatement(
              "update whylabs." + table + " set trace_id = ? where org_id = ? and dataset_id = ?");
      pst.setString(1, traceId);
      pst.setString(2, orgId);
      pst.setString(3, datasetId);
      pst.executeUpdate();
    }
  }

  @Transactional
  @SneakyThrows
  public void cloneDemoData(String orgId, String datasetId, long gte, long lt, Long offsetDays) {
    try (Connection db = dataSource.getConnection()) {
      @Cleanup
      val getProfileUploads =
          db.prepareStatement(
              "select s3_path from whylabs.profile_upload_audit where org_id = ? and dataset_id = ? and dataset_timestamp >= ? and dataset_timestamp < ?");
      getProfileUploads.setString(1, orgId);
      getProfileUploads.setString(2, datasetId);
      getProfileUploads.setTimestamp(3, new Timestamp(gte));
      getProfileUploads.setTimestamp(4, new Timestamp(lt));
      val r = getProfileUploads.executeQuery();
      while (r.next()) {
        BinMetadata meta = null;
        try {
          meta = metadataSvc.fetchBinMetadata(r.getString(1));
        } catch (AmazonClientException e) {
          log.info("Failed to retrieve {}", r.getString(1));
        }

        val s3Uri = new AmazonS3URI(r.getString(1));
        val bucket = s3Uri.getBucket();
        val key = s3Uri.getKey();
        if (meta == null || meta.getDatasetTimestamp() == null) {
          log.info("{} had no timestamp, clone is skipping", r.getString(1));
          continue;
        }

        val ts =
            ZonedDateTime.ofInstant(
                Instant.ofEpochMilli(meta.getDatasetTimestamp()), ZoneOffset.UTC);
        val tsAdvanced = ts.plus(offsetDays, ChronoUnit.DAYS);
        val keyPieces = key.split("/");
        val destinationKey =
            StringUtils.join(
                Arrays.asList(
                    keyPieces[0],
                    // Put into current bucket so it gets picked up by datalake writer job
                    ZonedDateTime.now().format(IndexerService.DATE_TIME_FORMATTER),
                    keyPieces[2].replace(
                        ts.format(IndexerService.DATE_TIME_FORMATTER),
                        tsAdvanced.format(IndexerService.DATE_TIME_FORMATTER))),
                "/");

        val destinationKeyJson = destinationKey.replace(".bin", ".json");

        val metadata = new ObjectMetadata();
        meta.setDatasetTimestamp(tsAdvanced.toInstant().toEpochMilli());
        val newMetadata = objectMapper.writeValueAsString(meta).getBytes(StandardCharsets.UTF_8);
        metadata.setContentLength(newMetadata.length);
        val is = new ByteArrayInputStream(newMetadata);

        log.info("Copying {} to {}", key, destinationKey);
        s3.putObject(new PutObjectRequest(bucket, destinationKeyJson, is, metadata));

        s3.copyObject(
            new CopyObjectRequest(
                s3Uri.getBucket(), s3Uri.getKey(), s3Uri.getBucket(), destinationKey));
      }
    }
  }
}
