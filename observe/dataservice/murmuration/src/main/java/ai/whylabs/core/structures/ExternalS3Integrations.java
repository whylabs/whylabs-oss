package ai.whylabs.core.structures;

import java.io.Serializable;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class ExternalS3Integrations implements Serializable {
  private List<Integration> integrations;

  @ToString
  @Data
  @AllArgsConstructor
  @NoArgsConstructor
  public static class Integration {
    private String name;
    private String orgId;
    private String sourceRoleArn;
    private String sourcePath;
    private String externalId;
    // Seemingly optional
    private String parquetPath;
  }
}
