package ai.whylabs.core.structures;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.FieldNameConstants;

@Data
@ToString
@AllArgsConstructor
@NoArgsConstructor
@FieldNameConstants
@Builder
public class DataDeletionRequest {
  @JsonPropertyDescription("Required, orgId")
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  private String datasetId;

  @JsonPropertyDescription("Optional analyzer id filter")
  private String analyzerId;

  @JsonPropertyDescription("Enable deleting profiles in this request")
  private Boolean deleteProfiles;

  @JsonPropertyDescription("Optional, scope deleting profiles more recently than ts")
  private Long profileStart;

  @JsonPropertyDescription("Optional, scope deleting profiles older than ts")
  private Long profileEnd;

  @JsonPropertyDescription("Optional, scope deleting profiles uploaded to whylabs prior to ts")
  private Long beforeUploadTs;

  @JsonPropertyDescription("Enable deleting analyzer results in this request")
  private Boolean deleteAnalyzerResults;

  @JsonPropertyDescription("Optional, scope deleting analyzer results more recently than ts")
  private Long analyzerResultsStart;

  @JsonPropertyDescription("Optional, scope deleting analyzer results older than ts")
  private Long analyzerResultsEnd;

  // Filled in via s3 metadata
  @JsonIgnore private String requestFilename;

  @JsonPropertyDescription("Optional, scope deleting down to a single column")
  private String columnName;
}
