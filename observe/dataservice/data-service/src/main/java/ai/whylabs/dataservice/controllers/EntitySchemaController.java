package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.configV3.structure.ColumnSchema;
import ai.whylabs.core.configV3.structure.CustomMetricSchema;
import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.dataservice.entitySchema.DefaultSchemaMetadata;
import ai.whylabs.dataservice.requests.GetEntitySchemaRequest;
import ai.whylabs.dataservice.requests.ToggleHidenColumnRequest;
import ai.whylabs.dataservice.services.EntitySchemaService;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Tag(name = "EntitySchema", description = "Endpoints to configure metadata on dataset schema")
@Controller("/entity")
@RequiredArgsConstructor
public class EntitySchemaController {

  @Inject private EntitySchemaService entitySchemaService;

  @Put(
      uri = "/schema/{orgId}/{datasetId}/overwrite",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void overwriteSchema(
      @PathVariable String orgId, @PathVariable String datasetId, @Body EntitySchema schema) {
    entitySchemaService.save(orgId, datasetId, schema, true);
  }

  @Put(
      uri = "/schema/{orgId}/{datasetId}/append",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void appendEntitySchema(
      @PathVariable String orgId,
      @PathVariable String datasetId,
      @Body EntitySchema schema,
      @Header(value = "X-SYNC", defaultValue = "") @Parameter(hidden = true) String sync) {
    if (Boolean.parseBoolean(sync)) {
      entitySchemaService.save(orgId, datasetId, schema, false);
    } else {
      entitySchemaService.fastSave(orgId, datasetId, schema);
    }
  }

  @Put(
      uri = "/schema/column/hide",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void hideColumn(@Body ToggleHidenColumnRequest req) {
    entitySchemaService.toggleHidden(req.getOrgId(), req.getDatasetId(), true, req.getColumnName());
  }

  @Put(
      uri = "/schema/column/unhide",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void unHideColumn(@Body ToggleHidenColumnRequest req) {
    entitySchemaService.toggleHidden(
        req.getOrgId(), req.getDatasetId(), false, req.getColumnName());
  }

  @Post(
      uri = "/schema/retrieve",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public EntitySchema getEntitySchema(@Body GetEntitySchemaRequest request) {
    if (request.isEventuallyConsistent()) {
      return entitySchemaService.getEventuallyConsistent(request);
    }
    return entitySchemaService.getConsistent(request);
  }

  @Post(
      uri = "/schema/retrieveCached",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public EntitySchema getEntitySchemaCached(@Body GetEntitySchemaRequest request) {
    return entitySchemaService.getWithCaching(request);
  }

  @Post(
      uri = "/schema/column/{orgId}/{datasetId}/{columnName}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void writeColumnSchema(
      @PathVariable String orgId,
      @PathVariable String datasetId,
      @PathVariable String columnName,
      @Body ColumnSchema schema) {
    Map<String, ColumnSchema> colMap = new HashMap<>(1);
    colMap.put(columnName, schema);
    entitySchemaService.save(
        orgId, datasetId, EntitySchema.builder().columns(colMap).build(), false);
  }

  @Post(
      uri = "/schema/metric/{orgId}/{datasetId}/{metricName}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void writeMetricSchema(
      @PathVariable String orgId,
      @PathVariable String datasetId,
      @PathVariable String metricName,
      @Body CustomMetricSchema schema) {
    Map<String, CustomMetricSchema> metricMap = new HashMap<>(1);
    metricMap.put(metricName, schema);
    entitySchemaService.save(
        orgId, datasetId, EntitySchema.builder().customMetrics(metricMap).build(), false);
  }

  @Delete(
      uri = "/schema/column/{orgId}/{datasetId}/{columnName}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void deleteColumnSchema(
      @PathVariable String orgId, @PathVariable String datasetId, @PathVariable String columnName) {
    entitySchemaService.deleteColumn(orgId, datasetId, columnName);
  }

  @Delete(
      uri = "/schema/metric/{orgId}/{datasetId}/{metricName}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void deleteCustomMetricSchema(
      @PathVariable String orgId, @PathVariable String datasetId, @PathVariable String metricName) {
    entitySchemaService.deleteCustomMetric(orgId, datasetId, metricName);
  }

  @Get(uri = "/schema/metadata/default", produces = MediaType.APPLICATION_JSON)
  public DefaultSchemaMetadata getDefaultSchemaMetadata() {
    return entitySchemaService.getDefaultSchemaMetadata();
  }

  @Put(
      uri = "/schema/metadata/default/override",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void writeDefaultSchemaMetadata(@Body DefaultSchemaMetadata metadata) {
    entitySchemaService.writeDefaultSchemaMetadata(metadata);
  }

  @Delete(
      uri = "/schema/metadata/default/override",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void resetDefaultSchemaMetadata() {
    entitySchemaService.resetDefaultSchemaMetadata();
  }

  @Get(
      uri = "/schema/column/{orgId}/{datasetId}/{columnName}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public ColumnSchema getColumnSchema(
      @PathVariable String orgId, @PathVariable String datasetId, @PathVariable String columnName) {
    return entitySchemaService.getColumn(orgId, datasetId, columnName);
  }

  @Get(
      uri = "/schema/metric/{orgId}/{datasetId}/{metricName}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public CustomMetricSchema getCustomMetricSchema(
      @PathVariable String orgId, @PathVariable String datasetId, @PathVariable String metricName) {
    return entitySchemaService.getCustomMetric(orgId, datasetId, metricName);
  }

  @Get(
      uri = "/schema/metrics/{orgId}/{datasetId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public Map<String, CustomMetricSchema> getCustomMetricsSchema(
      @PathVariable String orgId, @PathVariable String datasetId) {
    return entitySchemaService.getCustomMetrics(orgId, datasetId);
  }
}
