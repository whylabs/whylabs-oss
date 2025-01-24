package ai.whylabs.dataservice.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import java.io.Serializable;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;

@Entity
@Data
public class DiagnosticAnalyzerSegmentAnomalyRecord implements Serializable {
  @Schema(required = true)
  @Id
  @Column
  String segment;

  @Schema(required = true)
  @Column
  Integer totalAnomalies;

  @Schema(required = true)
  @Column
  Integer batchCount;
}
