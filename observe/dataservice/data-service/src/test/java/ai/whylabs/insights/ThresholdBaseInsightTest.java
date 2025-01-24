package ai.whylabs.insights;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertNull;

import java.util.Arrays;
import lombok.val;
import org.junit.jupiter.api.Test;

class ThresholdBaseInsightTest {
  @Test
  public void test_lowerthreshold() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .lowerThreshold(1.0) //
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND COUNTS_TOTAL <= 1.0 THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_lowerthreshold_inclusive() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .lowerThreshold(1.0)
            .isLowerThresholdInclusive(true)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND COUNTS_TOTAL < 1.0 THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_upperthreshold() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .upperThreshold(1.0)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND COUNTS_TOTAL >= 1.0 THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_upperthreshold_inclusive() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .upperThreshold(1.0)
            .isUpperThresholdInclusive(true)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND COUNTS_TOTAL > 1.0 THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_two_thresholds() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .lowerThreshold(0.0)
            .upperThreshold(1.0)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND (COUNTS_TOTAL <= 0.0 OR COUNTS_TOTAL >= 1.0) THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_two_thresholds_both_inclusive() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .lowerThreshold(0.0)
            .isLowerThresholdInclusive(true)
            .upperThreshold(1.0)
            .isUpperThresholdInclusive(true)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND (COUNTS_TOTAL < 0.0 OR COUNTS_TOTAL > 1.0) THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_two_thresholds_upper_inclusive() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .lowerThreshold(0.0)
            .upperThreshold(1.0)
            .isUpperThresholdInclusive(true)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND (COUNTS_TOTAL <= 0.0 OR COUNTS_TOTAL > 1.0) THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_two_thresholds_lower_inclusive() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .lowerThreshold(0.0)
            .isLowerThresholdInclusive(true)
            .upperThreshold(1.0)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND (COUNTS_TOTAL < 0.0 OR COUNTS_TOTAL >= 1.0) THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_ratio() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .denominatorColumn(InsightColumn.COUNTS_TOTAL) //
            .lowerThreshold(0.0)
            .isLowerThresholdInclusive(true)
            .upperThreshold(1.0)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN NOT CATEGORY_LLM AND 1=1 AND ("
                + "(COUNTS_TOTAL / COALESCE(COUNTS_TOTAL, 0)) < 0.0 OR (COUNTS_TOTAL / COALESCE(COUNTS_TOTAL, 0)) >= 1.0"
                + ") THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_llm_category_no_columns() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .denominatorColumn(InsightColumn.COUNTS_TOTAL) //
            .categoryColumn(CategoryColumn.CATEGORY_LLM) //
            .lowerThreshold(0.0)
            .isLowerThresholdInclusive(true)
            .upperThreshold(1.0)
            .build();

    // llm insight invoked without any columns returns null.
    assertNull(tmp.toSql());
  }

  @Test
  public void test_llm_category_with_columns() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .denominatorColumn(InsightColumn.COUNTS_TOTAL) //
            .categoryColumn(CategoryColumn.CATEGORY_LLM) //
            .columnList(Arrays.asList("column1"))
            .lowerThreshold(0.0)
            .isLowerThresholdInclusive(true)
            .upperThreshold(1.0)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN CATEGORY_LLM AND COLUMN_NAME IN ('column1') AND ((COUNTS_TOTAL / COALESCE(COUNTS_TOTAL, 0)) < 0.0 OR (COUNTS_TOTAL / COALESCE(COUNTS_TOTAL, 0)) >= 1.0) THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_llm_toxicity() {
    val tmp =
        ThresholdBaseInsight.builder()
            .name("test")
            .numeratorColumn(InsightColumn.COUNTS_TOTAL) //
            .denominatorColumn(InsightColumn.COUNTS_TOTAL) //
            .categoryColumn(CategoryColumn.CATEGORY_LLM) //
            .columnList(Arrays.asList("prompt.toxicity", "response.toxicity"))
            .lowerThreshold(0.0)
            .isLowerThresholdInclusive(true)
            .upperThreshold(1.0)
            .build();
    assertThat(
        tmp.toSql(),
        is(
            "(CASE WHEN CATEGORY_LLM AND COLUMN_NAME IN ('prompt.toxicity', 'response.toxicity') AND ((COUNTS_TOTAL / COALESCE(COUNTS_TOTAL, 0)) < 0.0 OR (COUNTS_TOTAL / COALESCE(COUNTS_TOTAL, 0)) >= 1.0) THEN 1 ELSE 0 END) AS insight_test"));
  }

  @Test
  public void test_data_leakage() {}
}
