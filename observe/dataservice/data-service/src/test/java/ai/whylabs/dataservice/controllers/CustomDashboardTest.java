package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.requests.CloneCustomDashboardRequest;
import ai.whylabs.dataservice.requests.CustomDashboardUpsertRequest;
import ai.whylabs.dataservice.structures.CustomDashboard;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.core.type.Argument;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.util.List;
import javax.inject.Inject;
import lombok.val;
import org.junit.jupiter.api.*;

@MicronautTest()
public class CustomDashboardTest extends BasePostgresTest {

  @Inject
  @Client(value = "/")
  HttpClient httpClient;

  private static final CustomDashboard mockDashboard =
      new CustomDashboard(
          "dashboard-1",
          "org-test",
          "My test dashboard",
          "test-author",
          "{\"mocked\": true}",
          null,
          null,
          null,
          null);

  @Inject private ObjectMapper objectMapper;

  private HttpResponse<CustomDashboard> upsertRequest(
      String orgId, CustomDashboardUpsertRequest body) throws JsonProcessingException {
    val client = httpClient.toBlocking();
    return client.exchange(
        HttpRequest.POST(
                String.format("/customDashboard/%s/save", orgId),
                objectMapper.writeValueAsString(body))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON),
        CustomDashboard.class);
  }

  private HttpResponse<List<CustomDashboard>> listDashboards(String orgId) {
    val client = httpClient.toBlocking();
    return client.exchange(
        HttpRequest.GET(String.format("/customDashboard/%s/list", orgId))
            .accept(MediaType.APPLICATION_JSON),
        Argument.listOf(CustomDashboard.class));
  }

  private HttpResponse<CustomDashboard> firstCreatedDashboard;
  private HttpResponse<CustomDashboard> secondCreatedDashboard;

  private HttpResponse<CustomDashboard> firstSecondaryOrgCreatedDashboard;

  /*
   * Custom dashboard has a composite PK (id and orgId) so we expect to have different rows with the same id
   * since those are from different organizations. In this test, with the same payload, we create 2 dashboards for org-test,
   * and we expect ids to be dashboard-1 and dashboard-2, then we create another dashboard for a different org,
   * and we expect the id to be dashboard-1.
   */
  @BeforeEach
  public void insertingDashboards() throws JsonProcessingException {
    // cleaning database
    super.runDirectQuery(
        "DELETE from whylabs.custom_dashboards; DELETE from whylabs.custom_dashboards_index_track;");

    // inserting samples
    val createReqBody = new CustomDashboardUpsertRequest();
    createReqBody.setAuthor(mockDashboard.getAuthor());
    createReqBody.setSchema(mockDashboard.getSchema());
    createReqBody.setDisplayName(mockDashboard.getDisplayName());
    createReqBody.setIsFavorite(true); // should not persist isFavorite at creation time

    firstCreatedDashboard = upsertRequest(mockDashboard.getOrgId(), createReqBody);
    secondCreatedDashboard = upsertRequest(mockDashboard.getOrgId(), createReqBody);
    firstSecondaryOrgCreatedDashboard = upsertRequest("org-test-2", createReqBody);
  }

  @Test
  public void testUpsertCreation() throws JsonProcessingException {
    assertEquals(firstCreatedDashboard.body().getId(), "dashboard-1");
    assertEquals(firstCreatedDashboard.body().getSchema(), mockDashboard.getSchema());
    assertEquals(firstCreatedDashboard.body().getDisplayName(), mockDashboard.getDisplayName());
    assertEquals(firstCreatedDashboard.body().getAuthor(), mockDashboard.getAuthor());
    assertEquals(firstCreatedDashboard.body().getIsFavorite(), false);

    assertEquals(secondCreatedDashboard.body().getId(), "dashboard-2");

    assertEquals(firstSecondaryOrgCreatedDashboard.body().getId(), "dashboard-1");
  }

  @Test
  public void testUpsertUpdate() throws JsonProcessingException {
    val client = httpClient.toBlocking();

    // Updating a dashboard (we are not allowed to update certain fields)
    val updateReqBody = new CustomDashboardUpsertRequest();
    updateReqBody.setId(mockDashboard.getId());
    updateReqBody.setDisplayName("Updated display name");
    updateReqBody.setAuthor("not-allowed-to-update-author");
    updateReqBody.setSchema("{\"status\": \"updated\"}");
    updateReqBody.setIsFavorite(true);

    val updatedDashboard = upsertRequest(mockDashboard.getOrgId(), updateReqBody);

    assertEquals(updatedDashboard.body().getId(), mockDashboard.getId());
    assertEquals(updatedDashboard.body().getOrgId(), mockDashboard.getOrgId());
    assertEquals(updatedDashboard.body().getSchema(), "{\"status\": \"updated\"}");
    assertEquals(updatedDashboard.body().getDisplayName(), "Updated display name");
    assertEquals(
        updatedDashboard.body().getAuthor(), mockDashboard.getAuthor()); // Should not update
    assertEquals(updatedDashboard.body().getIsFavorite(), true);
  }

  @Test
  public void testUpsertUpdateWithNonexistentDashboardId() throws JsonProcessingException {
    val client = httpClient.toBlocking();

    // Trying to update a nonexistent dashboard ID
    val upsertReqBody = new CustomDashboardUpsertRequest();
    upsertReqBody.setId("dashboard-nonexistent");
    upsertReqBody.setIsFavorite(true);
    var failed = false;
    try {
      client.exchange(
          HttpRequest.POST(
                  String.format("/customDashboard/%s/save", mockDashboard.getOrgId()),
                  objectMapper.writeValueAsString(upsertReqBody))
              .contentType(MediaType.APPLICATION_JSON_TYPE)
              .accept(MediaType.APPLICATION_JSON),
          CustomDashboard.class);
    } catch (HttpClientResponseException e) {
      assertEquals(e.getResponse().code(), 400);
      failed = true;
    }
    assertTrue(failed);
  }

  @Test
  public void testDashboardClone() throws JsonProcessingException {
    val client = httpClient.toBlocking();

    val cloneReq = new CloneCustomDashboardRequest();
    cloneReq.setAuthor("clone-author");
    cloneReq.setId("dashboard-2");

    val response =
        client.exchange(
            HttpRequest.POST(
                    String.format("/customDashboard/%s/clone", mockDashboard.getOrgId()),
                    objectMapper.writeValueAsString(cloneReq))
                .contentType(MediaType.APPLICATION_JSON));

    assertEquals(response.code(), 200);

    val dashboards = listDashboards(mockDashboard.getOrgId());
    assertEquals(dashboards.body().size(), 3);
    val clonedDashboard = dashboards.body().get(2);
    assertEquals(clonedDashboard.getDisplayName(), mockDashboard.getDisplayName().concat(" copy"));
    assertEquals(clonedDashboard.getSchema(), mockDashboard.getSchema());
    assertEquals(clonedDashboard.getId(), "dashboard-3");
  }

  @Test
  public void testGetById() {
    val client = httpClient.toBlocking();

    // Find dashboard by ID
    val foundDashboard =
        client.exchange(
            HttpRequest.GET(
                    String.format(
                        "/customDashboard/%s/get/%s",
                        mockDashboard.getOrgId(), mockDashboard.getId()))
                .accept(MediaType.APPLICATION_JSON),
            CustomDashboard.class);

    assertEquals(foundDashboard.body().getOrgId(), mockDashboard.getOrgId());
    assertEquals(foundDashboard.body().getSchema(), mockDashboard.getSchema());
    assertEquals(foundDashboard.body().getDisplayName(), mockDashboard.getDisplayName());
    assertEquals(foundDashboard.body().getAuthor(), mockDashboard.getAuthor());
  }

  @Test
  public void testGetByIdWithNonexistentId() {
    val client = httpClient.toBlocking();
    var failed = false;
    // Testing exception when dashboard not found
    try {
      client.exchange(
          HttpRequest.GET(
                  String.format(
                      "/customDashboard/%s/get/dashboard-nonexistent",
                      mockDashboard.getOrgId(), mockDashboard.getId()))
              .accept(MediaType.APPLICATION_JSON),
          CustomDashboard.class);
    } catch (HttpClientResponseException e) {
      failed = true;
      assertEquals(e.getResponse().code(), 404);
    }
    assertTrue(failed);
  }

  @Test
  public void testListDashboards() {
    val dashboards = listDashboards(mockDashboard.getOrgId());
    assertEquals(dashboards.body().size(), 2);
  }

  @Test
  public void testMarkDashboardAsDeleted() {
    val client = httpClient.toBlocking();

    // Mark dashboard-1 as deleted
    val response =
        client.exchange(
            HttpRequest.DELETE(
                    String.format(
                        "/customDashboard/%s/delete/%s",
                        mockDashboard.getOrgId(), mockDashboard.getId()))
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(response.code(), 200);

    // List dashboards for org-test after delete
    val dashboards = listDashboards(mockDashboard.getOrgId());

    assertEquals(dashboards.body().size(), 1);
  }
}
