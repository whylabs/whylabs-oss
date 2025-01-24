package ai.whylabs.dataservice.services;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.insights.InsightEntry;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

@Slf4j
public class ProfileInsightsServiceTest extends BasePostgresTest {

  @Inject
  @Client(value = "/")
  HttpClient httpClient;

  @Inject private ObjectMapper objectMapper;

  /**
   * Relies on org-5Hsdjx/model-98 in unit test database for LLM features, specifically including
   * `response.data_leakage`
   *
   * <p>*.dataleakage is an alias for *.has_patterns column names. the assignment of LLM tags to
   * aliases columns is done at ingestion when the entity schema is assigned. So this test relies on
   * the entity schema ineference to assign the apprpriate LLM tags, and the LLM inference query to
   * recognize those tags.
   */
  @SneakyThrows
  @Test
  @Disabled(
      "llm aliases tested elsewhere, and this test requires entity schema tables in unit test database")
  void testDataLeakage() {
    val client = httpClient.toBlocking();
    String insightRequest =
        "{"
            + "\"orgId\": \"org-5Hsdjx\","
            + "\"datasetId\": \"model-98\","
            + "\"interval\": \"2023-10-21T00:00:00.000Z/P1W\","
            + "\"granularity\": \"daily\""
            + "}";

    String jsonReply =
        client.retrieve(
            HttpRequest.POST("/profiles/insights/single", insightRequest)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    List<InsightEntry> results =
        objectMapper.readValue(jsonReply, new TypeReference<List<InsightEntry>>() {});
    // .data_leakage is an alias for .has_patterns
    // make sure insights captures the response.data_leakage feature name.
    val leakageResults =
        results.stream()
            .filter(i -> i.getColumn().endsWith("data_leakage"))
            .collect(Collectors.toList());
    assertThat(leakageResults, hasSize(equalTo(2)));
    assertThat(
        leakageResults.stream().map(InsightEntry::getName).collect(Collectors.toList()),
        containsInAnyOrder("llm_patterns", "llm_reading_ease"));
  }
}
