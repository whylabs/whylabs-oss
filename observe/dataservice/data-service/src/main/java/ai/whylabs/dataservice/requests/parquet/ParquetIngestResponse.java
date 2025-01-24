package ai.whylabs.dataservice.requests.parquet;

import lombok.Value;

@Value
public class ParquetIngestResponse {
  String tableName;
  String runId;
  String script;
  String beforeInitialLoad;
  String afterInitialLoad;
}
