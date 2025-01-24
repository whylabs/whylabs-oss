package ai.whylabs.core.structures;

import ai.whylabs.core.enums.PostgresBulkIngestionMode;
import ai.whylabs.core.enums.TargetTable;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PostgresBulkIngestionTrigger {
  public TargetTable targetTable;
  public String path;
  public long requestedTs;
  public String runId;
  public PostgresBulkIngestionMode mode;
  public boolean async = false;

  /**
   * The events job and datalake writer jobs get kicked off with a currentTime parameter. That
   * timestamp is fed to the job and fed into this request which we can use to dedupe insert
   * requests for a table that are duplicates.
   *
   * <p>How can there be duplicates? Job fails midway and gets retried by job orchestration. Spark
   * task that publishes to SQS fails and gets retried by spark. Somebody re-runs the job manually.
   * We have to account for that stuff and prevent double ingestion into PG.
   */
  public Long jobRunCurrentTime;

  /**
   * Data is streaming in so when doing a replacement we need a line in the sand for data before
   * timestamp x is being replaced. With profiles its based on the upload timestamp. Other tables
   * use different timestamps.
   */
  public Long cutoverTimestamp;

  public List<String> columns;
  // Scope replacements to a single orgId
  public String orgId;
}
