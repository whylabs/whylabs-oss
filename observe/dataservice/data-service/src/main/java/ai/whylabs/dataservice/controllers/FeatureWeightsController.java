package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.configV3.structure.WeightConfig;
import ai.whylabs.dataservice.responses.GetFeatureWeightsResponse;
import ai.whylabs.dataservice.services.FeatureWeightsService;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Tag(
    name = "FeatureWeights",
    description = "Endpoints to configure feature(column) and segment weights")
@Controller("/feature-weights")
@RequiredArgsConstructor
public class FeatureWeightsController {
  @Inject private FeatureWeightsService featureWeightsService;

  @Put(
      uri = "/{orgId}/{datasetId}/store",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "saveFeatureWeights")
  public void save(
      @PathVariable String orgId,
      @PathVariable String datasetId,
      @Body WeightConfig featureWeights) {
    featureWeightsService.save(orgId, datasetId, featureWeights);
  }

  @Get(uri = "/{orgId}/{datasetId}/load", produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "loadFeatureWeights")
  public GetFeatureWeightsResponse load(
      @PathVariable String orgId, @PathVariable String datasetId) {
    return featureWeightsService.load(orgId, datasetId);
  }

  @Delete(uri = "/{orgId}/{datasetId}/delete", produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "deleteFeatureWeights")
  public void delete(@PathVariable String orgId, @PathVariable String datasetId) {
    featureWeightsService.delete(orgId, datasetId);
  }
}

// TODO add ability to merge existing segment weights to new ones
