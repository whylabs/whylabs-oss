package ai.whylabs.dataservice.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import java.io.Serializable;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;

@Entity
@Data
public class DiagnosticAnalyzerFailedRecord implements Serializable {
  @Schema(required = true)
  @Id
  @Column
  String analyzerId;

  @Schema(required = true)
  @Column
  String metric;

  @Schema(required = true)
  @Column
  String analyzerType;

  @Schema(required = true)
  @Column
  Integer columnCount;

  @Schema(required = true)
  @Column
  Integer segmentCount;

  @Schema(required = true)
  @Column
  Integer failedCount;

  @Schema(required = true)
  @Column
  Integer maxFailedPerColumn;

  @Schema(required = true)
  @Column
  Integer minFailedPerColumn;

  @Schema(required = true)
  @Column
  Integer avgFailedPerColumn;
}
