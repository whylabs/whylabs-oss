package ai.whylabs.dataservice.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import java.io.Serializable;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;

@Entity
@Data
public class DiagnosticAnalyzerSegmentColumnRecord implements Serializable {
  @Schema(required = true)
  @Id
  @Column
  String column;

  @Schema(required = true)
  @Column
  Integer totalAnomalies;

  @Schema(required = true)
  @Column
  Integer batchCount;
}
