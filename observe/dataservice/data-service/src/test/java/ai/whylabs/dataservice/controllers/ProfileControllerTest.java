package ai.whylabs.dataservice.controllers;

import static ai.whylabs.dataservice.responses.GetTracesBySegmentResponse.*;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.Assert.assertEquals;
import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.adhoc.AsyncRequest;
import ai.whylabs.dataservice.adhoc.StatusEnum;
import ai.whylabs.dataservice.enums.AsyncAnalysisQueue;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.enums.SegmentRequestScope;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.responses.*;
import ai.whylabs.dataservice.structures.Dataset;
import ai.whylabs.dataservice.util.ValidateRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Streams;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.BlockingHttpClient;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.Month;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.json.Json;
import javax.json.JsonValue;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.joda.time.Interval;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.Container;

@MicronautTest
@Slf4j
class ProfileControllerTest extends BasePostgresTest {

  @Inject
  @Client("/")
  HttpClient httpClient;

  @Inject private ObjectMapper objectMapper;

  @Test
  void nonExistentOrg_shouldReturn_empty() throws JsonProcessingException {
    val profilesReq =
        ProfileRollupRequest.builder()
            .orgId("org-invalid")
            .datasetId("model-60")
            .segment(ImmutableList.of(SegmentTag.builder().key("rating").value("1").build()))
            .columnNames(ImmutableList.of("date"))
            .interval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"))
            .granularity(DataGranularity.daily)
            .build();
    val res = runRollup(profilesReq);
    assertThat(res.size(), is(0));
  }

  @SneakyThrows
  @Test
  void testMaxIoSegmented() {
    val rqst =
        MaxIoSegmentedRequest.builder()
            .interval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"))
            .orgId("org-5Hsdjx")
            .datasetId("model-61")
            .outputColumns(ImmutableList.of("date"))
            .granularity(DataGranularity.daily);

    val client = httpClient.toBlocking();

    rqst.segments(
        Arrays.asList(
            Arrays.asList(
                SegmentTag.builder().key("category").value("Eggs, Meat and Fish").build()),
            Arrays.asList(
                SegmentTag.builder().key("category").value("Foodgrains, Oil and Masala").build())));
    String jsonSegmented =
        client.retrieve(
            HttpRequest.POST(
                    "/profiles/maxioSegmented", objectMapper.writeValueAsString(rqst.build()))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    MaxIORowSegmented[] myObjects =
        objectMapper.readValue(jsonSegmented, MaxIORowSegmented[].class);

    for (val e : myObjects) {
      assertEquals("category", e.getTags().get(0).getKey());
    }
    assertEquals(32, myObjects.length);
  }

  @SneakyThrows
  @Test
  void testMaxIo() {
    MaxIORequest rqst = new MaxIORequest();
    rqst.setInterval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"));
    rqst.setOrgId("org-5Hsdjx");
    rqst.setDatasetId("model-61");
    rqst.setOutputColumns(ImmutableList.of("date"));
    rqst.setGranularity(DataGranularity.daily);
    val client = httpClient.toBlocking();

    String json =
        client.retrieve(
            HttpRequest.POST("/profiles/maxio", objectMapper.writeValueAsString(rqst))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertTrue(objectMapper.readTree(json).size() > 0);

    // 2nd hit will be a cache hit, make sure the results are identical
    String json2 =
        client.retrieve(
            HttpRequest.POST("/profiles/maxio", objectMapper.writeValueAsString(rqst))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    assertEquals(json, json2);
    // Query a segment we know doesn't exist
    /* This broke  out of the blue and I have no idea why. The framework is being weird
    Client '/': Could not locate named parameter [segmentTags], expecting one of [granularity, endTS, datasetId, outputColumns, startTS, orgId]

    rqst.setSegment(Arrays.asList(SegmentTag.builder().key("blah").value("nope").build()));
    String jsonSegmented =
        client.retrieve(
            HttpRequest.POST("/profiles/maxio", objectMapper.writeValueAsString(rqst))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(0, objectMapper.readTree(jsonSegmented).size());*/
  }

  @SneakyThrows
  @Test
  void testListSegments() {
    SegmentsRequest rqst = new SegmentsRequest();
    rqst.setOrgId("org-5Hsdjx");
    rqst.setDatasetId("model-61");
    rqst.setScope(SegmentRequestScope.TIMESERIES);

    val client = httpClient.toBlocking();

    // Timeseries
    String json =
        client.retrieve(
            HttpRequest.POST("/profiles/segments", objectMapper.writeValueAsString(rqst))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertTrue(objectMapper.readTree(json).size() > 0);

    // Both
    rqst.setScope(SegmentRequestScope.BOTH);
    String json2 =
        client.retrieve(
            HttpRequest.POST("/profiles/segments", objectMapper.writeValueAsString(rqst))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    // Should be the same count since we don't have any segented ref profiles on this org
    assertEquals(objectMapper.readTree(json).size(), objectMapper.readTree(json2).size());

    // Ref profiles (oughta be empty)
    rqst.setScope(SegmentRequestScope.REFERENCE_PROFILE);
    val json3 =
        client.retrieve(
            HttpRequest.POST("/profiles/segments", objectMapper.writeValueAsString(rqst))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(0, objectMapper.readTree(json3).size());
  }

  @Test
  void testModel61_columnFilter() throws JsonProcessingException {
    val profilesReq =
        ProfileRollupRequest.builder()
            .orgId("org-5Hsdjx")
            .datasetId("model-61")
            .columnNames(ImmutableList.of("date"))
            .interval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"))
            .granularity(DataGranularity.daily)
            .build();
    val res = runRollup(profilesReq);
    assertThat(res.size(), is(8));

    profilesReq.setColumnNames(Arrays.asList("made_up_not_there_column"));
    val res2 = runRollup(profilesReq);
    assertThat(res2.size(), is(0));
  }

  @Test
  void testModel61_intervalFilter() throws JsonProcessingException {
    val profilesReq =
        ProfileRollupRequest.builder()
            .orgId("org-5Hsdjx")
            .datasetId("model-61")
            .columnNames(ImmutableList.of("date"))
            // Has no data for this range
            .interval(Interval.parse("2019-12-01T00:00:00Z/2020-12-10T00:00:00Z"))
            .granularity(DataGranularity.daily)
            .build();
    val res = runRollup(profilesReq);
    assertThat(res.size(), is(0));
  }

  @Test
  public void testStagingToHypertablePromotion() throws JsonProcessingException {
    val profilesReq =
        ProfileRollupRequest.builder()
            .orgId("org-5Hsdjx")
            .datasetId("model-61")
            .columnNames(ImmutableList.of("date"))
            .interval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"))
            .granularity(DataGranularity.daily)
            .build();
    val res = runRollup(profilesReq);
    assertThat(res.size(), is(8));

    val client = httpClient.toBlocking();
    val sizeMapBefore =
        client.exchange(
            HttpRequest.GET("/profiles/getTableSizes")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            TableSizesResponse.class);

    assertTrue(sizeMapBefore.getBody().get().getCounts().get("profiles_overall_staging") > 0);
    assertTrue(sizeMapBefore.getBody().get().getCounts().get("profiles_segmented_staging") > 0);

    testMaxIoSegmented();
    // Trigger force promote
    triggerDataPromotion();

    testMaxIoSegmented();
    val res2 = runRollup(profilesReq);
    assertThat(res2.size(), is(8));

    // Verify the staging table got cleared and that ^ was pulled from the overall hypertable
    val sizeMap =
        client.exchange(
            HttpRequest.GET("/profiles/getTableSizes")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            TableSizesResponse.class);

    assertEquals(0l, sizeMap.getBody().get().getCounts().get("profiles_overall_staging"), 0);
    assertEquals(0l, sizeMap.getBody().get().getCounts().get("profiles_segmented_staging"), 0);

    // Major compaction
    // Disabling to get timescaledb back to apache2 licence
    /*
    client.exchange(
        HttpRequest.POST("/profiles/runMajorCompaction/org-5Hsdjx/model-61", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
    val res3 = runRollup(profilesReq);
    assertThat(res3.size(), is(8));

     */

    val sizeMap2 =
        client.exchange(
            HttpRequest.GET("/profiles/getTableSizes")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            TableSizesResponse.class);
    assertEquals(sizeMap.getBody().get(), sizeMap2.getBody().get());

    // Trigger column stat rollups
    triggerColumnStatRollups();

    // Query column stats to see if they've been generated
    val columnStatsResponse = getColumnStats("org-5Hsdjx", "model-61");
    assertTrue(columnStatsResponse.getColumnStatMap().size() > 0);
    List<String> cols = new ArrayList<>();
    for (val e : columnStatsResponse.getColumnStatMap().entrySet()) {
      assertTrue(e.getValue().getUploadLagP99m() > 500000l);
      assertTrue(e.getValue().getUploadLagP50m() > 500000l);
      assertTrue(e.getValue().getUploadLagP95m() > 500000l);
      cols.add(e.getKey());
      assertNotNull(e.getValue().getEarliestDatasetTimestamp());
    }
    assertTrue(cols.contains("date"));
    assertTrue(cols.size() > 5);
  }

  private ColumnStatsResponse getColumnStats(String orgId, String datasetId) {
    val client = httpClient.toBlocking();
    val columnStatRequest =
        "{"
            + "  \"orgId\": \""
            + orgId
            + "\","
            + "  \"datasetId\": \""
            + datasetId
            + "\","
            + "  \"interval\": \"2020-01-09/P3000D\""
            + "}";
    return client.retrieve(
        HttpRequest.POST("/dataset/columnStats/query", columnStatRequest)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON),
        ColumnStatsResponse.class);
  }

  @Test
  public void testGranularityAll() throws JsonProcessingException {
    val profilesReq =
        ProfileRollupRequest.builder()
            .orgId("org-5Hsdjx")
            .datasetId("model-61")
            .columnNames(ImmutableList.of("date"))
            .interval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"))
            .granularity(DataGranularity.all)
            .build();
    val res = runRollup(profilesReq);
    assertThat(res.size(), is(1));
    // TODO: Chris this uses Mon Jan 01 2001 as the timestamp, wondering what we want it to be
  }

  @Test
  public void testGranularityMonth() throws JsonProcessingException {
    val profilesReq =
        ProfileRollupRequest.builder()
            .orgId("org-5Hsdjx")
            .datasetId("model-61")
            .columnNames(ImmutableList.of("date"))
            .interval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"))
            .granularity(DataGranularity.monthly)
            .build();
    List<Long> res = runRollup(profilesReq);
    assertThat(res.size(), is(1));
    assertEquals(Optional.ofNullable(res.get(0)), Optional.of(1669852800000L)); // Dec 1st, 2022
  }

  @SneakyThrows
  @Test
  public void testGranularityWeek() {
    val profilesReq =
        ProfileRollupRequest.builder()
            .orgId("org-5Hsdjx")
            .datasetId("model-61")
            .columnNames(ImmutableList.of("date"))
            .interval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"))
            .granularity(DataGranularity.weekly)
            .build();

    assertThat(runRollup(profilesReq).size(), is(2));

    // Semantic diff a known response payload against what we get back
    val client = httpClient.toBlocking();
    String json =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", objectMapper.writeValueAsString(profilesReq))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    JsonNode jsonNode = objectMapper.readTree(json);
    // remove last upload timestamp from results as that changes every time the unit test database
    // is updated.
    removeElementByName(jsonNode, "whylabs/last_upload_ts");
    JsonValue json1 = Json.createReader(new StringReader(jsonNode.toString())).readValue();
    String expected =
        "[{\"timestamp\":1669593600000,\"features\":{\"date\":{\"type_string\":{\"whylabs/traceid\":null,\"cardinality/hll\":\"AwEHDAUIAAEIAAAA4bEFBQcunBHLjPgYbD6uDpSgnAg1TEEL2tezCp4W1gU=\",\"inferredtype/type\":\"STRING\"},\"type_histogram\":{\"distribution/kll/histogram\":{}},\"type_quantile\":{\"distribution/kll/quantiles\":[]},\"type_long\":{\"distribution/kll/n\":0,\"types/integral\":0,\"counts/n\":26056,\"types/object\":0,\"types/fractional\":0,\"types/boolean\":0,\"types/string\":26056},\"type_double\":{\"cardinality/lower_1\":8.0,\"cardinality/est\":8.000000139077509,\"cardinality/upper_1\":8.000399573089398,\"inferredtype/ratio\":1.0},\"type_frequentstrings\":{\"frequent_items/frequent_strings\":{\"numActive\":8,\"mapCapacity\":12,\"maxError\":0,\"items\":{\"2022-08-15 00:00:00+00:00\":{\"lb\":3570,\"est\":3570,\"ub\":3570},\"2022-08-10 00:00:00+00:00\":{\"lb\":3350,\"est\":3350,\"ub\":3350},\"2022-08-14 00:00:00+00:00\":{\"lb\":3346,\"est\":3346,\"ub\":3346},\"2022-08-13 00:00:00+00:00\":{\"lb\":3240,\"est\":3240,\"ub\":3240},\"2022-08-11 00:00:00+00:00\":{\"lb\":3210,\"est\":3210,\"ub\":3210},\"2022-08-12 00:00:00+00:00\":{\"lb\":3176,\"est\":3176,\"ub\":3176},\"2022-08-09 00:00:00+00:00\":{\"lb\":3134,\"est\":3134,\"ub\":3134},\"2022-08-16 00:00:00+00:00\":{\"lb\":3030,\"est\":3030,\"ub\":3030}}}},\"type_boolean\":{\"distribution/isdiscrete\":true}}}},{\"timestamp\":1670198400000,\"features\":{\"date\":{\"type_string\":{\"whylabs/traceid\":null,\"cardinality/hll\":\"AwEHDAUIAAEIAAAA4bEFBQcunBHLjPgYbD6uDpSgnAg1TEEL2tezCp4W1gU=\",\"inferredtype/type\":\"STRING\"},\"type_histogram\":{\"distribution/kll/histogram\":{}},\"type_quantile\":{\"distribution/kll/quantiles\":[]},\"type_long\":{\"distribution/kll/n\":0,\"types/integral\":0,\"counts/n\":43430,\"types/object\":0,\"types/fractional\":0,\"types/boolean\":0,\"types/string\":43430},\"type_double\":{\"cardinality/lower_1\":8.0,\"cardinality/est\":8.000000139077509,\"cardinality/upper_1\":8.000399573089398,\"inferredtype/ratio\":1.0},\"type_frequentstrings\":{\"frequent_items/frequent_strings\":{\"numActive\":8,\"mapCapacity\":12,\"maxError\":0,\"items\":{\"2022-08-14 00:00:00+00:00\":{\"lb\":5802,\"est\":5802,\"ub\":5802},\"2022-08-10 00:00:00+00:00\":{\"lb\":5798,\"est\":5798,\"ub\":5798},\"2022-08-15 00:00:00+00:00\":{\"lb\":5480,\"est\":5480,\"ub\":5480},\"2022-08-11 00:00:00+00:00\":{\"lb\":5388,\"est\":5388,\"ub\":5388},\"2022-08-13 00:00:00+00:00\":{\"lb\":5376,\"est\":5376,\"ub\":5376},\"2022-08-09 00:00:00+00:00\":{\"lb\":5352,\"est\":5352,\"ub\":5352},\"2022-08-16 00:00:00+00:00\":{\"lb\":5156,\"est\":5156,\"ub\":5156},\"2022-08-12 00:00:00+00:00\":{\"lb\":5078,\"est\":5078,\"ub\":5078}}}},\"type_boolean\":{\"distribution/isdiscrete\":true}}}}]";
    JsonValue jsonExpected = Json.createReader(new StringReader(expected)).readValue();
    assertEquals(
        "[]",
        Json.createDiff(json1.asJsonArray(), jsonExpected.asJsonArray()).toJsonArray().toString());
  }

  /** Recursively remove a json element by name. */
  private static void removeElementByName(JsonNode jsonNode, String key) {
    int sum = 0;

    // If the current node is an object, recursively traverse its fields
    if (jsonNode.isObject()) {
      for (JsonNode field : jsonNode) {
        removeElementByName(field, key);
      }
    }

    // If the current node is an array, recursively traverse its elements
    if (jsonNode.isArray()) {
      for (JsonNode element : jsonNode) {
        removeElementByName(element, key);
      }
    }

    // If the current node has matching key, remove it.
    if (jsonNode.has(key)) {
      ((ObjectNode) jsonNode).remove(key);
    }
  }

  private List<Long> runRollup(ProfileRollupRequest req) throws JsonProcessingException {
    val client = httpClient.toBlocking();

    String json =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", objectMapper.writeValueAsString(req))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    log.info("Recieved {}", json);
    List<Long> timestamps = new ArrayList<>();
    for (val o : objectMapper.readTree(json)) {
      if (!o.has(ModelRollup.Fields.timestamp)) {
        continue;
      }
      timestamps.add(o.get(ModelRollup.Fields.timestamp).asLong());
    }
    return timestamps;
  }

  @SneakyThrows
  @Test
  public void timeseries() {
    val t = new TimeSeriesProfileRequest();
    t.setOrgId("org-5Hsdjx");
    t.setDatasetIds(Arrays.asList("model-60"));
    t.setGranularity(DataGranularity.daily);
    t.setInterval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"));

    List<Long> timestampsDailyRollup = runTimeseries(t);
    // Daily rollup
    for (val ts : timestampsDailyRollup) {
      val z = ZonedDateTime.ofInstant(Instant.ofEpochMilli(ts), ZoneOffset.UTC);
      log.info("TS {}", z);
      assertTrue(z.getMonth().equals(Month.DECEMBER));
      assertTrue(z.getHour() == 0);
    }

    // Hourly
    t.setGranularity(DataGranularity.hourly);
    List<Long> timestampsHourlyRollup = runTimeseries(t);
    // this model logged once per day, so we have the same number of hourly profiles as daily
    // profiles.
    assertThat(timestampsHourlyRollup, hasSize(timestampsDailyRollup.size()));
    // every hourly timestamp should have a non-zero hour value
    for (val ts : timestampsHourlyRollup) {
      val z = ZonedDateTime.ofInstant(Instant.ofEpochMilli(ts), ZoneOffset.UTC);
      assertTrue(z.getMonth().equals(Month.DECEMBER));
      assertTrue(z.getHour() != 0);
    }

    // All
    t.setGranularity(DataGranularity.all);
    assertTrue(runTimeseries(t).size() == 1);

    // Out of range interval
    t.setInterval(Interval.parse("2025-12-01T00:00:00Z/2025-12-10T00:00:00Z"));
    assertTrue(runTimeseries(t).size() == 0);
  }

  private List<Long> runTimeseries(TimeSeriesProfileRequest req) throws JsonProcessingException {
    val client = httpClient.toBlocking();

    String json =
        client.retrieve(
            HttpRequest.POST("/profiles/timeSeries", objectMapper.writeValueAsString(req))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    log.info("Recieved {}", json);
    List<Long> timestamps = new ArrayList<>();
    for (val o : objectMapper.readTree(json)) {
      if (!o.has(TimeSeriesProfileResponse.Fields.ts)) {
        continue;
      }
      timestamps.add(o.get(TimeSeriesProfileResponse.Fields.ts).asLong());
    }
    return timestamps;
  }

  @Test
  public void testTooGranularValidation() {
    val i = Interval.parse("2020-12-01T00:00:00Z/2023-12-10T00:00:00Z");

    Assertions.assertThrows(
        IllegalArgumentException.class,
        () -> {
          ValidateRequest.checkTooGranular(i, DataGranularity.hourly);
        },
        "NumberFormatException error was expected");

    ValidateRequest.checkTooGranular(i, DataGranularity.daily);
  }

  /** test happy path of single profile ingestion. */
  @SneakyThrows
  @Test
  void testIngestProfile() {
    // I'm paranoid - use deeply insider logic to check that the profile has not been previously
    // ingested.
    String query =
        "select s3_path, dataset_timestamp from whylabs.profile_upload_audit "
            + "where s3_path like '%org-0-model-2121-2024-05-06T211539.608-UNX6BcVRhVohs2dE1WNHxfyLuWOt7ddc%' limit 10";
    Container.ExecResult result = runDirectQuery(query);
    // expect no error messages and no matching rows in stdout
    assertThat(result.getStderr(), isEmptyString());
    // stdout also contains the query which contains profile name, so don't assert on that.
    // Look for dataset_timestamp instead.
    assertThat(result.getStdout(), not(containsString("2024-05-06 21:15:39.608+00")));

    // ingest a profile of Brazilian e-com (make sure there's no other test ingesting profiles of
    // this model)
    ingestProfile(
        "/profiles/testIngestProfile/org-0-model-2121-2024-05-06T211539.608-UNX6BcVRhVohs2dE1WNHxfyLuWOt7ddc.bin");

    // check that we actually ingested the profile.
    query =
        "select id, org_id, dataset_id, dataset_timestamp, s3_path from whylabs.profile_upload_audit "
            + "where s3_path like '%org-0-model-2121-2024-05-06T211539.608-UNX6BcVRhVohs2dE1WNHxfyLuWOt7ddc%' limit 10";
    result = runDirectQuery(query);
    // expect no error messages and one matching row in stdout
    assertThat(result.getStderr(), isEmptyString());
    // expect to see the dataset_timestamp now
    assertThat(result.getStdout(), containsString("2024-05-06"));
    assertThat(result.getStdout(), containsString("211539.608"));

    BlockingHttpClient client = httpClient.toBlocking();

    client.exchange(
        HttpRequest.POST("/profiles/forceTagTableRollup", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    String json = "{\"orgId\":\"org-0\",\"datasetIds\":[\"model-2121\"]}";
    String ret =
        client.retrieve(
            HttpRequest.POST("/profiles/timeBoundary", json)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(
        "{\"rows\":[{\"start\":1715029200000,\"end\":1715029200000,\"datasetId\":\"model-2121\"}]}",
        ret);
  }

  @SneakyThrows
  @Test
  void testIngestZipReference() {

    // ingest a zip file containing three segmented reference profiles
    ingestProfile("/profiles/org-0-model-2250-reference.zip");

    // assert there is only one audit table entry for this zip file
    val r = new GetProfileAuditEntries();
    r.setOrgId("org-0");
    r.setDatasetId("model-2250");
    r.setInterval(new Interval(0, System.currentTimeMillis()));

    BlockingHttpClient client = httpClient.toBlocking();

    String json1 =
        client.retrieve(
            HttpRequest.POST("/profiles/audit/list", objectMapper.writeValueAsString(r))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    ProfileAuditEntryResponse[] bins =
        objectMapper.readValue(json1, ProfileAuditEntryResponse[].class);
    assertTrue(bins.length == 4);
    final List<String> names =
        Arrays.stream(bins)
            .map(row -> row.getFile())
            .map(s -> s.substring(s.lastIndexOf("/") + 1))
            .collect(Collectors.toList());
    assertThat(
        names,
        containsInAnyOrder(
            "org-0-model-2250-reference.zip(tmp_sa53sw5)",
            "org-0-model-2250-reference.zip(tmpt1eb59xh)",
            "org-0-model-2250-reference.zip(tmph77whim8)",
            "org-0-model-2250-reference.zip"));
    // verify all segments were ingested from zip file
    SegmentsRequest rqst = new SegmentsRequest();
    rqst.setOrgId("org-0");
    rqst.setDatasetId("model-2250");
    rqst.setScope(SegmentRequestScope.REFERENCE_PROFILE);
    String json =
        client.retrieve(
            HttpRequest.POST("/profiles/segments", objectMapper.writeValueAsString(rqst))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    // expect three segments,   "col1=1",  "col1=2",  "col1=3"
    ArrayNode segments = (ArrayNode) objectMapper.readTree(json);
    assertTrue(segments.size() == 3);
    //    assertThat(segments, containsInAnyOrder("col1=1", "col1=1", col1=3));

    // read all active columns
    val activeRqst =
        "{"
            + "  \"orgId\": \"org-0\","
            + "  \"datasetId\": \"model-2250\","
            + "  \"refProfileId\": \"monty\","
            + "  \"interval\": \"2024-01-09/P7D\""
            + "}";
    json =
        client.retrieve(
            HttpRequest.POST("/profiles/activeColumns", activeRqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    List<String> columns = objectMapper.readValue(json, List.class);
    assertThat(columns, containsInAnyOrder("col1", "col2"));

    // verify sum of all the counts
    String metricRqst =
        "{"
            + "\"orgId\": \"org-0\","
            + "\"datasetId\": \"model-2250\","
            + "\"referenceProfileId\": \"monty\""
            + "}";
    val jsonData =
        client.retrieve(
            HttpRequest.POST("/profiles/getReferenceProfileSketches", metricRqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    // Extract the sum of "counts/n" for every feature
    JsonNode jsonNode = objectMapper.readTree(jsonData);
    val totalCount = extractSum(jsonNode, "counts/n");
    // sum across all features, all segments sum(2, 2, 3, 3, 1, 1)
    assertThat(totalCount, is(12));
  }

  @SneakyThrows
  @Test
  void testIngestZipBatch() {

    BlockingHttpClient client = httpClient.toBlocking();

    // enable granular storage on org-0 so we can test numericMetricByProfile
    String writeOrgJson =
        "{\"orgId\":\"org-0\",\"dataRetentionDays\":365,\"enableGranularDataStorage\": true}";
    client.exchange(
        HttpRequest.POST("/org/save", writeOrgJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // ingest a zip file containing three segmented batch profiles
    ingestProfile("/profiles/org-0-model-2279-batch.zip");

    // assert there is one audit table entry per zip entry, plus one for the aggregate itself.
    val r = new GetProfileAuditEntries();
    r.setOrgId("org-0");
    r.setDatasetId("model-2279");
    r.setInterval(new Interval(0, System.currentTimeMillis()));

    String json =
        client.retrieve(
            HttpRequest.POST("/profiles/audit/list", objectMapper.writeValueAsString(r))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    ProfileAuditEntryResponse[] bins =
        objectMapper.readValue(json, ProfileAuditEntryResponse[].class);
    assertTrue(bins.length == 4);
    final List<String> names =
        Arrays.stream(bins)
            .map(row -> row.getFile())
            .map(s -> s.substring(s.lastIndexOf("/") + 1))
            .collect(Collectors.toList());
    assertThat(
        names,
        containsInAnyOrder(
            "org-0-model-2279-batch.zip(org-0-model-2279-2024-02-14T011723.871-EjLwjwtK22SylqUVWu3HEaxgUjRPm969.bin)",
            "org-0-model-2279-batch.zip(org-0-model-2279-2024-02-14T011723.888-DT1ol4NgdEN7oLG7Nxy0MUrMXDbpbHMu.bin)",
            "org-0-model-2279-batch.zip(org-0-model-2279-2024-02-14T011723.899-ynwDEgYyuHCarA6iigO2jkx9CDmyoy8V.bin)",
            "org-0-model-2279-batch.zip"));
    // verify all segments were ingested from zip file
    SegmentsRequest rqst = new SegmentsRequest();
    rqst.setOrgId("org-0");
    rqst.setDatasetId("model-2279");
    rqst.setScope(SegmentRequestScope.TIMESERIES);
    json =
        client.retrieve(
            HttpRequest.POST("/profiles/segments", objectMapper.writeValueAsString(rqst))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    // verify ingested three segments,   "col1=1",  "col1=2",  "col1=3"
    List<String> segments = objectMapper.readValue(json, new TypeReference<List<String>>() {});
    assertThat(segments.size(), is(3));
    assertThat(segments, containsInAnyOrder("col1=1", "col1=2", "col1=3"));

    // test standard rollup for the ingested zipped profiles
    String rollupRqst =
        "{"
            + "  \"orgId\": \"org-0\","
            + "  \"datasetId\": \"model-2279\","
            + "  \"interval\": \"2024-02-13/P7D\""
            + "}";
    json =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", rollupRqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    ArrayNode jsonArrayNode = (ArrayNode) objectMapper.readTree(json);
    JsonNode jsonNode = jsonArrayNode.get(0);
    // verify ingested two feature names
    List<String> columns =
        Streams.stream(jsonNode.get("features").fieldNames()).collect(Collectors.toList());
    assertThat(columns, containsInAnyOrder("col1", "col2"));
    // sum count across all features, all segments sum(2, 2, 3, 3, 1, 1)
    assertThat(extractSum(jsonNode, "counts/n"), is(12));

    // get a retrieval token for one of the segments, and ensure that it works
    val numericMetricByProfileRqst =
        "{"
            + "  \"orgId\": \"org-0\","
            + "  \"datasetId\": \"model-2279\","
            + "  \"columnName\": \"col1\","
            + "  \"interval\": \"2024-02-13/P7D\","
            + "  \"segment\": [ {\"key\": \"col1\", \"value\": \"1\"}],"
            + "  \"metric\": \"mean\""
            + "}";
    json =
        client.retrieve(
            HttpRequest.POST("/profiles/numericMetricByProfile", numericMetricByProfileRqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    jsonArrayNode = (ArrayNode) objectMapper.readTree(json);
    val retrievalToken = jsonArrayNode.get(0).get("retrievalToken").asText();
    rollupRqst =
        "{"
            + "  \"orgId\": \"org-0\","
            + "  \"datasetId\": \"model-2279\","
            + "  \"columnNames\": [\"col1\"],"
            + "  \"granularity\": \"individual\","
            + "  \"retrievalToken\": \""
            + retrievalToken
            + "\""
            + "}";
    json =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", rollupRqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    jsonArrayNode = (ArrayNode) objectMapper.readTree(json);
    jsonNode = jsonArrayNode.get(0);
    // expect two feature names
    columns = Streams.stream(jsonNode.get("features").fieldNames()).collect(Collectors.toList());
    assertThat(columns, containsInAnyOrder("col1"));
    // sum count for single feature, single segment
    assertThat(extractSum(jsonNode, "counts/n"), is(2));
  }

  private static int extractSum(JsonNode jsonNode, String key) {
    int sum = 0;

    // If the current node is an object, recursively traverse its fields
    if (jsonNode.isObject()) {
      for (JsonNode field : jsonNode) {
        sum += extractSum(field, key);
      }
    }

    // If the current node is an array, recursively traverse its elements
    if (jsonNode.isArray()) {
      for (JsonNode element : jsonNode) {
        sum += extractSum(element, key);
      }
    }

    // If the current node is a value and the key matches "fribble", add its value to the sum
    if (jsonNode.has(key)) {
      sum += jsonNode.get(key).asInt();
    }

    return sum;
  }

  /**
   * TODO: This query is copy/paste, hitting data that isn't in our test database. Just hitting the
   * endpoint to make sure it doesn't 500 at this point.
   */
  @Test
  public void testClassificationSummary() {
    val client = httpClient.toBlocking();
    String json =
        "{\"orgId\":\"org-3e8cGT\",\"granularity\":\"monthly\",\"datasetId\":\"model-3\",\"interval\":\"2022-01-01T00:00:00.000Z/2023-12-31T23:59:59.999Z\",\"segment\":[]}";

    client.retrieve(
        HttpRequest.POST("/profiles/classificationSummary", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
  }

  /**
   * TODO: This query is copy/paste, hitting data that isn't in our test database. Just hitting the
   * endpoint to make sure it doesn't 500 at this point.
   */
  @Test
  public void testClassificationMetrics() {
    val client = httpClient.toBlocking();
    String json =
        "{\"orgId\":\"org-3e8cGT\",\"granularity\":\"monthly\",\"datasetId\":\"model-3\",\"interval\":\"2022-01-01T00:00:00.000Z/2023-12-31T23:59:59.999Z\",\"segment\":[]}";

    client.retrieve(
        HttpRequest.POST("/profiles/classificationMetrics", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
  }

  /**
   * TODO: This query is copy/paste, hitting data that isn't in our test database. Just hitting the
   * endpoint to make sure it doesn't 500 at this point.
   */
  @Test
  public void testNumericMetricsForSegmentKey() {
    val client = httpClient.toBlocking();
    String json =
        "{\n"
            + "  \"orgId\": \"org-3e8cGT\",\n"
            + "  \"interval\": \"2022-01-01T00:00:00.000Z/2022-12-31T23:59:59.999Z\",\n"
            + "  \"segmentKey\": \"loc\",\n"
            + "  \"datasetColumnSelectors\": [\n"
            + "    {\n"
            + "      \"datasetId\": \"model-15\",\n"
            + "      \"metric\": \"prediction_count\"\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    client.retrieve(
        HttpRequest.POST("/profiles/numericMetricsForSegmentKey", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
  }

  @Test
  public void testAuditList() throws JsonProcessingException {
    val client = httpClient.toBlocking();
    String json =
        "{\n"
            + "  \"orgId\": \"org-5Hsdjx\",\n"
            + "  \"interval\": \"2021-01-01T00:00:00.000Z/2023-12-31T23:59:59.999Z\",\n"
            + "  \"datasetId\": \"model-60\" "
            + "}";

    String resp =
        client.retrieve(
            HttpRequest.POST("/profiles/audit/list", json)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    ProfileAuditEntryResponse[] r = objectMapper.readValue(resp, ProfileAuditEntryResponse[].class);
    assertTrue(r.length > 0);
  }

  /**
   * TODO: This query is copy/paste, hitting data that isn't in our test database. Just hitting the
   * endpoint to make sure it doesn't 500 at this point.
   */
  @Test
  public void testNumericMetricsForTimeRange() {
    val client = httpClient.toBlocking();
    String json =
        "{\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"interval\": \"2023-01-14T00:00:00Z/2023-01-24T00:00:00Z\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"datasetColumnSelectors\": [\n"
            + "    {\n"
            + "      \"datasetId\": \"model-0\",\n"
            + "      \"columnNames\": [\n"
            + "        \"annual_inc_joint\",\n"
            + "        \"disbursement_method\"],\n"
            + "      \"metric\": \"quantile_95\"\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    client.retrieve(
        HttpRequest.POST("/profiles/numericMetricsForTimeRange", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
  }

  @SneakyThrows
  @Test
  public void testNumericMetricsForTimeRange2() {
    val client = httpClient.toBlocking();
    String rqst =
        "{\n"
            + "  \"orgId\": \"org-5Hsdjx\",\n"
            + "  \"interval\": \"2022-12-05T01:00:00.000Z/P1D\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"segment\": [ ],\n"
            + "  \"datasetColumnSelectors\": [\n"
            + "    { \"datasetId\": \"model-60\", \"columnNames\": [\"market_price\"], \"metric\": \"quantile_99\" },\n"
            + "    { \"datasetId\": \"model-60\", \"columnNames\": [\"sales_last_week\"], \"metric\": \"quantile_99\" },\n"
            + "    { \"datasetId\": \"model-60\", \"columnNames\": [\"rating\"], \"metric\": \"quantile_99\" }\n"
            + "  ]\n"
            + "}";
    String json =
        client.retrieve(
            HttpRequest.POST("/profiles/numericMetricsForTimeRange", rqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    log.info("Recieved {}", json);
    List<String> columns = new ArrayList<>();
    for (val o : objectMapper.readTree(json)) {
      assertTrue(o.has(ModelRollup.Fields.timestamp));
      assertTrue(o.has(ModelRollup.Fields.features));
      val features = o.get(ModelRollup.Fields.features);
      Iterator<String> iterator = features.fieldNames();
      iterator.forEachRemaining(e -> columns.add(e));
    }
    assertThat(columns, contains("market_price", "sales_last_week", "rating"));
  }

  @SneakyThrows
  @Test
  public void testNumericMetricsForTimeRange3() {
    val client = httpClient.toBlocking();

    String rqst =
        "{\n"
            + "  \"orgId\": \"org-5Hsdjx\","
            + "  \"interval\": \"2022-01-01T00:00:00.000Z/2023-12-31T23:59:59.999Z\","
            + "  \"granularity\": \"all\","
            + "  \"segment\": [ ],"
            + "  \"datasetColumnSelectors\": [\n"
            + "    { \"datasetId\": \"model-60\", \"metric\": \"classification_accuracy\" },"
            + "    { \"datasetId\": \"model-60\", \"metric\": \"prediction_count\" }"
            + "  ]\n"
            + "}";

    String json =
        client.retrieve(
            HttpRequest.POST("/profiles/numericMetricsForTimeRange", rqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    log.info("Received {}", json);
    List<String> columns = new ArrayList<>();
    for (val o : objectMapper.readTree(json)) {
      assertTrue(o.has(ModelRollup.Fields.timestamp));
      assertTrue(o.has(ModelRollup.Fields.features));
      val features = o.get(ModelRollup.Fields.features);
      Iterator<String> iterator = features.fieldNames();
      iterator.forEachRemaining(e -> columns.add(e));
    }
    assertThat(columns, contains("", ""));
  }

  @Test
  public void testListAudit() throws JsonProcessingException {
    val r = new GetProfileAuditEntries();
    r.setOrgId("org-5Hsdjx");
    r.setDatasetId("model-60");
    r.setInterval(new Interval(0, System.currentTimeMillis()));

    val client = httpClient.toBlocking();

    String json1 =
        client.retrieve(
            HttpRequest.POST("/profiles/audit/list", objectMapper.writeValueAsString(r))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    ProfileAuditEntryResponse[] bins =
        objectMapper.readValue(json1, ProfileAuditEntryResponse[].class);
    assertTrue(bins.length > 0);
    for (val b : bins) {
      // Take advantage of the file convention where org and dataset ids are in the s3 path
      assertTrue(b.getFile().contains(r.getOrgId()));
      assertTrue(b.getFile().contains(r.getDatasetId()));
    }

    // Query a segment that's not populated
    r.setSegment(Arrays.asList(SegmentTag.builder().key("house").value("blue").build()));
    String json2 =
        client.retrieve(
            HttpRequest.POST("/profiles/audit/list", objectMapper.writeValueAsString(r))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    ProfileAuditEntryResponse[] bins2 =
        objectMapper.readValue(json2, ProfileAuditEntryResponse[].class);
    assertEquals(0, bins2.length);
  }

  @SneakyThrows
  @Test
  public void testListTracesBySegment() {
    // TODO: We don't have any unit test data yet, so this is just testing that queries don't 500
    val r = new GetTracesBySegmentRequest();
    r.setOrgId("org-5Hsdjx");
    r.setDatasetId("model-60");
    r.setInterval(new Interval(0, System.currentTimeMillis()));
    r.setSegment(Arrays.asList(SegmentTag.builder().key("house").value("blue").build()));

    val client = httpClient.toBlocking();

    String json1 =
        client.retrieve(
            HttpRequest.POST("/profiles/traces/segment/list", objectMapper.writeValueAsString(r))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    GetTracesBySegmentResponse resp =
        objectMapper.readValue(json1, GetTracesBySegmentResponse.class);
    assertEquals(0, resp.getTraces().size());
  }

  /**
   * validate ListTracesBySegment generates retrieval tokens that uniquely identify a single
   * profile, even if there are multiple profiles with the same timestamp and traceid.
   */
  @SneakyThrows
  @Test
  public void testListTracesBySegmentRetrievalTokens() {
    val client = httpClient.toBlocking();

    // Set up org-0 for granular storage
    String writeOrgJson =
        "{\"orgId\":\"org-0\",\"dataRetentionDays\":365,\"enableGranularDataStorage\": true}";
    client.exchange(
        HttpRequest.POST("/org/save", writeOrgJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Ingest two profiles having identical traceid and dateset timestamp
    ingestProfile(
        "/profiles/org-0-model-2240-2023-09-07T215543.309-GkfWbBVPdWMQrLLEPvXxvQOOo8qoq5iB.bin");
    ingestProfile(
        "/profiles/org-0-model-2240-2023-09-07T215543.309-HvJWq5lhKgnbVAvSKtjbvXG3vE26quB5.bin");

    val r = new GetTracesBySegmentRequest();
    r.setOrgId("org-0");
    r.setDatasetId("model-2240");
    r.setInterval(new Interval("1970-07-12T22:46:53Z/2024-07-12T22:46:53Z"));

    String json1 =
        client.retrieve(
            HttpRequest.POST("/profiles/traces/segment/list", objectMapper.writeValueAsString(r))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    GetTracesBySegmentResponse resp =
        objectMapper.readValue(json1, GetTracesBySegmentResponse.class);
    assertThat(resp.getTraces().size(), is(2));

    // assert all traceRows have identical traceID
    val traceids = resp.getTraces().stream().map(TraceRow::getTraceId).collect(Collectors.toList());
    assertThat(traceids, everyItem(is(traceids.get(0))));

    // assert all traceRows have identical dataset timestamp
    val timestamps =
        resp.getTraces().stream().map(TraceRow::getDatasetTimestamp).collect(Collectors.toList());
    assertThat(timestamps, everyItem(is(timestamps.get(0))));

    // assert all retrieval tokens are unique
    val tokens =
        resp.getTraces().stream().map(TraceRow::getRetrievalToken).collect(Collectors.toSet());
    assertThat(tokens.size(), equalTo(resp.getTraces().size()));
  }

  @SneakyThrows
  @Test
  public void testReferenceProfileListTracesBySegment() {
    val client = httpClient.toBlocking();

    // Ingest a reference profile
    ingestProfile("/profiles/org-JR37ks-model-35-6ZI9AoOy3WTZuaAU9OX8QBwqnaTGSsT3.bin");

    val r = new GetTracesBySegmentRequest();
    r.setOrgId("org-JR37ks");
    r.setDatasetId("model-35");
    r.setInterval(new Interval("2023-10-26/P10D"));
    String json1 =
        client.retrieve(
            HttpRequest.POST("/profiles/traces/segment/list", objectMapper.writeValueAsString(r))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    // assert that reference profile IS NOT in traces/segment/list response!
    GetTracesBySegmentResponse resp =
        objectMapper.readValue(json1, GetTracesBySegmentResponse.class);
    assertThat(resp.getTraces().size(), is(0));
  }

  /**
   * ingest normal batch profile with segments and traceid. make sure traceid and segments are
   * visible in results from "/profiles/traces/segment/list" api.
   */
  @SneakyThrows
  @Test
  public void testBatchProfileListTracesBySegment() {
    val client = httpClient.toBlocking();

    // Ingest a non-reference profile that has traceid and segments
    ingestProfile(
        "/profiles/org-0-model-2239-2023-10-05T220455.028-o9deQGX02OBMI1ee8r52vD1N3GL3AhsY.bin");

    val r = new GetTracesBySegmentRequest();
    r.setOrgId("org-0");
    r.setDatasetId("model-2239");
    r.setInterval(new Interval("2023-10-05/P2D"));
    String json1 =
        client.retrieve(
            HttpRequest.POST("/profiles/traces/segment/list", objectMapper.writeValueAsString(r))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    // assert that reference profile IS NOT in traces/segment/list response!
    GetTracesBySegmentResponse resp =
        objectMapper.readValue(json1, GetTracesBySegmentResponse.class);
    assertThat(resp.getTraces().size(), is(1));
    assertThat(resp.getTraces().get(0).getTraceId(), is("9918a1f3-3fad-4c17-a42a-76fb1ec0227c"));
    assertThat(
        resp.getTraces().get(0).getSegmentTags().toString(),
        is("[SegmentTag(key=col1, value=segment4), SegmentTag(key=location, value=location1)]"));
  }

  @Test
  public void testDatasetCrud() {
    val client = httpClient.toBlocking();

    String writeOrgJson =
        "{\"orgId\":\"org-0\",\"granularity\":\"P1D\",\"datasetId\": \"model-99\"}";
    client.exchange(
        HttpRequest.POST("/dataset/writeDataset", writeOrgJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val o =
        client.exchange(
            HttpRequest.GET("/dataset/getDataset/org-0/model-99")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            Dataset.class);

    assertFalse(o.body().getIngestionDisabled());
    Assertions.assertEquals("P1D", o.body().getGranularity());
    Assertions.assertEquals("org-0", o.body().getOrgId());
    Assertions.assertEquals("model-99", o.body().getDatasetId());

    String disableIngestion =
        "{\"orgId\":\"org-0\",\"ingestionDisabled\":true,\"datasetId\": \"model-99\"}";
    client.exchange(
        HttpRequest.POST("/dataset/writeDataset", disableIngestion)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val o2 =
        client.exchange(
            HttpRequest.GET("/dataset/getDataset/org-0/model-99")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            Dataset.class);

    assertTrue(o2.body().getIngestionDisabled());

    String enableIngestion =
        "{\"orgId\":\"org-0\",\"ingestionDisabled\":false,\"datasetId\": \"model-99\"}";
    client.exchange(
        HttpRequest.POST("/dataset/writeDataset", enableIngestion)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val o3 =
        client.exchange(
            HttpRequest.GET("/dataset/getDataset/org-0/model-99")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            Dataset.class);

    assertFalse(o3.body().getIngestionDisabled());
  }

  // Disabling to get timescaledb back to apache2 licence
  /*
  @Test
  public void testPGCronBackedDataFlow() {
    val client = httpClient.toBlocking();

    // Flip on new pg_cron based workflow
    try {
      client.exchange(
          HttpRequest.POST("/admin/dataflow/setUsePgCronBasedFlows/true", "{}")
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON));
      assertFalse(
          client
              .exchange(
                  HttpRequest.GET("/admin/dataflow/isMaintenanceWindow")
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  MaintenanceWindowResponse.class)
              .body()
              .isMaintenanceWindow());

      // Assert workers were created
      assertEquals(
          2,
          client
              .exchange(
                  HttpRequest.GET(
                          "/admin/dataflow/countQueueWorkers/"
                              + PostgresQueues.queue_data_promotions_bronze_to_silver)
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  QueueStatsResponse.class)
              .body()
              .getSize());
      assertEquals(
          2,
          client
              .exchange(
                  HttpRequest.GET(
                          "/admin/dataflow/countQueueWorkers/"
                              + PostgresQueues.queue_data_promotions_silver_to_historical)
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  QueueStatsResponse.class)
              .body()
              .getSize());
      assertEquals(
          2,
          client
              .exchange(
                  HttpRequest.GET(
                          "/admin/dataflow/countQueueWorkers/"
                              + PostgresQueues.queue_timescale_compression)
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  QueueStatsResponse.class)
              .body()
              .getSize());

      // Add a worker
      assertEquals(
          3,
          client
              .exchange(
                  HttpRequest.POST(
                          "/admin/dataflow/addQueueWorker/"
                              + PostgresQueues.queue_timescale_compression,
                          "{}")
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  QueueStatsResponse.class)
              .body()
              .getSize());

      // Drop a worker
      assertEquals(
          2,
          client
              .exchange(
                  HttpRequest.POST(
                          "/admin/dataflow/removeQueueWorker/"
                              + PostgresQueues.queue_timescale_compression,
                          "{}")
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  QueueStatsResponse.class)
              .body()
              .getSize());

      val sizeMapBefore =
          client.exchange(
              HttpRequest.GET("/profiles/getTableSizes")
                  .contentType(MediaType.APPLICATION_JSON_TYPE)
                  .accept(MediaType.APPLICATION_JSON),
              TableSizesResponse.class);

      ingestProfile(
          "/profiles/org-1017-model-1838-2022-05-28T032147.858-P6E9t1zvVQstxIqrmdQet2g0v4ajLDVL.bin");

      // Force bronze=>silver promotion
      client.exchange(
          HttpRequest.POST("/admin/dataflow/initiateBronzeToSilverDataPromotions/", "{}")
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON));
      client.exchange(
          HttpRequest.POST("/admin/dataflow/promoteBronzeToSilverWork", "{}")
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON));

      // Initiate downtime window for silver => historical
      client.exchange(
          HttpRequest.POST("/admin/dataflow/initiateSilverToHistoricalDataPromotions/", "{}")
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON));

      assertTrue(
          client
              .exchange(
                  HttpRequest.GET("/admin/dataflow/isMaintenanceWindow")
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  MaintenanceWindowResponse.class)
              .body()
              .isMaintenanceWindow());

      // Burn through work

      while (true) {
        if (getTableSizes().getCounts().get("profiles_segmented_staging_silver") == 0
            && getTableSizes().getCounts().get("profiles_overall_staging_silver") == 0
            && client
                    .exchange(
                        HttpRequest.GET(
                                "/admin/dataflow/getQueueSize/"
                                    + PostgresQueues.queue_data_promotions_silver_to_historical)
                            .contentType(MediaType.APPLICATION_JSON_TYPE)
                            .accept(MediaType.APPLICATION_JSON),
                        QueueStatsResponse.class)
                    .body()
                    .getSize()
                == 0) {
          break;
        }
        client.exchange(
            HttpRequest.POST("/admin/dataflow/promoteSilverToHistoricalWork", "{}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
        client.exchange(
            HttpRequest.POST("/admin/dataflow/pollPromotionStatus", "{}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
      }

      // Compress all the chunks
      while (client
              .exchange(
                  HttpRequest.GET(
                          "/admin/dataflow/getQueueSize/"
                              + PostgresQueues.queue_timescale_compression)
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  QueueStatsResponse.class)
              .body()
              .getSize()
          > 0) {
        client.exchange(
            HttpRequest.POST("/admin/dataflow/compressOldChunk", "{}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
      }

      client.exchange(
          HttpRequest.POST("/admin/dataflow/pollCompressionStatus", "{}")
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON));

      // Maintenance window complete
      assertFalse(
          client
              .exchange(
                  HttpRequest.GET("/admin/dataflow/isMaintenanceWindow")
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  MaintenanceWindowResponse.class)
              .body()
              .isMaintenanceWindow());
    } finally {
      // Turn pg flow back off
      client.exchange(
          HttpRequest.POST("/admin/dataflow/setUsePgCronBasedFlows/false", "{}")
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON));
    }
  }
   */

  @Test
  public void testVacuumApi() {
    val client = httpClient.toBlocking();
    client.exchange(
        HttpRequest.POST("/admin/dataflow/vacuum", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_YAML));
  }

  private TableSizesResponse getTableSizes() {
    val client = httpClient.toBlocking();
    return client
        .exchange(
            HttpRequest.GET("/profiles/getTableSizes")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            TableSizesResponse.class)
        .body();
  }

  /**
   * test that activeColumns api picks up newly ingested profiles.
   *
   * <p>newly ingested profiles move through several lifecycle stages. Make sure activeColumns picks
   * up the very first lifecycle, metrics in the staging tables in postgres.
   */
  @SneakyThrows
  @Test
  void testActiveColumnIngestion() {
    val client = httpClient.toBlocking();

    // assert there are no active columns for this model before ingestion
    String activeColumnRequest =
        "{"
            + "  \"orgId\": \"org-WUr7GE\","
            + "  \"datasetId\": \"model-1\","
            + "  \"interval\": \"2024-09-01T00:00:00.000Z/P7D\""
            + "}";
    String ret =
        client.retrieve(
            HttpRequest.POST("/profiles/activeColumns", activeColumnRequest)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    JsonNode response = objectMapper.readTree(ret);
    assertTrue(response.isArray());
    assertThat(response.size(), is(0));

    // ingest a  new model
    ingestProfile(
        "/profiles/testActiveColumnIngestion/org-WUr7GE-model-1-2024-09-01T000000-IOXp9tl4SkSF9uRAEO2Gz1WYoKQbhuCw.bin");

    // assert there are immediately active columns on the model we just ingested.
    ret =
        client.retrieve(
            HttpRequest.POST("/profiles/activeColumns", activeColumnRequest)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    response = objectMapper.readTree(ret);
    assertTrue(response.isArray());
    assertThat(response.size(), is(2));
    assertThat(
        (ArrayList<String>) objectMapper.convertValue(response, ArrayList.class),
        containsInAnyOrder("doubles", "ints"));
  }

  /**
   * Scheduled work should grab anything for the current bucket and roll. Data uploaded prior to the
   * current scheduled bucket should trigger an autobackfill if its a newly arriving datapoint.
   */
  @SneakyThrows
  @Disabled("Disabled until consistently passes - see https://app.clickup.com/t/86b2fkxkv")
  @Test
  public void testLateArrivingDataVsScheduledWork() {
    writeMonitorConfig("/queries/monitorConfigIntegrationTest.json");

    val client = httpClient.toBlocking();
    // Cancel
    for (val a : getAsyncRequests("org-999", "model-888")) {
      client.exchange(
          HttpRequest.DELETE("/analysisAsync/triggerAnalysis/cancel/" + a.getRunId())
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON));
    }
    rewindSchedule("org-999", "model-888", "2024-09-24T00:00:00Z");

    // Sat Aug 31 2024 21:04:45 GMT+0000 dataset
    ingestProfile("/profiles/integrationTest/org-0-model-0-step1.bin");
    val a = getEntitySchema("org-999", "model-888", "last_pymnt_amnt");

    // Sat Aug 31 2024 21:04:45 GMT+0000 dataset, different segment
    ingestProfile("/profiles/integrationTest/org-0-model-0-step2.bin");
    val b = getEntitySchema("org-999", "model-888", "recoveries");
    assertEquals(a.getColumns().size(), b.getColumns().size());

    // Tue Sep 24 2024 22:10:41 GMT+0000 : Covered by Scheduled Workload
    ingestProfile("/profiles/integrationTest/org-0-model-0-step3.bin");
    EntitySchema schema = getEntitySchema("org-999", "model-888", "seller_zip_code_prefix");
    // Schema sholud have grown to accept some new columns in the step3 profile
    assertTrue(schema.getColumns().size() > a.getColumns().size());

    triggerDataPromotion();
    triggerColumnStatRollups();

    int colsToBackfill = 0;
    val requests = getAsyncRequests("org-999", "model-888");
    Set<String> uniqueSegmentLists = new HashSet();
    for (val asyncRequest : requests) {
      if (asyncRequest.getStatus().equals(StatusEnum.PENDING)) {
        asyncRequest.getSegmentList();
        assertEquals(103, asyncRequest.getColumns().size());
        assertEquals(asyncRequest.getQueue(), AsyncAnalysisQueue.backfill);
        assertEquals(
            asyncRequest.getBackfillInterval(),
            "2024-08-31T00:00:00.000Z/2024-09-01T00:00:00.000Z");
        uniqueSegmentLists.add(asyncRequest.getSegmentList());
      }
      client.exchange(
          HttpRequest.DELETE("/analysisAsync/triggerAnalysis/cancel/" + asyncRequest.getRunId())
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON));
    }
    assertEquals(3, uniqueSegmentLists.size());

    // Thu Sep 19 2024 15:08:30 GMT+0000 backfill another even older timestamp
    ingestProfile("/profiles/integrationTest/org-0-model-0-step4.bin");
    triggerDataPromotion();
    triggerColumnStatRollups();
    for (val asyncRequest : getAsyncRequests("org-999", "model-888")) {
      if (asyncRequest.getStatus().equals(StatusEnum.PENDING)
          && Interval.parse(asyncRequest.getBackfillInterval())
              .getStart()
              .isBefore(1726758520000l)) {
        assertEquals(103, asyncRequest.getColumns().size());
        assertEquals(asyncRequest.getQueue(), AsyncAnalysisQueue.backfill);
      }
    }

    // Trigger query planner
    client.exchange(
        HttpRequest.GET("/analysisAsync/triggerQueryPlanner")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    for (val asyncRequest : getAsyncRequests("org-999", "model-888")) {
      if (!asyncRequest.getStatus().equals(StatusEnum.CANCELED)) {
        pollForAdhocJobStatus(asyncRequest.getRunId(), StatusEnum.SUCCESSFUL);
      }
    }

    val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-999");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-888"));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setReadPgMonitor(true);
    getAnalyzerResultRequest.setLimit(1000);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2024-08-01T00:00:00Z/2024-12-30T00:00:00Z"));
    val results =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnalyzerResults",
                    objectMapper.writeValueAsString(getAnalyzerResultRequest))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            AnalyzerResult[].class);
    assertTrue(results.length > 0);
    Long segmented = 0l;
    Long unsegmented = 0l;
    Set<String> uniqueSegments = new HashSet<>();
    for (val result : results) {
      uniqueSegments.add(result.getSegment());
      if (StringUtils.isEmpty(result.getSegment())) {
        unsegmented++;
      } else {
        segmented++;
      }
    }
    assertEquals(segmented, unsegmented);
    assertEquals(2, uniqueSegments.size());
  }

  @SneakyThrows
  private void rewindSchedule(String orgId, String datasetId, String timestamp) {
    val client = httpClient.toBlocking();
    client.exchange(
        HttpRequest.POST(
                "monitorScheduler/rewindSchedule",
                objectMapper.writeValueAsString(
                    RewindScheduleRequest.builder()
                        .orgId(orgId)
                        .datasetId(datasetId)
                        .timestamp(timestamp)
                        .build()))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
  }

  @SneakyThrows
  private AsyncRequest[] getAsyncRequests(String orgId, String datasetId) {
    val client = httpClient.toBlocking();
    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId(orgId);
    getRequests.setDatasetId(datasetId);
    return client.retrieve(
        HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON),
        AsyncRequest[].class);
  }

  @SneakyThrows
  private void writeMonitorConfig(String file) {
    val client = httpClient.toBlocking();
    String json =
        IOUtils.toString(
            Objects.requireNonNull(getClass().getResourceAsStream(file)), StandardCharsets.UTF_8);
    val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);

    val row =
        MonitorConfigV3Row.builder()
            .jsonConf(json)
            .orgId(conf.getOrgId())
            .datasetId(conf.getDatasetId())
            .build();

    val postReq =
        HttpRequest.POST("/monitorConfig/save", objectMapper.writeValueAsString(row))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    client.exchange(postReq);
  }

  @SneakyThrows
  private EntitySchema getEntitySchema(String orgId, String datasetId, String pollForColumnUpdate) {
    val client = httpClient.toBlocking();
    // retrieve current schema view.
    val g = new GetEntitySchemaRequest();
    g.setOrgId(orgId);
    g.setDatasetId(datasetId);
    g.setIncludeHidden(false);

    for (int x = 0; x < 10; x++) {
      val entitySchema =
          client
              .exchange(
                  HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                      .contentType(MediaType.APPLICATION_JSON_TYPE)
                      .accept(MediaType.APPLICATION_JSON),
                  EntitySchema.class)
              .body();
      if (entitySchema != null && entitySchema.getColumns().containsKey(pollForColumnUpdate)) {
        return entitySchema;
      }
    }
    throw new IllegalStateException(
        "Entity schema not updated with column: "
            + pollForColumnUpdate
            + " in a reasonable period of time");
  }
}
