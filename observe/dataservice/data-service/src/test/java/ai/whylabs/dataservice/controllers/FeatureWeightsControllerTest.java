package ai.whylabs.dataservice.controllers;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.closeTo;
import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.services.FeatureWeightsService;
import ai.whylabs.dataservice.util.SegmentUtils;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@MicronautTest
@Slf4j
class FeatureWeightsControllerTest extends BasePostgresTest {
  @Inject private FeatureWeightsController featureWeightsController;
  @Inject private FeatureWeightsService featureWeightsService;

  @Inject
  @Client("/")
  HttpClient httpClient;

  @SneakyThrows
  @Test
  public void testLoad() {
    String orgId = "org-123";
    String datasetId = "dataset-xyz";
    String json =
        "{\n"
            + "  \"metadata\": {\n"
            + "    \"version\": 0,\n"
            + "    \"updatedTimestamp\": 0,\n"
            + "    \"author\": \"string\"\n"
            + "  },\n"
            + "  \"segmentWeights\": [\n"
            + "    {\n"
            + "      \"weights\": {\n"
            + "        \"additionalProp1\": 0,\n"
            + "        \"additionalProp2\": 0,\n"
            + "        \"additionalProp3\": 0\n"
            + "      },\n"
            + "      \"segment\": [\n"
            + "        {\n"
            + "          \"key\": \"string\",\n"
            + "          \"value\": \"string\"\n"
            + "        }\n"
            + "      ]\n"
            + "    }\n"
            + "  ]\n"
            + "}\n";

    val client = httpClient.toBlocking();
    val reqUri = String.format("/feature-weights/%s/%s/store", orgId, datasetId);

    val putReq =
        HttpRequest.PUT(reqUri, json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);

    val shouldBeNull = featureWeightsController.load(orgId, datasetId);
    assertNull(shouldBeNull);

    val statusCode = client.exchange(putReq).getStatus();
    assertEquals(200, statusCode.getCode());

    val shouldNotBeEmpty = featureWeightsController.load(orgId, datasetId);

    assertFalse(shouldNotBeEmpty.getSegmentWeights().isEmpty());
    assertEquals(1, shouldNotBeEmpty.getSegmentWeights().size());
    assertEquals(3, shouldNotBeEmpty.getSegmentWeights().get(0).getWeights().size());
    assertEquals(
        0, shouldNotBeEmpty.getSegmentWeights().get(0).getWeights().get("additionalProp1"));
    assertEquals(
        0, shouldNotBeEmpty.getSegmentWeights().get(0).getWeights().get("additionalProp2"));
    assertEquals(
        0, shouldNotBeEmpty.getSegmentWeights().get(0).getWeights().get("additionalProp3"));
    assertEquals(1, shouldNotBeEmpty.getSegmentWeights().get(0).getSegment().size());
    assertEquals(
        "string", shouldNotBeEmpty.getSegmentWeights().get(0).getSegment().get(0).getKey());
    assertEquals(
        "string", shouldNotBeEmpty.getSegmentWeights().get(0).getSegment().get(0).getValue());

    // Match should extract from config
    assertThat(
        SegmentUtils.extractWeight(
            shouldNotBeEmpty,
            Segment.builder()
                .tags(Arrays.asList(Tag.builder().key("string").value("string").build()))
                .build(),
            "additionalProp1"),
        closeTo(0.0, 0.01));
    // Non-match should default
    assertThat(
        SegmentUtils.extractWeight(
            shouldNotBeEmpty,
            Segment.builder()
                .tags(Arrays.asList(Tag.builder().key("nope").value("nope").build()))
                .build(),
            "additionalProp1"),
        closeTo(1.0, 0.01));
    // Non-match should default
    assertThat(
        SegmentUtils.extractWeight(shouldNotBeEmpty, Segment.builder().build(), "additionalProp1"),
        closeTo(1.0, 0.01));
    // Null data should default
    assertThat(
        SegmentUtils.extractWeight(shouldBeNull, Segment.builder().build(), "additionalProp1"),
        closeTo(1.0, 0.01));
  }

  @SneakyThrows
  @Test
  public void testSave() {
    String orgId = "org-234";
    String datasetId = "dataset-abc";
    WeightConfig featureWeights =
        WeightConfig.builder()
            .metadata(Metadata.builder().version(0).updatedTimestamp(0L).author("system").build())
            .segmentWeights(
                List.of(
                    SegmentWeightConfig.builder()
                        .weights(
                            Map.of(
                                "additionalProp1",
                                0.1,
                                "additionalProp2",
                                0.3,
                                "additionalProp3",
                                0.3))
                        .segment(List.of(Tag.builder().key("myKey").value("myValue").build()))
                        .build()))
            .build();

    featureWeightsController.save(orgId, datasetId, featureWeights);

    val shouldNotBeEmpty = featureWeightsService.load(orgId, datasetId);

    assertFalse(shouldNotBeEmpty.getSegmentWeights().isEmpty());
    assertEquals(1, shouldNotBeEmpty.getSegmentWeights().size());
    assertEquals(3, shouldNotBeEmpty.getSegmentWeights().get(0).getWeights().size());
    assertEquals(
        0.1, shouldNotBeEmpty.getSegmentWeights().get(0).getWeights().get("additionalProp1"));
    assertEquals(
        0.3, shouldNotBeEmpty.getSegmentWeights().get(0).getWeights().get("additionalProp2"));
    assertEquals(
        0.3, shouldNotBeEmpty.getSegmentWeights().get(0).getWeights().get("additionalProp3"));
    assertEquals(1, shouldNotBeEmpty.getSegmentWeights().get(0).getSegment().size());

    assertEquals(0, shouldNotBeEmpty.getMetadata().getVersion());
    assertEquals(0L, shouldNotBeEmpty.getMetadata().getUpdatedTimestamp());
    assertEquals("system", shouldNotBeEmpty.getMetadata().getAuthor());
  }

  @SneakyThrows
  @Test
  public void testDelete() {
    String orgId = "org-345";
    String datasetId = "dataset-xyz";
    String json =
        "{\n"
            + "  \"metadata\": {\n"
            + "    \"version\": 0,\n"
            + "    \"updatedTimestamp\": 0,\n"
            + "    \"author\": \"string\"\n"
            + "  },\n"
            + "  \"segmentWeights\": [\n"
            + "    {\n"
            + "      \"weights\": {\n"
            + "        \"additionalProp1\": 0,\n"
            + "        \"additionalProp2\": 0,\n"
            + "        \"additionalProp3\": 0\n"
            + "      },\n"
            + "      \"segment\": [\n"
            + "        {\n"
            + "          \"key\": \"string\",\n"
            + "          \"value\": \"string\"\n"
            + "        }\n"
            + "      ]\n"
            + "    }\n"
            + "  ]\n"
            + "}\n";

    val client = httpClient.toBlocking();
    val reqUri = String.format("/feature-weights/%s/%s/store", orgId, datasetId);

    val putReq =
        HttpRequest.PUT(reqUri, json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);

    val statusCode = client.exchange(putReq).getStatus();
    assertEquals(200, statusCode.getCode());

    val shouldNotBeNull = featureWeightsController.load(orgId, datasetId);
    assertNotNull(shouldNotBeNull);

    val deleteReq =
        HttpRequest.DELETE(String.format("/feature-weights/%s/%s/delete", orgId, datasetId))
            .accept(MediaType.APPLICATION_JSON);

    val deleteStatusCode = client.exchange(deleteReq).getStatus();
    assertEquals(200, deleteStatusCode.getCode());

    val shouldBeNull = featureWeightsController.load(orgId, datasetId);
    assertNull(shouldBeNull);
  }

  @SneakyThrows
  @Test
  public void testDeleteWithoutWeights() {
    String orgId = "org-345";
    String datasetId = "dataset-xyz";

    val shouldBeNull = featureWeightsController.load(orgId, datasetId);
    assertNull(shouldBeNull);

    val client = httpClient.toBlocking();
    val deleteReq =
        HttpRequest.DELETE(String.format("/feature-weights/%s/%s/delete", orgId, datasetId))
            .accept(MediaType.APPLICATION_JSON);

    val deleteStatusCode = client.exchange(deleteReq).getStatus();
    assertEquals(200, deleteStatusCode.getCode());
  }
}
