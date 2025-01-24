package ai.whylabs.core.utils;

import ai.whylabs.druid.whylogs.streaming.S3ContentFetcher;
import java.util.List;
import lombok.val;

public class DemoDataCloner {

  public void getList(List<String> s3Paths, String orgId, String datasetId) {
    val s3 = new S3ContentFetcher();
  }
}
