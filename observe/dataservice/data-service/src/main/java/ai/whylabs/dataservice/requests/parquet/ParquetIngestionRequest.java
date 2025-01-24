package ai.whylabs.dataservice.requests.parquet;

import ai.whylabs.core.enums.TargetTable;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.Data;

@Data
public class ParquetIngestionRequest {
  public String path;
  public long requestedTs;
  public String runId;
  public boolean async = false;

  public Optional<UUID> dedupeKey = Optional.empty();

  public Long cutoverTimestamp;
  public List<String> columns;

  /** Optionally scope the ingestion to a specific orgId * */
  public Optional<String> orgId = Optional.empty();

  private boolean dryRun = false;
  private boolean s3Fuse = false;

  private TargetTable targetTable;
}
