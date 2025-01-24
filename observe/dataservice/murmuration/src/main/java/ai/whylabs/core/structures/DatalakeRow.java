package ai.whylabs.core.structures;

import ai.whylabs.core.enums.IngestionOrigin;
import ai.whylabs.core.enums.ProfileColumnType;
import java.io.Serializable;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class DatalakeRow implements Serializable {

  private String orgId;
  private String datasetId;
  private String partition;
  private Long ts;
  private String originalFilename;
  private Long length;
  private byte[] content;
  private Integer numColumns;
  private List<String> tags;
  private IngestionOrigin ingestionOrigin;

  /** When was this record written to the deltalake */
  private Long datalakeWriteTs;

  private Boolean mergedRecordWritten;
  private ProfileColumnType type;

  /** Reference profile id * */
  private String profileId;

  /** S3 timestamp when the file was uploaded or when aggrgeated the most recent */
  private Long lastUploadTs;

  /** User provided traceId * */
  private String traceId;
}
