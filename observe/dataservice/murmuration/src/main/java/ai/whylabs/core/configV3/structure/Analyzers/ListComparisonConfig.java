package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.ListCompareCalculationDouble;
import ai.whylabs.core.calculationsV3.ListCompareCalculationLong;
import ai.whylabs.core.calculationsV3.ListCompareCalculationString;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Slf4j
public class ListComparisonConfig implements AnalyzerConfig {
  public static final String type = "list_comparison";

  private Integer version;
  private List<ExpectedValue> expected;

  // oneOf [TrailingWindowBaseline, ReferenceProfileId, TimeRangeBaseline, SingleBatchBaseline]
  @JsonInclude(Include.NON_NULL)
  private Baseline baseline;

  private String metric;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private ListComparisonOperator operator = ListComparisonOperator.in;

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {

    val type = AnalysisMetric.getExtractorOutputType(AnalysisMetric.fromName(analyzer.getMetric()));
    if (type != null) {
      if (type.equals(Long.class)) {
        return new ListCompareCalculationLong(monitorConfigV3, analyzer, overwriteEvents, this);
      } else if (type.equals(Double.class)) {
        return new ListCompareCalculationDouble(monitorConfigV3, analyzer, overwriteEvents, this);
      } else if (type.equals(String.class)) {
        return new ListCompareCalculationString(monitorConfigV3, analyzer, overwriteEvents, this);
      }
    }
    log.error(
        "ListComparisonConfig unimplemented analyzer metric \"%s\" in %s/%s",
        analyzer.getMetric(), monitorConfigV3.getOrgId(), monitorConfigV3.getDatasetId());

    return null;
  }

  @Override
  public String getAnalyzerType() {
    return type;
  }
}
