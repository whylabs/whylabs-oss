package ai.whylabs.core.structures;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
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
public class AnalysisOutputBuffer {
  List<AnalyzerResult> results;
}
