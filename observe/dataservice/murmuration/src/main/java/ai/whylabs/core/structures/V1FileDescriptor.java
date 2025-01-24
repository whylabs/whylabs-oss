package ai.whylabs.core.structures;

import ai.whylabs.core.enums.IngestionRollupGranularity;
import java.sql.Timestamp;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor(access = AccessLevel.PUBLIC)
@NoArgsConstructor(access = AccessLevel.PUBLIC)
public class V1FileDescriptor {
  private String path;
  private Timestamp modificationTime;
  private Long length;
  private String orgId;

  private Boolean enableGranularDataStorage = false;
  private IngestionRollupGranularity ingestionGranularity = IngestionRollupGranularity.hourly;
}
