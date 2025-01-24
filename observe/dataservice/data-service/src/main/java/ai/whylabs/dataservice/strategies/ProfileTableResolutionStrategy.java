package ai.whylabs.dataservice.strategies;

import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.services.DatasetService;
import ai.whylabs.dataservice.services.ProfileService;
import io.micronaut.data.annotation.Repository;
import jakarta.inject.Inject;
import java.util.List;
import javax.inject.Singleton;
import liquibase.util.StringUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
public class ProfileTableResolutionStrategy {

  @Inject private DatasetService datasetService;

  /**
   * Typically data lands in the staging table and every hour gets merged+promoted to the historical
   * table. In the case of D&B and other customers that onboard and initially have a broken-ish
   * integration there can be a flood of un-merged profiles uploaded to the staging table. If
   * there's enough of them it becomes too slow to query. Most queries will hit a union of both
   * historical+staging tables, but datasets with a recent flood of profiles will drop down to only
   * hitting the historical table cause truncated data is better than a timeout. This method handles
   * that automatic switching behavior.
   *
   * @param segment
   * @param segmentKey
   * @param dataGranularity
   * @param orgId
   * @param datasetId
   * @return
   */
  public String getTable(
      List<SegmentTag> segment,
      String segmentKey,
      DataGranularity dataGranularity,
      String orgId,
      String datasetId) {
    if (dataGranularity != null && dataGranularity.equals(DataGranularity.individual)) {
      return "whylabs." + ProfileService.TABLE_NAME_UNMERGED;
    }

    if (isSegmented(segment, segmentKey)) {
      return "whylabs." + ProfileService.PROFILES_SEGMENTED_VIEW;
    } else {
      return "whylabs." + ProfileService.PROFILES_OVERALL_VIEW;
    }
  }

  public static boolean isSegmented(List<SegmentTag> segment, String segmentKey) {
    if ((segment != null && segment.size() > 0) || !StringUtil.isEmpty(segmentKey)) {
      return true;
    }
    return false;
  }
}
