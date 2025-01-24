package ai.whylabs.insights;

import static ai.whylabs.insights.InsightSqlQueryType.OVERALL;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.core.configV3.structure.EntitySchema;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

class InsightSqlQueryTest {

  static ObjectMapper mapper =
      new ObjectMapper().configure(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS, true);

  /**
   * Models without any entitySchema info (null) still get non-LLM insights applied to all columns.
   */
  @Test
  @SneakyThrows
  public void test_noEntitySchema() {
    val insights = InsightSqlQuery.standard(null);
    val sql = insights.toSql(OVERALL, true);
    // we have no LLM feature names
    assertThat(sql, containsString("(false) AS CATEGORY_LLM,"));
    // expect only two insights, both non-LLM
    assertThat(
        sql, containsString("WHERE (insight_data_null_values + insight_data_imbalance) > 0)"));
  }

  /** entitySchema without any LLM tags get non-LLM insights applied to all columns. */
  @Test
  @SneakyThrows
  public void test_without_LLMTags() {
    String json =
        "{"
            + "    \"columns\": {"
            + "      \"annual_inc\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"input\","
            + "        \"dataType\": \"fractional\""
            + "      },"
            + "      \"prediction\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"output\","
            + "        \"dataType\": \"integral\""
            + "      }"
            + "    }"
            + "  }";
    val schema = mapper.readValue(json, EntitySchema.class);
    val insights = InsightSqlQuery.standard(schema);
    val sql = insights.toSql(OVERALL, true);
    // we have no LLM feature names
    assertThat(sql, containsString("(false) AS CATEGORY_LLM,"));
    // expect only two insights, both non-LLM
    assertThat(
        sql, containsString("WHERE (insight_data_null_values + insight_data_imbalance) > 0)"));
  }

  /**
   * entitySchema with LLM tags get non-LLM insights plus tag-specific LLM insights. It is the
   * entity tags that determine insights, not the name of the column.
   */
  @Test
  @SneakyThrows
  public void test_with_LLMTags() {
    // one of these has an _insight tag, the other does not.
    String json =
        "{"
            + "    \"columns\": {"
            + "      \"my_toxicity_score\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"input\","
            + "        \"dataType\": \"fractional\","
            + "        \"tags\": [ \"toxicity_insight\" ] "
            + "      },"
            + "      \"prompt.data_leakage\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"output\","
            + "        \"dataType\": \"integral\","
            + "        \"tags\": [ \"random_tag\" ] "
            + "      }"
            + "    }"
            + "  }";
    val schema = mapper.readValue(json, EntitySchema.class);
    val insights = InsightSqlQuery.standard(schema);
    val sql = insights.toSql(OVERALL, true);
    // expect a category filter now
    assertThat(sql, containsString("(COLUMN_NAME IN ('my_toxicity_score')) AS CATEGORY_LLM"));
    // expect only three insights
    assertThat(
        sql,
        containsString(
            "WHERE (insight_data_null_values + insight_data_imbalance + insight_llm_toxicity) > 0)"));
  }

  /** produce all available LLM insights */
  @Test
  @SneakyThrows
  public void test_with_allLLMTags() {
    // one of these has an _insight tag, the other does not.
    String json =
        "{"
            + "    \"columns\": {"
            + "      \"my_negative_sentiment\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"input\","
            + "        \"dataType\": \"fractional\","
            + "        \"tags\": [ \"negative_sentiment_insight\" ] "
            + "      },"
            + "      \"my_toxicity_score\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"input\","
            + "        \"dataType\": \"fractional\","
            + "        \"tags\": [ \"toxicity_insight\" ] "
            + "      },"
            + "      \"some_pattern\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"input\","
            + "        \"dataType\": \"fractional\","
            + "        \"tags\": [ \"patterns_insight\" ] "
            + "      },"
            + "      \"breakme!\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"input\","
            + "        \"dataType\": \"fractional\","
            + "        \"tags\": [ \"jailbreak_insight\" ] "
            + "      },"
            + "      \"\uD83D\uDE42\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"input\","
            + "        \"dataType\": \"fractional\","
            + "        \"tags\": [ \"refusal_insight\" ] "
            + "      },"
            + "      \"README\": {"
            + "        \"discreteness\": \"discrete\","
            + "        \"classifier\": \"output\","
            + "        \"dataType\": \"integral\","
            + "        \"tags\": [ \"flesch_insight\" ] "
            + "      }"
            + "    }"
            + "  }";
    val schema = mapper.readValue(json, EntitySchema.class);
    val insights = InsightSqlQuery.standard(schema);
    val sql = insights.toSql(OVERALL, true);
    // expect a category filter now
    assertThat(
        sql,
        containsString(
            "(SELECT (COLUMN_NAME IN ('some_pattern','my_negative_sentiment','breakme!','README','my_toxicity_score','\uD83D\uDE42')) AS CATEGORY_LLM"));
    // expect all insights insights
    assertThat(
        sql,
        containsString(
            "WHERE (insight_data_null_values + insight_data_imbalance + insight_llm_toxicity + insight_llm_refusal + insight_llm_negative_sentiment + insight_llm_jailbreak + insight_llm_reading_ease + insight_llm_patterns) > 0)"));
  }
}
