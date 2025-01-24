package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.core.configV3.structure.ColumnSchema;
import ai.whylabs.core.configV3.structure.CustomMetricSchema;
import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.configV3.structure.enums.DataType;
import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import ai.whylabs.core.enums.ModelType;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.requests.GetEntitySchemaRequest;
import ai.whylabs.dataservice.requests.ToggleHidenColumnRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableMap;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.util.Arrays;
import javax.inject.Inject;
import lombok.val;
import org.junit.jupiter.api.Test;

@MicronautTest()
public class EntitySchemaTest extends BasePostgresTest {

  @Inject
  @Client(value = "/")
  HttpClient httpClient;

  @Inject private ObjectMapper objectMapper;

  @Test
  public void testCRUD() throws JsonProcessingException {
    val client = httpClient.toBlocking();

    ColumnSchema featureMetadata =
        ColumnSchema.builder()
            .classifier(Classifier.input)
            .discreteness(DiscretenessType.discrete)
            .dataType(DataType.BOOLEAN)
            .build();

    val schema =
        EntitySchema.builder()
            .columns(ImmutableMap.of("bc_util", featureMetadata))
            .modelType(ModelType.regression)
            .build();

    // Write Schema
    client.exchange(
        HttpRequest.PUT(
                "/entity/schema/org-0/model-110/overwrite", objectMapper.writeValueAsString(schema))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val g = new GetEntitySchemaRequest();
    g.setOrgId("org-0");
    g.setDatasetId("model-110");
    g.setIncludeHidden(false);

    // Read it back
    val retrieved =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);

    assertEquals(retrieved.body().getColumns().get("bc_util").getClassifier(), Classifier.input);
    assertEquals(retrieved.body().getModelType(), ModelType.regression);

    // Hide the column
    val h = new ToggleHidenColumnRequest();
    h.setOrgId("org-0");
    h.setDatasetId("model-110");
    h.setColumnName("bc_util");
    client.exchange(
        HttpRequest.PUT("/entity/schema/column/hide", objectMapper.writeValueAsString(h))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val retrieved2 =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);
    assertEquals(0, retrieved2.body().getColumns().size());

    // Write a single column, diff org

    client.exchange(
        HttpRequest.POST(
                "/entity/schema/column/org-42/dataset-55/blah",
                objectMapper.writeValueAsString(featureMetadata))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val g2 = new GetEntitySchemaRequest();
    g2.setOrgId("org-42");
    g2.setDatasetId("dataset-55");

    val retrieved42 =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g2))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);

    assertEquals(retrieved42.body().getColumns().get("blah").getClassifier(), Classifier.input);
    assertNull(retrieved42.body().getColumns().get("blah").getTags());

    // Test tagging an existing column
    featureMetadata.setTags(Arrays.asList("#tag_of_the_day", "#lols"));
    client.exchange(
        HttpRequest.POST(
                "/entity/schema/column/org-42/dataset-55/blah",
                objectMapper.writeValueAsString(featureMetadata))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
    val retrievedTagged =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g2))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);
    assertEquals(2, retrievedTagged.body().getColumns().get("blah").getTags().size());
    val version = retrievedTagged.getBody().get().getMetadata().getVersion();

    // Re-tag the column. Its a no-op update so we verify that the version bump got skipped
    client.exchange(
        HttpRequest.POST(
                "/entity/schema/column/org-42/dataset-55/blah",
                objectMapper.writeValueAsString(featureMetadata))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val retrievedTagged2 =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g2))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);
    val version2 = retrievedTagged2.getBody().get().getMetadata().getVersion();
    assertEquals(version, version2);
    assertNotNull(version2);
    assertTrue(retrieved.getBody().get().getMetadata().getVersion() < version);
    assertTrue(version2 > 1);
  }

  @Test
  public void testSchemaUpdates() throws JsonProcessingException {
    val client = httpClient.toBlocking();

    ColumnSchema nullColumn =
        ColumnSchema.builder()
            .classifier(Classifier.input)
            .discreteness(DiscretenessType.discrete)
            .dataType(DataType.NULL)
            .build();

    ColumnSchema nonNullColumn =
        ColumnSchema.builder()
            .classifier(Classifier.input)
            .discreteness(DiscretenessType.discrete)
            .dataType(DataType.BOOLEAN)
            .build();

    EntitySchema schema =
        EntitySchema.builder()
            .columns(
                ImmutableMap.of("col_start_null", nullColumn, "col_start_nonnull", nonNullColumn))
            .modelType(ModelType.regression)
            .build();

    // Write Schema
    client.exchange(
        HttpRequest.PUT(
                "/entity/schema/org-55/testSchemaUpdates/append",
                objectMapper.writeValueAsString(schema))
            .header("X-SYNC", "true")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // swap the column types, non-null <-> null
    schema.setColumns(
        ImmutableMap.of("col_start_null", nonNullColumn, "col_start_nonnull", nullColumn));

    // update Schema
    client.exchange(
        HttpRequest.PUT(
                "/entity/schema/org-55/testSchemaUpdates/append",
                objectMapper.writeValueAsString(schema))
            .header("X-SYNC", "true")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // retrieve current schema view.
    val g = new GetEntitySchemaRequest();
    g.setOrgId("org-55");
    g.setDatasetId("testSchemaUpdates");
    g.setIncludeHidden(false);

    // Read it back
    val retrieved =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);

    assertEquals(
        DataType.BOOLEAN, retrieved.body().getColumns().get("col_start_null").getDataType());
    assertEquals(
        DataType.NULL, retrieved.body().getColumns().get("col_start_nonnull").getDataType());

    // Remove one of them and overwrite
    schema.setColumns(ImmutableMap.of("col_start_nonnull", nonNullColumn));

    client.exchange(
        HttpRequest.PUT(
                "/entity/schema/org-55/testSchemaUpdates/overwrite",
                objectMapper.writeValueAsString(schema))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Read it back
    val retrieved2 =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);
    assertTrue(!retrieved2.body().getColumns().containsKey("col_start_null"));
    assertTrue(retrieved2.body().getColumns().containsKey("col_start_nonnull"));
  }

  @Test
  public void testMetricSchemaUpdates() throws JsonProcessingException {
    val client = httpClient.toBlocking();

    ColumnSchema nonNullColumn =
        ColumnSchema.builder()
            .classifier(Classifier.input)
            .discreteness(DiscretenessType.discrete)
            .dataType(DataType.BOOLEAN)
            .build();

    CustomMetricSchema testMetric =
        CustomMetricSchema.builder()
            .column("col_start_nonnull")
            .builtinMetric("mean")
            .label("mean_custom_metric")
            .build();

    EntitySchema schema =
        EntitySchema.builder()
            .columns(ImmutableMap.of("col_start_nonnull", nonNullColumn))
            .customMetrics(ImmutableMap.of("mean_custom_metric", testMetric))
            .modelType(ModelType.regression)
            .build();

    // Write Schema
    client.exchange(
        HttpRequest.PUT(
                "/entity/schema/org-0/testSchemaUpdates/overwrite",
                objectMapper.writeValueAsString(schema))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // change the metric
    testMetric.setBuiltinMetric("median");
    client.exchange(
        HttpRequest.POST(
                "/entity/schema/metric/org-0/testSchemaUpdates/mean_custom_metric",
                objectMapper.writeValueAsString(testMetric))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // retrieve current schema view.
    val g = new GetEntitySchemaRequest();
    g.setOrgId("org-0");
    g.setDatasetId("testSchemaUpdates");
    g.setIncludeHidden(false);

    // Read it back
    val retrieved =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);

    assertEquals(
        "median", retrieved.body().getCustomMetrics().get("mean_custom_metric").getBuiltinMetric());

    // Remove all metrics
    schema.setCustomMetrics(ImmutableMap.of());

    client.exchange(
        HttpRequest.PUT(
                "/entity/schema/org-0/testSchemaUpdates/overwrite",
                objectMapper.writeValueAsString(schema))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Read it back
    val retrieved2 =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);
    assertTrue(!retrieved2.body().getCustomMetrics().containsKey("mean_custom_metric"));
    assertTrue(retrieved2.body().getColumns().containsKey("col_start_nonnull"));

    // add 2 single metrics
    client.exchange(
        HttpRequest.POST(
                "/entity/schema/metric/org-0/testSchemaUpdates/custom_metric1",
                objectMapper.writeValueAsString(testMetric))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
    client.exchange(
        HttpRequest.POST(
                "/entity/schema/metric/org-0/testSchemaUpdates/custom_metric2",
                objectMapper.writeValueAsString(testMetric))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // then delete 1 of them
    client.exchange(
        HttpRequest.DELETE(
                "/entity/schema/metric/org-0/testSchemaUpdates/custom_metric1",
                objectMapper.writeValueAsString(testMetric))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Read them back
    val retrieved3 =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);

    assertEquals(1, retrieved3.body().getCustomMetrics().size());
  }

  @Test
  public void testEquality() {
    val old = ColumnSchema.builder().build();
    val updated = ColumnSchema.builder().build();
    assertTrue(ColumnSchema.majorUpdate(updated, old));
    updated.setClassifier(Classifier.input);
    assertFalse(ColumnSchema.majorUpdate(updated, old));
    old.setClassifier(Classifier.input);
    assertTrue(ColumnSchema.majorUpdate(updated, old));
    updated.setDiscreteness(DiscretenessType.discrete);
    assertFalse(ColumnSchema.majorUpdate(updated, old));
    old.setDiscreteness(DiscretenessType.discrete);
    assertTrue(ColumnSchema.majorUpdate(updated, old));
    updated.setDataType(DataType.STRING);
    assertFalse(ColumnSchema.majorUpdate(updated, old));
    old.setDataType(DataType.STRING);
    assertTrue(ColumnSchema.majorUpdate(updated, old));
    updated.setTags(Arrays.asList("A"));
    assertFalse(ColumnSchema.majorUpdate(updated, old));
    old.setTags(Arrays.asList("B", "C"));
    assertFalse(ColumnSchema.majorUpdate(updated, old));
    old.setTags(Arrays.asList("A", "C"));
    assertTrue(ColumnSchema.majorUpdate(updated, old));
  }
}
