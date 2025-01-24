package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ai.whylabs.core.enums.IngestionRollupGranularity;
import ai.whylabs.core.structures.Org;
import ai.whylabs.dataservice.BasePostgresTest;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@MicronautTest()
@Slf4j
public class OrgControllerTest extends BasePostgresTest {

  @Inject
  @Client(value = "/")
  HttpClient httpClient;

  @SneakyThrows
  @Test
  public void testOrgCrud() {
    val client = httpClient.toBlocking();
    client.exchange(
        HttpRequest.POST("/org/purgeCache", "{}").contentType(MediaType.APPLICATION_JSON_TYPE));

    String writeOrgJson =
        "{\"orgId\":\"org-0\",\"dataRetentionDays\":365,\"enableGranularDataStorage\": true}";
    val w =
        client.exchange(
            HttpRequest.POST("/org/save", writeOrgJson)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(200, w.code());

    val o =
        client.exchange(
            HttpRequest.GET("/org/get/org-0")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            Org.class);

    assertEquals(200, o.code());
    assertTrue(o.body().getEnableGranularDataStorage());

    val enabled =
        client.exchange(
            HttpRequest.GET("/org/setting/granularDataStorageEnabled/org-0")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            Boolean.class);
    assertEquals(200, enabled.code());

    assertEquals(enabled.getBody().get(), true);

    val enabledOtherOrg =
        client.exchange(
            HttpRequest.GET("/org/setting/granularDataStorageEnabled/org-42")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            Boolean.class);
    assertEquals(enabledOtherOrg.getBody().get(), false);

    String updateOrgJson =
        "{\"orgId\":\"org-0\",\"dataRetentionDays\":900,\"enableGranularDataStorage\": true, \"ingestionGranularity\":\"PT15M\"}";
    client.exchange(
        HttpRequest.POST("/org/save", updateOrgJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val o2 =
        client.exchange(
            HttpRequest.GET("/org/get/org-0")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            Org.class);

    assertEquals(o2.body().getDataRetentionDays(), 900);
    assertEquals(IngestionRollupGranularity.PT15M, o2.body().getIngestionGranularity());
  }

  @SneakyThrows
  @Test
  public void testDataRetention() {
    val client = httpClient.toBlocking();

    String copyDataJson =
        "{\n"
            + "      \"sourceOrgId\": \"org-5Hsdjx\",\n"
            + "            \"sourceDatasetId\": \"model-60\",\n"
            + "            \"targetOrgId\": \"org-119\",\n"
            + "            \"targetDatasetId\": \"model-601\",\n"
            + "            \"interval\": \"2020-05-06T23:50:13Z/2023-05-08T05:10:13Z\"\n"
            + "    }";
    client.exchange(
        HttpRequest.POST("/profiles/copy/false", copyDataJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val r =
        client.exchange(
            HttpRequest.POST("/org/applyDataRetention/org-119/180/false", "{}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    String rqst =
        "{\n"
            + "  \"orgId\": \"org-119\",\n"
            + "  \"interval\": \"2022-12-05T01:00:00.000Z/P1D\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"segment\": [ ],\n"
            + "  \"datasetColumnSelectors\": [\n"
            + "    { \"datasetId\": \"model-601\", \"columnNames\": [\"market_price\"], \"metric\": \"quantile_99\" },\n"
            + "    { \"datasetId\": \"model-601\", \"columnNames\": [\"sales_last_week\"], \"metric\": \"quantile_99\" },\n"
            + "    { \"datasetId\": \"model-601\", \"columnNames\": [\"rating\"], \"metric\": \"quantile_99\" }\n"
            + "  ]\n"
            + "}";
    String json =
        client.retrieve(
            HttpRequest.POST("/profiles/numericMetricsForTimeRange", rqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    assertEquals("[]", json);
  }
}
