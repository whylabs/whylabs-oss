package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.enums.IngestionRollupGranularity;
import ai.whylabs.core.structures.Org;
import ai.whylabs.dataservice.enums.ResourceTagColor;
import ai.whylabs.dataservice.requests.ResourceTag;
import ai.whylabs.dataservice.requests.ResourceTagConfigEntry;
import ai.whylabs.dataservice.requests.ResourceTagConfiguration;
import ai.whylabs.dataservice.responses.ValidateResourceTagConfigurationResponse;
import ai.whylabs.dataservice.services.OrganizationService;
import com.google.common.base.Preconditions;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Inject;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.introspector.Property;
import org.yaml.snakeyaml.nodes.NodeTuple;
import org.yaml.snakeyaml.representer.Representer;

@Slf4j
@Tag(name = "Organization", description = "Endpoints to configure organizations")
@Controller("/org")
public class OrgController {

  @Inject private final OrganizationService organizationService;

  private final Yaml yaml;

  public OrgController(OrganizationService organizationService) {
    this.organizationService = organizationService;

    DumperOptions options = new DumperOptions();
    options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
    options.setPrettyFlow(true);
    options.setExplicitStart(false);
    Representer representer =
        new Representer(options) {
          @Override
          protected NodeTuple representJavaBeanProperty(
              Object javaBean,
              Property property,
              Object propertyValue,
              org.yaml.snakeyaml.nodes.Tag customTag) {
            if (propertyValue == null) {
              return null;
            }
            return super.representJavaBeanProperty(javaBean, property, propertyValue, customTag);
          }
        };
    representer.addClassTag(ResourceTagConfiguration.class, org.yaml.snakeyaml.nodes.Tag.MAP);
    yaml = new Yaml(representer, options);
  }

  @Post(uri = "/save", consumes = MediaType.APPLICATION_JSON, produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "saveOrganization")
  public void save(@Body Org org) {
    organizationService.persist(org);
  }

  @Get(uri = "/get/{orgId}", produces = MediaType.APPLICATION_JSON)
  public Org getByOrgId(@PathVariable String orgId) {
    Optional<Org> o = organizationService.getByOrgId(orgId);
    if (o.isPresent()) {
      return o.get();
    }
    return null;
  }

  /**
   * Also store unmerged profile data in the unmerged table. This is in addition to the standard
   * flow
   *
   * @param orgId
   * @return
   */
  @Get(uri = "/setting/granularDataStorageEnabled/{orgId}", produces = MediaType.APPLICATION_JSON)
  public boolean checkGranularDataStorageEnabledCached(@PathVariable String orgId) {
    return organizationService.granularDataStorageEnabledCached(orgId);
  }

  /**
   * Get the ingestion granularity for the standard flow
   *
   * @param orgId
   * @return
   */
  @Get(uri = "/setting/ingestionRollupGranularity/{orgId}", produces = MediaType.APPLICATION_JSON)
  public IngestionRollupGranularity getIngestionRollupGranularityCached(
      @PathVariable String orgId) {
    return organizationService.getIngestionRollupGranularityCached(orgId);
  }

  /** This endpoint scans the org table (small) and dumps the config */
  @Post(uri = "/dumpToS3", produces = MediaType.APPLICATION_JSON)
  public void dumpOrgTableToS3() {
    organizationService.dumpOrgTableToS3();
  }

  @Post(uri = "/applyDataRetention/{orgId}/{days}/{async}", produces = MediaType.APPLICATION_JSON)
  public void applyDataRetention(@PathVariable String orgId, Integer days, boolean async) {
    Preconditions.checkArgument(
        days >= 180, "Cannot apply data retention shorter than half a year");
    if (async) {
      organizationService.applyDataRetentionAsync(orgId, days);
    } else {
      organizationService.applyDataRetention(orgId, days);
    }
  }

  @Post(uri = "/purgeCache", produces = MediaType.APPLICATION_JSON)
  public void purgeCache() {
    organizationService.purgeCache();
  }

  @Post(
      uri = "/resourceTags/{orgId}/upload",
      consumes = MediaType.APPLICATION_YAML,
      produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "UploadOrgResourceTagConfiguration")
  public void uploadResourceTagConfiguration(
      @PathVariable String orgId, @Body String resourceTagConfiguration) {
    ResourceTagConfiguration existingConfig =
        organizationService.getOrganizationResourceTags(orgId);
    ResourceTagConfiguration newConfig =
        yaml.loadAs(resourceTagConfiguration, ResourceTagConfiguration.class);
    normalizeLabels(existingConfig);
    normalizeLabels(newConfig);

    val existingKeys = existingConfig.getTags().keySet();
    val newValidKeys =
        newConfig.getTags().entrySet().stream()
            .filter(
                it ->
                    it.getValue().getValues().stream()
                        .anyMatch(
                            el -> el != null && !el.equals(ResourceTagConfiguration.LABEL_TAG_KEY)))
            .map(Map.Entry::getKey)
            .collect(Collectors.toSet());
    val removedKeys = new HashSet<String>();
    existingKeys.forEach(
        key -> {
          if (!newValidKeys.contains(key)) {
            removedKeys.add(key);
          }
        });
    organizationService.removeOrgResourceTagConfigurationKeys(orgId, removedKeys);
    organizationService.upsertOrgResourceTagConfiguration(orgId, newConfig);

    List<ResourceTag> tagsInUse = organizationService.getActiveOrganizationResourceTags(orgId);
    val tagsToDelete = new ArrayList<ResourceTag>();
    // Remove active tags in use that are not in the new configuration
    tagsInUse.forEach(
        tag -> {
          if (!newConfig.getTags().containsKey(tag.getKey())
              || !newConfig.getTags().get(tag.getKey()).getValues().contains(tag.getValue())) {
            tagsToDelete.add(tag);
          }
        });
    organizationService.deleteActiveOrganizationResourceTags(orgId, tagsToDelete);
  }

  private void normalizeLabels(ResourceTagConfiguration config) {
    // updates the config to include the labels as a "none" tag
    if (config.getLabels() != null) {
      if (config.getTags() == null) {
        config.setTags(new HashMap<>());
      }
      val noneEntry = config.getTags().get(ResourceTagConfiguration.LABEL_TAG_KEY);
      val existingLabels = noneEntry != null ? noneEntry.getValues() : new ArrayList<String>();
      val mergedValues = new ArrayList<>(existingLabels);
      mergedValues.addAll(config.getLabels());
      config
          .getTags()
          .put(
              ResourceTagConfiguration.LABEL_TAG_KEY,
              ResourceTagConfigEntry.builder().values(mergedValues).build());
    }
  }

  @Post(
      uri = "/resourceTags/{orgId}/validate",
      consumes = MediaType.APPLICATION_YAML,
      produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "ValidateOrgResourceTagConfiguration")
  public ValidateResourceTagConfigurationResponse validateResourceTagConfiguration(
      @PathVariable String orgId, @Body String resourceTagConfiguration) {
    try {
      ResourceTagConfiguration candidateConfig =
          yaml.loadAs(resourceTagConfiguration, ResourceTagConfiguration.class);
      ResourceTagConfiguration existingConfig =
          organizationService.getOrganizationResourceTags(orgId);
      normalizeLabels(candidateConfig);
      normalizeLabels(existingConfig);

      List<ResourceTag> droppedTags = new ArrayList<>();
      List<ResourceTag> droppedTagsInUse = new ArrayList<>();
      existingConfig
          .getTags()
          .forEach(
              (key, value) -> {
                if (!candidateConfig.getTags().containsKey(key)) {
                  value
                      .getValues()
                      .forEach(
                          v ->
                              droppedTags.add(
                                  ResourceTag.builder().orgId(orgId).key(key).value(v).build()));
                } else {
                  value
                      .getValues()
                      .forEach(
                          v -> {
                            if (!candidateConfig.getTags().get(key).getValues().contains(v)) {
                              droppedTags.add(
                                  ResourceTag.builder().orgId(orgId).key(key).value(v).build());
                            }
                          });
                }
              });
      List<ResourceTag> tagsInUse = organizationService.getActiveOrganizationResourceTags(orgId);
      for (ResourceTag tag : droppedTags) {
        if (tagsInUse.contains(tag)) {
          droppedTagsInUse.add(tag);
        }
      }

      return ValidateResourceTagConfigurationResponse.builder()
          .valid(true)
          .droppedTagsInUse(droppedTagsInUse)
          .build();
    } catch (Exception e) {
      return ValidateResourceTagConfigurationResponse.builder().valid(false).build();
    }
  }

  @Get(uri = "/resourceTags/{orgId}/config", produces = MediaType.APPLICATION_YAML)
  @Operation(operationId = "GetOrgResourceTagConfiguration")
  public String getResourceTagConfiguration(@PathVariable String orgId) {
    ResourceTagConfiguration config = organizationService.getOrganizationResourceTags(orgId);
    return yaml.dump(config);
  }

  @Get(uri = "/resourceTags/{orgId}/list", produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "ListOrganizationResourceTags")
  public List<ResourceTag> listOrganizationResourceTags(@PathVariable String orgId) {
    ResourceTagConfiguration config = organizationService.getOrganizationResourceTags(orgId);
    normalizeLabels(config);
    val tagList = new ArrayList<ResourceTag>();
    val tagBuilder = ResourceTag.builder().orgId(orgId);
    config
        .getTags()
        .forEach(
            (k, v) ->
                v.getValues()
                    .forEach(
                        value -> {
                          var tagColor = ResourceTagColor.getResourceTagColor(k);
                          if (k.equals(ResourceTagConfiguration.LABEL_TAG_KEY)) {
                            tagColor = ResourceTagColor.getResourceTagColor(value);
                          }
                          tagList.add(
                              tagBuilder
                                  .key(k)
                                  .value(value)
                                  .color(
                                      Objects.requireNonNullElse(v.getColor(), tagColor.getColor()))
                                  .bgColor(
                                      Objects.requireNonNullElse(
                                          v.getBgColor(), tagColor.getBackgroundColor()))
                                  .build());
                        }));
    return tagList;
  }
}
