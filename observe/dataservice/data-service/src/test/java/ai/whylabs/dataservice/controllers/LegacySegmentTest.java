package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.requests.HideSegmentRequest;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import java.util.ArrayList;
import javax.inject.Inject;
import javax.transaction.Transactional;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

@Slf4j
public class LegacySegmentTest extends BasePostgresTest {

  @Inject
  @Client("/")
  HttpClient client;

  @SneakyThrows
  @Test
  @Transactional
  public void testSegments() {
    val post =
        HttpRequest.POST(
            "/profiles/segments/",
            "{\"orgId\": \"" + ORG_ID + "\", \"datasetId\": \"" + DATASET_ID + "\"}");

    String segment = "category=Beauty and Hygiene";
    val segments = client.toBlocking().retrieve(post, new ArrayList<String>().getClass());
    boolean found = false;
    for (val s : segments) {
      if (s.equals(segment)) {
        found = true;
      }
    }
    assertTrue(found);

    // Hide a segment
    HideSegmentRequest hideSegmentRequest = new HideSegmentRequest();
    hideSegmentRequest.setOrgId(ORG_ID);
    hideSegmentRequest.setDatasetId(DATASET_ID);
    hideSegmentRequest.setSegment(segment);
    val hideReq =
        HttpRequest.PUT(
            "/profiles/segments/hide/",
            "{\"segment\":\""
                + segment
                + "\", \"orgId\": \""
                + ORG_ID
                + "\", \"datasetId\": \""
                + DATASET_ID
                + "\"}");
    client.toBlocking().exchange(hideReq);

    // Make sure its hidden
    val segmentsAfterHiding =
        client.toBlocking().retrieve(post, new ArrayList<String>().getClass());
    for (val s : segmentsAfterHiding) {
      assertFalse(s.equals(segment));
    }
    assertEquals(segments.size(), segmentsAfterHiding.size() + 1);

    // Validate the include hidden option when listing segment works
    val postIncludeHidden =
        HttpRequest.POST(
            "/profiles/segments/",
            "{\"includeHidden\":true,  \"orgId\": \""
                + ORG_ID
                + "\", \"datasetId\": \""
                + DATASET_ID
                + "\"}");
    val allSegmentsIncludeHidden =
        client.toBlocking().retrieve(postIncludeHidden, new ArrayList<String>().getClass());
    assertEquals(allSegmentsIncludeHidden.size(), segments.size());
  }
}
