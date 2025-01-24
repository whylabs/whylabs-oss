package ai.whylabs.dataservice.controllers;

import ai.whylabs.dataservice.requests.PurgeDeletedDatasetsRequest;
import ai.whylabs.dataservice.services.*;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Tag(name = "DatasetDeletion", description = "Endpoints to purge deleted datasets")
@Controller("/asyncDeletion")
@RequiredArgsConstructor
public class AsyncDeletionController {

  @Inject private AsyncDeletionService asyncDeletionService;

  @Post(uri = "/run", produces = MediaType.APPLICATION_JSON)
  public void run(@Body PurgeDeletedDatasetsRequest request) {
    asyncDeletionService.purgingDeletedDatasets(request.getDryRun(), request.getS3Path());
  }

  @Post(uri = "/runSingle/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  public void runSingle(@PathVariable String orgId, @PathVariable String datasetId) {
    asyncDeletionService.purgeDataset(orgId, datasetId);
  }
}
