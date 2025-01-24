package ai.whylabs.core.structures;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.io.Serializable;
import java.util.List;
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
public class BackfillAnalyzerRequest implements Serializable {
  private String orgId;
  private String datasetId;
  private Boolean overwrite;
  private String requestFilename;

  @JsonAlias({"analyzerIds"}) // middelware uses this field name
  private List<String> analyzers;

  private Long start;
  private Long end;
}
