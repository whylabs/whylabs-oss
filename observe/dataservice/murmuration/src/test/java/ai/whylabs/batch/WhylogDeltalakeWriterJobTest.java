package ai.whylabs.batch;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertFalse;
import static org.testng.AssertJUnit.assertEquals;
import static org.testng.AssertJUnit.assertNotNull;
import static org.testng.AssertJUnit.assertNull;
import static org.testng.AssertJUnit.assertTrue;

import ai.whylabs.batch.jobs.*;
import ai.whylabs.batch.udfs.ExtractOrgIdFromPath;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.enums.Granularity;
import ai.whylabs.core.enums.IngestionOrigin;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import ai.whylabs.core.structures.DatalakeRowV2;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.google.common.collect.ImmutableList;
import io.delta.tables.DeltaTable;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.io.FileUtils;
import org.apache.spark.sql.*;
import org.testng.annotations.Test;

@Test
public class WhylogDeltalakeWriterJobTest extends BaseTest {

  @Test
  public void testJob() throws Exception {
    String inputProfiles = Objects.requireNonNull(getClass().getResource("/profiles")).getPath();
    String inputProfiles2 =
        Objects.requireNonNull(getClass().getResource("/profile_with_dupes")).getPath();
    String inputConfigs =
        Objects.requireNonNull(getClass().getResource("/monitorConfigV3JsonDateOrdered")).getPath();

    val configsTmp = Files.createTempDirectory("configsDelta");

    val profilesDatalakeV2Tmp = Files.createTempDirectory("deltaV2Tmp");
    String orgConfig = Objects.requireNonNull(getClass().getResource("/config.json")).getPath();

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-source",
                inputProfiles,
                "-monitorConfigChanges",
                inputConfigs,
                "-orgConfig",
                orgConfig,
                "-profilesDatalakeV2",
                profilesDatalakeV2Tmp.toString(),
                "-monitorConfigV3",
                configsTmp.toString(),
                "-skipManifestGeneration",
                "-currentTime",
                "2021-05-15T22:38:07Z",
                "-duration",
                Granularity.P1D.name())
            .toArray(new String[0]);

    job.run(args);

    long v2Rows = DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString()).toDF().count();
    /** Test ReingestDatalakeProfilesJob which will re-ingest everything * */
    val args3 =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-orgId",
                "org-1",
                "-datasetId",
                "org-1",
                "-profilesDatalakeV2",
                profilesDatalakeV2Tmp.toString(),
                "-currentTime",
                "2024-01-15T22:38:07Z",
                "-duration",
                Granularity.P1D.name())
            .toArray(new String[0]);

    val reingestJob = new ReingestDatalakeProfilesJob();
    reingestJob.run(args3);
    val countAfterRebuild =
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString()).toDF().count();
    assertEquals(countAfterRebuild, v2Rows);
    for (val r :
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString())
            .toDF()
            .filter(col(DatalakeRowV2.Fields.type).equalTo(ProfileColumnType.MERGED.name()))
            .collectAsList()) {
      val c =
          ZonedDateTime.parse("2024-01-15T22:38:07Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
              .truncatedTo(ChronoUnit.HOURS);
      long ts = (Long) r.getAs(DatalakeRowV2.Fields.datalakeWriteTs);
      assertTrue(ts >= c.toInstant().toEpochMilli());
    }

    // Run twice to ensure merge into deduplicates the record

    job.run(args);

    long v2RowsSecondRun =
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString()).toDF().count();

    assertEquals(v2Rows, v2RowsSecondRun);

    Dataset<Row> configsDf = DeltaTable.forPath(spark, configsTmp.toString()).toDF();
    val configs = configsDf.collectAsList();
    assertEquals(1, configs.size());
    assertEquals("org-11", configs.get(0).getAs(MonitorConfigV3Row.Fields.orgId));
    assertEquals("model-0", configs.get(0).getAs(MonitorConfigV3Row.Fields.datasetId));
    assertNotNull("model-0", configs.get(0).getAs(MonitorConfigV3Row.Fields.id));
    assertTrue(configs.get(0).getAs(MonitorConfigV3Row.Fields.jsonConf).toString().length() > 100);

    /** Third run is to test incremental updates to the V2 table * */
    val args2 =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-source",
                inputProfiles2, // New paths
                "-monitorConfigChanges",
                inputConfigs,
                "-monitorConfigV3",
                configsTmp.toString(),
                "-skipManifestGeneration",
                "-currentTime",
                "2021-05-15T22:38:07Z",
                "-duration",
                Granularity.P1D.name())
            .toArray(new String[0]);

    job.run(args2);
    long v2RowsThirdRun =
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString()).toDF().count();
    assertTrue(v2Rows < v2RowsThirdRun);
  }

  @Test
  public void testLogAsyncIngestion() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/logAsyncSample")).getPath();
    val tmp = Files.createTempDirectory("delta");

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-asyncSource",
                inputProfiles,
                "-monitorConfigV3",
                "/tmp/empty_config_location",
                "-currentTime",
                "2021-05-15T22:38:07Z",
                "-skipManifestGeneration",
                "-duration",
                Granularity.P1D.name(),
                "-profilesDatalakeV2",
                tmp.toString())
            .toArray(new String[0]);

    try {
      job.run(args);

      Dataset<Row> df = DeltaTable.forPath(spark, tmp.toString()).toDF();
      val raw =
          df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.RAW.name())))
              .filter(col(Fields.orgId).equalTo(lit("org-42")))
              .collectAsList();
      Row rowRaw = raw.get(0);

      // Overrides from the json file from logAsync
      assertEquals("org-42", rowRaw.getAs(DatalakeRowV2.Fields.orgId));
      assertEquals("model-22", rowRaw.getAs(DatalakeRowV2.Fields.datasetId));
      val segment = rowRaw.getAs(DatalakeRowV2.Fields.segmentText);

      List<String> allowed = ImmutableList.of("price=high", "status=xdelivered");
      assertEquals("price=high&status=xdelivered", segment);

      assertEquals(
          java.util.Optional.of(1627862400000l),
          Optional.of(rowRaw.getAs(DatalakeRowV2.Fields.datasetTimestamp)));
      assertEquals(
          IngestionOrigin.WhylogDeltalakeWriterJob.name(), rowRaw.getAs(Fields.ingestionOrigin));

      assertTrue(rowRaw.getAs(DatalakeRowV2.Fields.mergedRecordWritten));
      assertThat(raw.size(), is(1));

      val merged =
          df.filter(col(DatalakeRowV2.Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())))
              .filter(col(DatalakeRowV2.Fields.orgId).equalTo(lit("org-42")))
              .collectAsList();
      Row rowMerged = merged.get(0);

      // Overrides from the json file from logAsync
      assertEquals("org-42", rowMerged.getAs(DatalakeRowV2.Fields.orgId));
      assertEquals("model-22", rowMerged.getAs(DatalakeRowV2.Fields.datasetId));
      assertEquals(
          java.util.Optional.of(1627862400000l),
          Optional.of(rowMerged.getAs(DatalakeRowV2.Fields.datasetTimestamp)));
      assertEquals(
          IngestionOrigin.WhylogDeltalakeWriterJob.name(),
          rowRaw.getAs(DatalakeRowV2.Fields.ingestionOrigin));
      assertEquals(
          IngestionOrigin.WhylogDeltalakeWriterJob.name(), rowMerged.getAs(Fields.ingestionOrigin));
      assertNull(rowMerged.getAs(Fields.mergedRecordWritten));

      val colCount =
          df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())))
              .filter(col(Fields.orgId).equalTo(lit("org-42")))
              .count();
      assertEquals(colCount, 2);
    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  @Test
  public void testSingleReferenceProfile() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/reference-profiles")).getPath();
    val tmp = Files.createTempDirectory("delta");

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-singleRefProfileSource",
                inputProfiles,
                "-currentTime",
                "2021-10-16T22:38:07Z",
                "-skipManifestGeneration",
                "-duration",
                Granularity.P1D.name(),
                "-profilesDatalakeV2",
                tmp.toString())
            .toArray(new String[0]);

    try {
      job.run(args);
      Dataset<DatalakeRowV2> df =
          DeltaTable.forPath(spark, tmp.toString()).toDF().as(Encoders.bean(DatalakeRowV2.class));

      val rows = df.collectAsList();
      assertEquals(3, rows.size());
      for (val rowRef : rows) {
        // Overrides from the json file from logAsync
        assertEquals("org-00", rowRef.getOrgId());
        assertEquals("model-00", rowRef.getDatasetId());
        assertEquals("ref-ZOZliYhAItjw5B7Y", rowRef.getReferenceProfileId());
        ProfileColumnType type = rowRef.getType();
        if (type.equals(ProfileColumnType.REFERENCE)) {
          assertTrue(rowRef.getMetrics().size() > 0);
        } else if (type.equals(ProfileColumnType.MERGED)) {
          throw new RuntimeException(
              "Generated a merged record out of a ref profile, that is very very wrong");
        }
      }

      // Run it again just to make sure the ref profile doesn't double ingest
      job.run(args);
      assertEquals(3, DeltaTable.forPath(spark, tmp.toString()).toDF().count());
    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  @SneakyThrows
  @Test
  public void dataDeletionRequest() throws IOException {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/profilesWithTraceIds")).getPath();
    String inputConfigs =
        Objects.requireNonNull(getClass().getResource("/monitorConfigV3JsonDateOrdered")).getPath();

    val configsTmp = Files.createTempDirectory("configsDelta");

    val profilesDatalakeV2Tmp = Files.createTempDirectory("deltaV2Tmp");
    String orgConfig = Objects.requireNonNull(getClass().getResource("/config.json")).getPath();

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-source",
                inputProfiles,
                "-monitorConfigChanges",
                inputConfigs,
                "-orgConfig",
                orgConfig,
                "-profilesDatalakeV2",
                profilesDatalakeV2Tmp.toString(),
                "-monitorConfigV3",
                configsTmp.toString(),
                "-skipManifestGeneration",
                "-currentTime",
                "2023-09-08T22:38:07Z",
                "-duration",
                Granularity.P1D.name())
            .toArray(new String[0]);
    job.run(args);

    String deleteNothingRequest =
        Objects.requireNonNull(getClass().getResource("/deletionRequests/deleteNothing")).getPath();
    val deleteNothingRequestsScratchPad = Files.createTempDirectory("deleteNothingRequestsTemp");
    FileUtils.copyDirectory(
        new File(deleteNothingRequest), deleteNothingRequestsScratchPad.toFile());

    String deleteAllRequest =
        Objects.requireNonNull(getClass().getResource("/deletionRequests/deleteAll")).getPath();
    val deleteAllRequestsScratchPad = Files.createTempDirectory("deleteRequestsTemp");
    FileUtils.copyDirectory(new File(deleteAllRequest), deleteAllRequestsScratchPad.toFile());

    String analyzerResultsV3Dump =
        Objects.requireNonNull(getClass().getResource("/analyzerResultsV3Dump")).getPath();
    val analyzerResultsV3ScratchPad = Files.createTempDirectory("analyzerResultsTemp");
    FileUtils.copyDirectory(new File(analyzerResultsV3Dump), analyzerResultsV3ScratchPad.toFile());

    long profileRowsBefore =
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString()).toDF().count();
    long analyzerResultRowsBefore =
        DeltaTable.forPath(spark, analyzerResultsV3ScratchPad.toString()).toDF().count();

    DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString())
        .toDF()
        .filter(col(DatalakeRowV2.Fields.type).notEqual(lit(ProfileColumnType.MERGED.name())))
        .show();

    val currentTime = ZonedDateTime.of(2022, 2, 15, 0, 2, 35, 0, ZoneOffset.UTC);
    val job2 = new WhylogDeltalakeWriterJob();

    // Run a delete that covers a time range not in our data
    job2.performDeleteDataRequests(
        spark,
        profilesDatalakeV2Tmp.toString(),
        analyzerResultsV3ScratchPad.toString(),
        deleteNothingRequestsScratchPad.toString(),
        currentTime);
    assertEquals(
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString()).toDF().count(),
        profileRowsBefore);
    assertEquals(
        DeltaTable.forPath(spark, analyzerResultsV3ScratchPad.toString()).toDF().count(),
        analyzerResultRowsBefore);

    // Partial delete, assert we have fewer but more than zero
    long profileRowsDeleteCoveringOutsideTimeRange =
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString()).toDF().count();
    assertEquals(profileRowsBefore, profileRowsDeleteCoveringOutsideTimeRange);

    job2.performDeleteDataRequests(
        spark,
        profilesDatalakeV2Tmp.toString(),
        analyzerResultsV3ScratchPad.toString(),
        deleteAllRequestsScratchPad.toString(),
        currentTime);

    // Assert that all merged profile rows were cleared
    assertEquals(
        0,
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString())
            .toDF()
            .filter(col(Fields.orgId).equalTo(lit("org-nJdc5Q")))
            .filter(col(Fields.datasetId).equalTo(lit("model-7")))
            .filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())))
            .count());

    // Assert that we left the RAW records in place so they wont re-ingest
    assertTrue(
        DeltaTable.forPath(spark, profilesDatalakeV2Tmp.toString())
                .toDF()
                .filter(col(Fields.orgId).equalTo(lit("org-nJdc5Q")))
                .filter(col(Fields.datasetId).equalTo(lit("model-7")))
                .filter(col(Fields.type).equalTo(lit(ProfileColumnType.RAW.name())))
                .count()
            > 0);

    // Assert that the analyzer results got cleared
    assertEquals(
        0,
        DeltaTable.forPath(spark, analyzerResultsV3ScratchPad.toString())
            .toDF()
            .filter(col(Fields.orgId).equalTo(lit("org-11")))
            .filter(col(Fields.datasetId).equalTo(lit("model-0")))
            .count());
  }

  @Test
  public void testProfileMergeAggregator() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/profile_with_dupes")).getPath();
    val tmp = Files.createTempDirectory("delta");

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-source",
                inputProfiles,
                "-skipManifestGeneration",
                "-currentTime",
                "2021-05-15T22:38:07Z",
                "-duration",
                Granularity.P1D.name(),
                "-profilesDatalakeV2",
                tmp.toString())
            .toArray(new String[0]);

    try {
      job.run(args);
      Dataset<DatalakeRowV2> df =
          DeltaTable.forPath(spark, tmp.toString()).toDF().as(Encoders.bean(DatalakeRowV2.class));

      assertEquals(
          104, df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name()))).count());

      val raw =
          df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.RAW.name()))).collectAsList();
      assertEquals(3, raw.size());
      for (val row : raw) {
        // Make sure we clean up the content byte[] on the raw records, no longer needed
        assertEquals(0, row.getMetrics().size());
      }

    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  @Test
  public void testProfileMergeAndPartitionAssignment() throws Exception {

    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/profile_with_dupes/")).getPath();
    val tmp = Files.createTempDirectory("delta");

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-source",
                inputProfiles,
                "-skipManifestGeneration",
                "-currentTime",
                "2021-08-17T22:38:07Z",
                "-duration",
                Granularity.P1D.name(),
                "-profilesDatalakeV2",
                tmp.toString())
            .toArray(new String[0]);

    try {
      job.run(args);

      Dataset<Row> df = DeltaTable.forPath(spark, tmp.toString()).toDF();

      val dfRaw = df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.RAW.name())));
      val dfMerged = df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())));

      val org2RawRow = dfRaw.filter(col(Fields.orgId).equalTo(lit("org-1"))).collectAsList().get(0);
      val org2MergedRow =
          dfMerged.filter(col(Fields.orgId).equalTo(lit("org-1"))).collectAsList().get(0);

      // Mon Aug 16 2021 06:54:22 GMT+0000 will round down to Mon Aug 16 2021 06:00:00 GMT+0000 for
      // the merged row

      assertEquals(
          1629093600000l,
          org2MergedRow.getLong(org2MergedRow.fieldIndex(DatalakeRowV2.Fields.datasetTimestamp)));
      // assertEquals(1629096862366l,
      // org2RawRow.getLong(org2MergedRow.fieldIndex(DatalakeRowV2.Fields.datasetTimestamp)));

      for (Row r : dfMerged.filter(col(Fields.orgId).equalTo(lit("org-0"))).collectAsList()) {
        // Org0 data was already timestamped to Mon Aug 16 2021 00:00:00 GMT+0000, assert that the
        // merged didn't do any additional rounding
        assertEquals(
            1629072000000l, r.getLong(r.fieldIndex(DatalakeRowV2.Fields.datasetTimestamp)));
      }

      // 2 of the profiles in RAW should have merged when getting copied into MERGED
      assertThat(
          df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name()))).count(),
          is(523l));
      assertThat(
          df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.RAW.name()))).count(), is(7L));

    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  @Test
  public void testOrgIdExtract() throws Exception {
    ExtractOrgIdFromPath e = new ExtractOrgIdFromPath();
    val orgId =
        e.call(
            "s3://development-songbird-20201028054020481800000001/daily-log-untrusted/2021-10-11/org-9758-model-1-2021-10-11T150823.754-kUPtgsz2GJeEkeRCPjaroeikpxDx6QTZ.bin");
    assertEquals("org-9758", orgId);
  }

  @Test
  public void testFlexibleIngestionGranularities() throws Exception {
    String orgConfig = Objects.requireNonNull(getClass().getResource("/config.json")).getPath();

    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/profiles_varied_timestamps")).getPath();
    val tmpV2 = Files.createTempDirectory("deltav2");
    String inputConfigs =
        Objects.requireNonNull(getClass().getResource("/monitorConfigOrg1Model1")).getPath();
    val configTemp = Files.createTempDirectory("config");
    val analyzerResults = Files.createTempDirectory("analysis");
    val analyzerRuns = Files.createTempDirectory("analyzerRuns");
    val staging = Files.createTempDirectory("staging");

    // org-1 model -1

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-asyncSource",
                inputProfiles,
                "-s3SnapshotStagingArea",
                staging.toString(),
                "-orgConfig",
                orgConfig,
                "-analyzerRuns",
                analyzerRuns.toString(),
                "-analyzerResultsPath",
                analyzerResults.toString(),
                "-monitorConfigChanges",
                inputConfigs.toString(),
                "-monitorConfigV3",
                configTemp.toString(),
                "-currentTime",
                "2021-08-16T22:38:07Z",
                "-skipManifestGeneration",
                "-duration",
                Granularity.P1D.name(),
                "-profilesDatalakeV2",
                tmpV2.toString())
            .toArray(new String[0]);

    job.run(args);

    Dataset<Row> dfV2 = DeltaTable.forPath(spark, tmpV2.toString()).toDF();
    long v2Rows = dfV2.count();

    // org-1 has 15min rollup with 5 profiles in the same hour spread across the hour, so we
    // should have 4 unique entries
    // {"id":2,"orgId":"org-1","dataRetentionDays":2000,"enableGranularDataStorage":false,"ingestionGranularity":"PT15M"}
    val PT15MTimestamps =
        Arrays.asList(1629090900000l, 1629092700000l, 1629091800000l, 1629090000000l);

    val mergedV2 =
        dfV2.filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())))
            .filter(col(Fields.orgId).equalTo(lit("org-1")))
            .collectAsList();
    Set<Long> timestamps = new HashSet<>();
    for (val t : mergedV2) {
      timestamps.add(t.getAs(DatalakeRowV2.Fields.datasetTimestamp));
      assertTrue(PT15MTimestamps.contains(t.getAs(DatalakeRowV2.Fields.datasetTimestamp)));
    }

    assertEquals(4, timestamps.size());

    // org-2 has enableGranularDataStorage enabled which means we store profiles unmerged. Should
    // have 2 identical records
    // {"id":2,"orgId":"org-2","dataRetentionDays":2000,"enableGranularDataStorage":true,"ingestionGranularity":"hourly"}

    val org2V2Rows =
        dfV2.filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())))
            .filter(col(Fields.orgId).equalTo(lit("org-2")))
            .as(Encoders.bean(DatalakeRowV2.class))
            .collectAsList();

    Set<String> colsSeen = new HashSet<>();
    Set<String> metricsSeen = new HashSet<>();
    // It's a duplicated profile so there should be 2 rows for each col+metric combo, all with the
    // same timestamp. enableGranularDataStorage should prevent any merging
    for (val r : org2V2Rows) {
      assertEquals(Optional.of(1629091073000l), Optional.of(r.getDatasetTimestamp()));
      colsSeen.add(r.getColumnName());
      Set<String> metricList = new HashSet<>();
      for (val m : r.getMetrics()) {
        metricsSeen.add(m.getMetricPath());
        // Verify no duplicate metrics in the row
        assertFalse(metricList.contains(m.getMetricPath()));
        metricList.add(m.getMetricPath());
      }
    }
    assertEquals(6, metricsSeen.size());
    assertEquals(2, colsSeen.size());
    assertEquals(2, org2V2Rows.size());

    assertEquals(v2Rows, DeltaTable.forPath(spark, tmpV2.toString()).toDF().count());
    int c = 0;
    for (val a :
        DeltaTable.forPath(spark, analyzerResults.toString())
            .toDF()
            .as(Encoders.bean(AnalyzerResult.class))
            .collectAsList()) {
      c++;
      assertEquals("org-2", a.getOrgId());
      assertEquals(true, a.getDisableTargetRollup().booleanValue());
    }
    assertTrue(c > 0);

    // Good, now run it all a second time to make sure deduping works
    job.run(args);
  }

  @Test
  public void testTraceIdPropagation() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/profilesWithTraceIds")).getPath();
    val tmp = Files.createTempDirectory("delta");

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-asyncSource",
                inputProfiles,
                "-currentTime",
                "2023-09-07T22:38:07Z",
                "-skipManifestGeneration",
                "-duration",
                Granularity.P1D.name(),
                "-profilesDatalakeV2",
                tmp.toString())
            .toArray(new String[0]);

    try {
      job.run(args);

      Dataset<Row> df = DeltaTable.forPath(spark, tmp.toString()).toDF();
      val raw =
          df.filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())))
              .filter(col(Fields.orgId).equalTo(lit("org-nJdc5Q")))
              .collectAsList();
      Row rowRaw = raw.get(0);
      assertEquals("993b7d75-d105-4852-8268-2cea087582ea", rowRaw.getAs(Fields.traceId));
    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  /** Oneoff script for converting a V1 profile datalake to V2 */
  // @Test
  /*
  public void testMigrateV1DeltalakeToV2() {

    val job = new MigrateV1ProfileDatalake();
    for (val path : Arrays.asList("/detasamplev1")) { // , "/classification/profiletable-v1ified",
      // "/delta-model-metrics-v1ified",
      // "/regression/profiletable-v1ified")){
      String inputProfiles = Objects.requireNonNull(getClass().getResource(path)).getPath();
      // DeltaTable.forPath(spark, inputProfiles).toDF().show(100, 100, true);
      val args =
          ImmutableList.of(
                  "-sparkMaster",
                  "local[*]",
                  "-src",
                  inputProfiles,
                  "-dest",
                  "/Users/drew/whylabs/whylabs-processing-core5/murmuration/src/test/resources"
                      + path)
              .toArray(new String[0]);

      job.run(args);
    }
  }*/

  /** Oneoff script for converting older datalakes in unit tests into the latest format */
  /*
  @Test
  public void remigrateV0ToV2() {
    Dataset<Org> orgs = spark.createDataset(new ArrayList<Org>(), Encoders.bean(Org.class));

    val samples =
        Arrays.asList(
            "/profiles_model_303",
            "/classification/profiletable",
            "/delta-model-metrics",
            "/regression/profiletable",
            "/delta-model-metrics",
            "/deltasample"); // ,

    for (val s : samples) {

      val df =
          FillMissingColumns.fillMissingColumnsWitNulls(
                  DeltaTable.forPath(
                          spark,
                          "/Users/drew/whylabs/whylabs-processing-core6/murmuration/src/test/resources"
                              + s)
                      .toDF(),
                  DatalakeRow.class.getDeclaredFields())
              .as(Encoders.bean(DatalakeRow.class));
      df.joinWith(
              orgs, df.col(DatalakeRow.Fields.orgId).equalTo(orgs.col(Org.Fields.orgId)), "left")
          .flatMap(new ProfilesDatalakeV0ToV1Row(), Encoders.bean(DatalakeRowV1.class))
          .write()
          .format("delta")
          .partitionBy(DatalakeRowV1.Fields.yyyymmdd)
          .mode(SaveMode.Overwrite)
          .save(
              "/Users/drew/whylabs/whylabs-processing-core6/murmuration/src/test/resources"
                  + s
                  + "-v1");

      val job = new MigrateV2ProfileDatalake();
      val args =
          ImmutableList.of(
                  "-sparkMaster",
                  "local[*]",
                  "-src",
                  "/Users/drew/whylabs/whylabs-processing-core6/murmuration/src/test/resources"
                      + s
                      + "-v1",
                  "-dest",
                  "/Users/drew/whylabs/whylabs-processing-core5/murmuration/src/test/resources"
                      + s
                      + "-v1ified")
              .toArray(new String[0]);

      job.run(args);
    }
  }

   */

}
