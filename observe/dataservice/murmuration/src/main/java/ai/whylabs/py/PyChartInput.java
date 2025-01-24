package ai.whylabs.py;

import ai.whylabs.core.calculationsV3.results.CalculationResult;
import java.util.List;
import lombok.Builder;
import lombok.ToString;
import lombok.Value;
import org.apache.commons.lang3.tuple.Pair;

/**
 * Structure for passing all parameters to chart rendering fnuction. Params are collected into a
 * single object to facilitate serialization from Java to Python.
 */
@Builder()
@Value
@ToString
public class PyChartInput {
  List<Pair<Long, CalculationResult>> data;
  String path; // S3 output path
  String columnName;
  String segmentText;
  String metric;
}
