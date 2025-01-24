package ai.whylabs.druid.whylogs.column;

import java.util.List;
import javax.annotation.Nullable;

public interface WhyLogsMetrics {
  @Nullable
  public Object getRaw(String dimension);

  public String getName();

  public String getOrgId();

  public String getDatasetId();

  public String getReferenceProfileId();

  public List<String> getTags();

  public long getTimestampFromEpoch();
}
