package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.structures.Org;
import ai.whylabs.dataservice.services.OrganizationService;
import ai.whylabs.dataservice.services.ProfileService;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Post;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Tag(name = "Bootstrap", description = "Automatically load in data for unit tests")
@Controller("/bootstrap")
@RequiredArgsConstructor
public class BootstrapController {

  @Inject private final ProfileService profileService;
  @Inject private final OrganizationService organizationService;

  @Post(uri = "/boostrapDatabaseForUnitTests", produces = MediaType.APPLICATION_JSON)
  public void boostrapDatabaseForUnitTests() {
    Org o = new Org();
    o.setOrgId("org-0");
    o.setEnableGranularDataStorage(true);

    organizationService.persist(o);
    profileService.bootstrapDatabaseForUnitTests();
  }
}
