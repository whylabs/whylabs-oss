package ai.whylabs.insights;

import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.*;
import org.apache.commons.text.StringSubstitutor;

@RequiredArgsConstructor
@Builder
@Value
public class ThresholdBaseInsight {
  private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");
  public static final String INSIGHT_PREFIX = "insight_";

  String name;
  String description;
  InsightColumn numeratorColumn;
  InsightColumn denominatorColumn;
  CategoryColumn categoryColumn;
  List<String> columnList;
  Double upperThreshold;
  Double lowerThreshold;
  Boolean isUpperThresholdInclusive;
  Boolean isLowerThresholdInclusive;
  Function<InsightMetricResult, String> messageFormatter;

  public void validate() {
    Preconditions.checkArgument(NAME_PATTERN.matcher(name).matches(), "Name must be alphanumeric");
    Preconditions.checkNotNull(numeratorColumn, "Numerator column (main metric) must be specified");
    Preconditions.checkArgument(
        upperThreshold != null || lowerThreshold != null,
        "At least one threshold must be specified");
    if (upperThreshold != null && lowerThreshold != null) {
      Preconditions.checkArgument(
          upperThreshold >= lowerThreshold,
          "Upper threshold must be greater than or equal to lower threshold");
    }
  }

  public String toSql() {
    validate();

    String valueClause = numeratorColumn.name();
    if (denominatorColumn != null) {
      valueClause = "(" + numeratorColumn + " / COALESCE(" + denominatorColumn + ", 0))";
    }

    // create SQL clause to filter column names for a single insight.
    String columnNameFilter;
    if (columnList == null || columnList.size() == 0) {
      if (categoryColumn != null)
        return null; // defined category, but no columns specified, skip this insight.
      // otherwise match all columns
      columnNameFilter = "1=1";
    } else {
      String columns =
          columnList.stream().map(s -> "'" + s + "'").collect(Collectors.joining(", "));
      columnNameFilter = String.format("COLUMN_NAME IN (%s)", columns);
    }
    String upperOp = Boolean.TRUE.equals(isUpperThresholdInclusive) ? ">" : ">=";
    String lowerOp = Boolean.TRUE.equals(isLowerThresholdInclusive) ? "<" : "<=";
    Map<String, String> values =
        ImmutableMap.of(
            "valueClause",
            valueClause,
            "upperOp",
            upperOp,
            "upperThreshold",
            Optional.ofNullable(upperThreshold).map(Object::toString).orElse("NULL"),
            "lowerOp",
            lowerOp,
            "lowerThreshold",
            Optional.ofNullable(lowerThreshold).map(Object::toString).orElse("NULL"),
            "filterClause",
            columnNameFilter,
            "categoryClause",
            // if categoryColumn is null, filter out non-LLM insights for LLM category
            Optional.ofNullable(categoryColumn).map(Enum::name).orElse("NOT CATEGORY_LLM"),
            "name",
            INSIGHT_PREFIX + name);
    if (upperThreshold != null && lowerThreshold != null) {
      return StringSubstitutor.replace(
          "(CASE WHEN ${categoryClause} AND ${filterClause} AND"
              + " (${valueClause} ${lowerOp} ${lowerThreshold} "
              + "OR ${valueClause} ${upperOp} ${upperThreshold}) THEN 1 ELSE 0 END) AS ${name}",
          values);
    } else if (upperThreshold != null) {
      return StringSubstitutor.replace(
          "(CASE WHEN ${categoryClause} AND ${filterClause} AND ${valueClause} ${upperOp} ${upperThreshold} "
              + "THEN 1 ELSE 0 END) AS ${name}",
          values);
    } else {
      return StringSubstitutor.replace(
          "(CASE WHEN ${categoryClause} AND ${filterClause} AND ${valueClause} ${lowerOp} ${lowerThreshold} "
              + "THEN 1 ELSE 0 END) AS ${name}",
          values);
    }
  }
}
