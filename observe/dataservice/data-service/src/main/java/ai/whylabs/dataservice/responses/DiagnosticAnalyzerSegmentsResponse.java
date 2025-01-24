package ai.whylabs.dataservice.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@Data
public class DiagnosticAnalyzerSegmentsResponse {
  @Schema(required = true)
  List<DiagnosticAnalyzerSegmentAnomalyRecord> noisySegments;

  @Schema(required = true)
  List<DiagnosticAnalyzerSegmentFailedRecord> failedSegments;
}
