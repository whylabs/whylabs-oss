package ai.whylabs.core.structures;

import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.IngestionOrigin;
import ai.whylabs.core.enums.ProfileColumnType;
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
public class DatalakeRowV2 {
  public static final String DATASET_TIMESTAMP_CAMEL = "dataset_timestamp";

  private long datasetTimestamp;
  private String orgId;
  private String datasetId;
  private String columnName;
  private TargetLevel datasetType;

  private List<DatalakeRowV2Metric> metrics;

  private Boolean mergeableSegment;

  /**
   * Segment tags are derived from a groupBy. EG I grouped by car so now I have tags like car=honda,
   * car=ford
   */
  private String segmentText;

  /**
   * Tags operate at the dataset level operational (V1 only). EG
   *
   * <p>env=dev
   */
  private String datasetTags;

  // TODO: Additional stuff not in postgres yet, should we keep all of this?
  private IngestionOrigin ingestionOrigin;

  /** When was this record written to the deltalake */
  private Long datalakeWriteTs;

  // TODO: Keep?
  private Boolean mergedRecordWritten;
  private ProfileColumnType type;

  private String referenceProfileId;

  /** S3 timestamp when the file was uploaded or when aggrgeated the most recent */
  private Long lastUploadTs;

  private String originalFilename;

  /**
   * Customer provided trace id used to link back to their system. EG a primary key in a DB, a file
   * name, etc. Note when merging profiles its random which one gets retained.
   */
  private String traceId;

  /** Can't merge these rows in deltalake */
  private boolean enableGranularDataStorage;

  private String yyyymmdd;
}
