package ai.whylabs.dataservice.metrics.service;

import static ai.whylabs.dataservice.metrics.agg.BuiltInProfileAgg.*;
import static ai.whylabs.dataservice.metrics.agg.BuiltinSpec.*;
import static ai.whylabs.dataservice.metrics.agg.BuiltinSpec.min;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import ai.whylabs.adhoc.structures.AdHocMonitorResponse;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.metrics.TimeSeriesQueryRequest;
import ai.whylabs.dataservice.metrics.agg.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.joda.time.Interval;
import org.junit.jupiter.api.Test;

@MicronautTest()
@Slf4j
public class TimeSeriesMetricServiceTest extends BasePostgresTest {
  @Inject
  @Client(value = "/")
  HttpClient httpClient;

  @Inject private ObjectMapper objectMapper;

  @Inject private TimeSeriesMetricService timeSeriesMetricService;

  @SneakyThrows
  @Test
  void testTimeseriesWithBuiltinMetric() {

    val json =
        "{"
            + "  \"rollupGranularity\": \"daily\","
            + "  \"interval\": \"2022-12-06T00:00:00.000Z/P4D\","
            + "  \"timeseries\": ["
            + "    {"
            + "      \"queryId\": \"q2\","
            + "      \"resourceId\": \"model-60\","
            + "      \"columnName\": \"product\","
            + "      \"segment\": [],"
            + "      \"metric\": \"unique_est\""
            + "    }"
            + "  ]"
            + "}";

    val rqst = objectMapper.readValue(json, TimeSeriesQueryRequest.class);
    val results = timeSeriesMetricService.timeseries("org-5Hsdjx", rqst);
    assertThat(results.getTimeseries().get(0).getData(), hasSize(equalTo(4)));
    val values =
        results.getTimeseries().get(0).getData().stream()
            .map(me -> me.getValue())
            .collect(Collectors.toList());
    assertThat(values, everyItem(notNullValue()));
  }

  @SneakyThrows
  @Test
  void testTimeseriesWithCustomMetric() {

    val json =
        "{"
            + "  \"rollupGranularity\": \"daily\","
            + "  \"interval\": \"2022-12-06T00:00:00.000Z/P4D\","
            + "  \"timeseries\": ["
            + "    {"
            + "      \"queryId\": \"q2\","
            + "      \"resourceId\": \"model-60\","
            + "      \"columnName\": \"product\","
            + "      \"segment\": [],"
            + "      \"custom\": {"
            + "        \"metricPath\": \"cardinality/hll\","
            + "        \"datasource\": \"profiles\","
            + "        \"aggregation\": \"hll_union\","
            + "        \"postAgg\": {"
            + "          \"type\": \"unique_est\","
            + "          \"numStddevs\": 2,"
            + "          \"position\": 1"
            + "        },"
            + "        \"supportedLevels\": ["
            + "          \"COLUMN\""
            + "        ]"
            + "      }"
            + "    }"
            + "  ]"
            + "}";

    val rqst = objectMapper.readValue(json, TimeSeriesQueryRequest.class);
    val results = timeSeriesMetricService.timeseries("org-5Hsdjx", rqst);
    assertThat(results.getTimeseries().get(0).getData(), hasSize(equalTo(4)));
    val values =
        results.getTimeseries().get(0).getData().stream()
            .map(me -> me.getValue())
            .collect(Collectors.toList());
    assertThat(values, everyItem(notNullValue()));
  }

  @SneakyThrows
  @Test
  void testMonitorTimeseries() {
    val client = httpClient.toBlocking();
    // Generate some sample data
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass().getResourceAsStream("/queries/adhocAnomalyGenerator.json")),
            StandardCharsets.UTF_8);
    val postReq =
        HttpRequest.POST("/analysis/runAnalyzer", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, AdHocMonitorResponse.class);

    // Copy the results over to the main tables so we can play around with data deletion APIs
    client.exchange(
        HttpRequest.POST(String.format("/analysis/promoteAdhocResults/%s", resp.runId), "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
  }

  @SneakyThrows
  @Test
  void testPerformanceMetric() {

    val json =
        "{"
            + "        \"rollupGranularity\": \"daily\","
            + "            \"interval\": \"2022-12-02/P5D\","
            + "            \"timeseries\": ["
            + "        {"
            + "            \"queryId\": \"q4\","
            + "                \"resourceId\": \"model-60\","
            + "                \"metric\": \"classification_precision\""
            + "        }"
            + "      ]"
            + "    }";

    val rqst = objectMapper.readValue(json, TimeSeriesQueryRequest.class);
    val results = timeSeriesMetricService.timeseries("org-5Hsdjx", rqst);
    assertThat(results.getTimeseries().get(0).getData(), hasSize(equalTo(5)));
    val values =
        results.getTimeseries().get(0).getData().stream()
            .map(me -> me.getValue())
            .collect(Collectors.toList());
    assertThat(values, everyItem(notNullValue()));
  }

  @Test
  void testNumericTimeseriesMetrics() {
    BuiltinSpec[] numericSpecs = {
      min,
      median,
      max,
      quantile_5,
      quantile_25,
      quantile_75,
      quantile_90,
      quantile_95,
      quantile_99,
      unique_est,
      unique_upper,
      unique_lower,
      variance,
      mean,
      std_dev,
      count,
      count_string,
      count_bool,
      count_fractional,
      count_integral,
      count_null,
      count_object
    };

    for (val spec : numericSpecs) {
      List<? extends Agg.Row> rows =
          timeSeriesMetricService.queryRowsFromProfiles(
              "org-5Hsdjx",
              "model-98",
              "prompt.character_count",
              Collections.emptyList(),
              Interval.parse("2023-10-01T00:00:00Z/2023-11-01T00:00:00Z"),
              DataGranularity.daily,
              spec);
      // verify that the query does not crash, and returns the expected number and type of results.
      assertThat("metric spec " + spec.toString(), rows, hasSize(equalTo(7)));
      assertThat("metric spec " + spec.toString(), rows.get(0), isA(Agg.NumericRow.class));
      val values =
          rows.stream().map(r -> ((Agg.NumericRow) r).getValue()).collect(Collectors.toList());
      assertThat(values, everyItem(notNullValue()));
    }
  }

  @Test
  void testRawTimeseriesMetrics() {
    BuiltinSpec[] specs = {kll_raw, hll_raw, frequent_strings_raw};
    for (val spec : specs) {
      List<? extends Agg.Row> rows =
          timeSeriesMetricService.queryRowsFromProfiles(
              "org-5Hsdjx",
              "model-98",
              "prompt.character_count",
              Collections.emptyList(),
              Interval.parse("2023-10-01T00:00:00Z/2023-11-01T00:00:00Z"),
              DataGranularity.daily,
              spec);
      // verify that the query does not crash, and returns the expected number and type of results.
      assertThat("metric spec " + spec.toString(), rows, hasSize(equalTo(7)));
      assertThat("metric spec " + spec.toString(), rows.get(0), isA(Agg.BytesRow.class));
      List<byte[]> values =
          rows.stream().map(r -> ((Agg.BytesRow) r).getValue()).collect(Collectors.toList());
      assertThat(values, everyItem(notNullValue()));
    }

    // note the classification metric does not take a column name
    BuiltinSpec spec = classification_raw;
    List<? extends Agg.Row> rows =
        timeSeriesMetricService.queryRowsFromProfiles(
            "org-5Hsdjx",
            "model-60",
            null,
            Collections.emptyList(),
            Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"),
            DataGranularity.daily,
            spec);
    // verify that the query does not crash, and returns the expected number and type of results.
    assertThat("metric spec " + spec.toString(), rows, hasSize(equalTo(8)));
    assertThat("metric spec " + spec.toString(), rows.get(0), isA(Agg.BytesRow.class));
    List<byte[]> values =
        rows.stream().map(r -> ((Agg.BytesRow) r).getValue()).collect(Collectors.toList());
    assertThat(values, everyItem(notNullValue()));

    // note the regression metric does not take a column name
    spec = regression_raw;
    rows =
        timeSeriesMetricService.queryRowsFromProfiles(
            "org-5Hsdjx",
            "model-61",
            null,
            Collections.emptyList(),
            Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"),
            DataGranularity.daily,
            spec);
    // verify that the query does not crash, and returns the expected number and type of results.
    assertThat("metric spec " + spec.toString(), rows, hasSize(equalTo(8)));
    assertThat("metric spec " + spec.toString(), rows.get(0), isA(Agg.BytesRow.class));
    values = rows.stream().map(r -> ((Agg.BytesRow) r).getValue()).collect(Collectors.toList());
    assertThat(values, everyItem(notNullValue()));
  }
}
