package ai.whylabs.core.structures;

import java.io.Serializable;
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
public class BinaryProfileRow implements Serializable {
  private String path;
  private Timestamp modificationTime;
  private Long length;
  private byte[] content;
  private String pathNoExtension;
  private String profileId;
}
