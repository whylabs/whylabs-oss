package ai.whylabs.dataservice.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@Data
public class DiagnosticAnalyzerSegmentColumnsResponse {
  @Schema(required = true)
  List<DiagnosticAnalyzerSegmentColumnRecord> noisyColumns;
}
