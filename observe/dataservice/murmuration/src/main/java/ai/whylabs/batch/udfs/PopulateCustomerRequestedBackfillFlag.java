package ai.whylabs.batch.udfs;

import ai.whylabs.core.structures.BackfillAnalyzerRequest;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.val;
import org.apache.spark.sql.api.java.UDF2;

@AllArgsConstructor
@NoArgsConstructor
public class PopulateCustomerRequestedBackfillFlag implements UDF2<String, String, Boolean> {
  public static final String name = "populateCustomerRequestedBackfillFlag";

  private List<BackfillAnalyzerRequest> backfillRequests;

  @Override
  public Boolean call(String orgId, String datasetId) {
    if (backfillRequests == null || backfillRequests.size() == 0) {
      return false;
    }
    for (val b : backfillRequests) {
      if (b.getOrgId().equals(orgId) && b.getDatasetId().equals(datasetId)) {
        return true;
      }
    }
    return false;
  }
}
