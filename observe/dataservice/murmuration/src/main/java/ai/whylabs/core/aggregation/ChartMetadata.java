package ai.whylabs.core.aggregation;

import lombok.Builder;
import lombok.Value;

/**
 * A place to store metadata that is useful for rendering notification charts, but which is not
 * otherwise available in the AnalyzerConfig.
 */
@Builder
@Value
public class ChartMetadata {
  String columnName;
  String segmentText;
}
