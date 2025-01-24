package ai.whylabs.insights;

import static ai.whylabs.insights.ThresholdBaseInsight.INSIGHT_PREFIX;
import static java.util.Objects.isNull;
import static java.util.Objects.nonNull;
import static java.util.Spliterators.spliteratorUnknownSize;

import ai.whylabs.core.configV3.structure.EntitySchema;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableMap;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.compress.utils.Lists;
import org.apache.commons.io.IOUtils;
import org.apache.commons.text.StringSubstitutor;

@Slf4j
@Builder
public class InsightSqlQuery {

  static final String REFERENCE_PROFILE_TEMPLATE;

  static {
    try {
      REFERENCE_PROFILE_TEMPLATE =
          IOUtils.resourceToString("/sql/insight-query-reference.sql", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  static final String RANGE_OVERALL_TEMPLATE;

  static {
    try {
      RANGE_OVERALL_TEMPLATE =
          IOUtils.resourceToString("/sql/insight-query-range.sql", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Singular("add")
  List<ThresholdBaseInsight> insights;

  private static final ObjectMapper MAPPER = new ObjectMapper();

  @SneakyThrows
  public List<InsightEntry> processResult(List<SingleInsightResult> results) {
    val insightsMap =
        insights.stream()
            .collect(Collectors.toMap(it -> INSIGHT_PREFIX + it.getName(), Function.identity()));
    val entries = Lists.<InsightEntry>newArrayList();
    for (val result : results) {
      val json = (ObjectNode) MAPPER.readTree(result.getEntry());
      List<String> insightNames =
          StreamSupport.stream(
                  spliteratorUnknownSize(json.fields(), Spliterator.ORDERED), false) //
              .filter(f -> f.getKey().startsWith(INSIGHT_PREFIX))
              .filter(f -> f.getValue().isNumber())
              .filter(f -> f.getValue().asInt() == 1)
              .map(Map.Entry::getKey)
              .collect(Collectors.toList());

      for (String insightName : insightNames) {
        val insight = insightsMap.get(insightName);
        Preconditions.checkNotNull(insight, "Insight not found: %s", insightNames.get(0));
        val metricResult = MAPPER.treeToValue(json.get("metric_json"), InsightMetricResult.class);
        log.info("res: {}", metricResult);
        val formatter = insight.getMessageFormatter();
        val msg = formatter != null ? formatter.apply(metricResult) : "";
        val entry =
            InsightEntry.builder() //
                .name(insight.getName()) //
                .column(json.path("column_name").asText()) //
                .description(insight.getDescription()) //
                .message(msg) //
                .metrics(metricResult)
                .build();
        entries.add(entry);
      }
    }

    return entries;
  }

  public String toSql(InsightSqlQueryType type) {
    return toSql(type, true);
  }

  public String toSql(InsightSqlQueryType type, boolean sanitized) {
    /*
     produce SQL statement to map column names to category name, e.g.
        "(COLUMN_NAME IN ('response.toxicity','prompt.sentiment_nltk')) AS CATEGORY_LLM,"

     Do not produce any filter if column list is empty.
     Start by iterating over insights to create a map from category name to set of columns.
    */
    val categoryMap =
        insights.stream()
            .filter(i -> nonNull(i.getCategoryColumn()))
            .filter(i -> nonNull(i.getColumnList()))
            .flatMap(
                i ->
                    i.getColumnList().stream()
                        .map(v -> new AbstractMap.SimpleImmutableEntry<>(i.getCategoryColumn(), v)))
            .collect(
                Collectors.groupingBy(
                    Map.Entry::getKey,
                    Collectors.mapping(Map.Entry::getValue, Collectors.toSet())));

    /* then turn that map into SQL statements... */
    val categoryStream =
        categoryMap.entrySet().stream()
            .map(
                v ->
                    new AbstractMap.SimpleImmutableEntry<>(
                        v.getKey(),
                        v.getValue().stream().map(c -> "'" + c + "'").collect(Collectors.toList())))
            .map(e -> "(COLUMN_NAME IN (" + String.join(",", e.getValue()) + ")) AS " + e.getKey());

    /*
     Define the null category predicate even if there are no column name filters.  That is, even if there are no columns for LLM_CATEGORY,
     still need a flag in SQL called `LLM_CATEGORY` that is always false, e.g.
         "(false) as LLM_CATEGORY"
    */
    val nullCategoryMap =
        insights.stream()
            .filter(i -> nonNull(i.getCategoryColumn()))
            .flatMap(
                i -> {
                  if (i.getColumnList() == null || i.getColumnList().size() == 0)
                    return Collections.singletonMap(i.getCategoryColumn(), null)
                        .entrySet()
                        .stream();
                  return i.getColumnList().stream()
                      .map(v -> new AbstractMap.SimpleImmutableEntry<>(i.getCategoryColumn(), v));
                })
            .collect(
                Collectors.groupingBy(
                    Map.Entry::getKey,
                    Collectors.mapping(Map.Entry::getValue, Collectors.toSet())));
    val nullCategoryStream =
        nullCategoryMap.entrySet().stream()
            .filter(e -> e.getValue().size() == 1 && e.getValue().contains(null))
            .map(e -> "(false) AS " + e.getKey());

    // Concatenate category and null-category filters together, along with '*', e.g.
    //        (COLUMN_NAME IN ('myjailbreak')) AS CATEGORY_LLM, *
    // or
    //        (false) AS CATEGORY_LLM, *
    // for the moment there will be either a category filter or an empty category filter, but not
    // both.
    val categoryClauses =
        Stream.concat(Stream.concat(categoryStream, nullCategoryStream), Stream.of("*"))
            .collect(Collectors.joining(",\n"));

    val insightClauses =
        insights.stream()
            .map(ThresholdBaseInsight::toSql)
            .filter(Objects::nonNull) // some insights may remove themselves
            .collect(Collectors.joining(",\n"));
    String insightCountClause =
        insights.stream() //
            .filter(it -> nonNull(it.toSql())) // some insights may remove themselves
            .map(ThresholdBaseInsight::getName) //
            .map(it -> INSIGHT_PREFIX + it) //
            .collect(Collectors.joining(" + "));
    val hasInsightClause = "(" + insightCountClause + ") > 0";

    String result;
    switch (type) {
      case OVERALL:
        result =
            StringSubstitutor.replace(
                RANGE_OVERALL_TEMPLATE,
                ImmutableMap.of(
                    "INSIGHT_CLAUSES", insightClauses,
                    "CATEGORY_CLAUSES", categoryClauses,
                    "HAS_INSIGHT_CLAUSE", hasInsightClause));
        break;
      case SEGMENTED:
        result =
            StringSubstitutor.replace(
                    RANGE_OVERALL_TEMPLATE,
                    ImmutableMap.of(
                        "INSIGHT_CLAUSES", insightClauses,
                        "CATEGORY_CLAUSES", categoryClauses,
                        "HAS_INSIGHT_CLAUSE", hasInsightClause))
                .replace("WHYLABS.PROFILES_OVERALL", "WHYLABS.PROFILES_SEGMENTED");
        break;
      case REFERENCE:
        result =
            StringSubstitutor.replace(
                REFERENCE_PROFILE_TEMPLATE,
                ImmutableMap.of(
                    "INSIGHT_CLAUSES", insightClauses,
                    "CATEGORY_CLAUSES", categoryClauses,
                    "HAS_INSIGHT_CLAUSE", hasInsightClause));
        break;
      default:
        throw new IllegalArgumentException("Unsupported type: " + type);
    }
    if (sanitized) {
      return result.replace("?&", "\\?\\?&");
    } else {
      return result;
    }
  }

  public String toCountSql(InsightSqlQueryType type) {
    val insightQuery = toSql(type);
    return insightQuery.replace("SELECT * FROM RESULTS", "SELECT COUNT(*) FROM RESULTS");
  }

  // generate llm queries.  Insights are applied to columns based on tags in entity schema.
  public static InsightSqlQuery standard(EntitySchema entitySchema) {
    final Map<String, List<String>> tagMap = invertTagMap(entitySchema);
    val nullness =
        ThresholdBaseInsight.builder()
            .name("data_null_values")
            .numeratorColumn(InsightColumn.COUNTS_NULL)
            .denominatorColumn(InsightColumn.COUNTS_TOTAL)
            .upperThreshold(0.1)
            .isUpperThresholdInclusive(true)
            .messageFormatter(
                metricResult -> {
                  val nullCount = Optional.ofNullable(metricResult.getCountsNull()).orElse(0L);
                  val totalCount = metricResult.getCountsTotal();
                  val percent =
                      Optional.ofNullable(totalCount).map(it -> (nullCount * 1.0) / it).orElse(0d);
                  return String.format("has %s (%.2f%%) missing values", nullCount, percent * 100);
                })
            .build();
    val imbalance =
        ThresholdBaseInsight.builder()
            .name("data_imbalance")
            .numeratorColumn(InsightColumn.MOST_FREQ_ESTIMATE)
            .denominatorColumn(InsightColumn.COUNTS_TOTAL)
            .upperThreshold(0.5)
            .isUpperThresholdInclusive(true)
            .messageFormatter(
                metricResult -> {
                  val estimateCount =
                      Optional.ofNullable(metricResult.getMostFreqEstimate()).orElse(0L);
                  val totalCount = metricResult.getCountsTotal();
                  val percent =
                      Optional.ofNullable(totalCount)
                          .map(it -> (estimateCount * 1.0) / it)
                          .orElse(0d);
                  return String.format(
                      "is imbalanced because \"%s\" occurs more than 50%% (%.2f%%) in total %d rows",
                      metricResult.mostFreqValue, percent * 100, estimateCount);
                })
            .build();
    val llmToxicity =
        ThresholdBaseInsight.builder()
            .name("llm_toxicity")
            .numeratorColumn(InsightColumn.MAX_VALUE)
            .categoryColumn(CategoryColumn.CATEGORY_LLM)
            .columnList(tagMap.get("toxicity_insight"))
            .upperThreshold(0.8)
            .messageFormatter(
                metricResult ->
                    String.format(
                        "has a max toxicity score of %.2f [0 to 1], where >.5 indicates more offensive language",
                        metricResult.getMaxValue()))
            .build();

    val llmRefusal =
        ThresholdBaseInsight.builder()
            .name("llm_refusal")
            .numeratorColumn(InsightColumn.MAX_VALUE)
            .categoryColumn(CategoryColumn.CATEGORY_LLM)
            .columnList(tagMap.get("refusal_insight"))
            .upperThreshold(0.8)
            .messageFormatter(
                metricResult ->
                    String.format(
                        "has a max refusal score of %.2f of 1, indicating at least one likely refusal response, with an overall mean of %.2f",
                        metricResult.getMaxValue(), metricResult.getMean()))
            .build();

    // list all columns with sentiment tag.
    val llmNegativeSentiment =
        ThresholdBaseInsight.builder()
            .name("llm_negative_sentiment")
            .numeratorColumn(InsightColumn.MIN_VALUE)
            .categoryColumn(CategoryColumn.CATEGORY_LLM)
            .columnList(tagMap.get("negative_sentiment_insight"))
            .lowerThreshold(-0.6)
            .messageFormatter(
                metricResult -> {
                  val promptOrResponse =
                      metricResult.getColumnName().startsWith("prompt") ? "prompts" : "responses";
                  return String.format(
                      "has a min sentiment score of %.2f of [-1,1], indicating at least one negative sentiment %s, where <0 indicates negative sentiment\n",
                      metricResult.minValue, promptOrResponse);
                })
            .build();

    val llmJailbreakSimilarity =
        ThresholdBaseInsight.builder()
            .name("llm_jailbreak")
            .numeratorColumn(InsightColumn.MAX_VALUE)
            .categoryColumn(CategoryColumn.CATEGORY_LLM)
            .columnList(tagMap.get("jailbreak_insight"))
            .upperThreshold(0.5)
            .isUpperThresholdInclusive(false)
            .messageFormatter(
                metricResult ->
                    String.format(
                        "has a max jailbreak score of %.2f of 1, indicating at least one jailbreaking attempt, with an overall mean of %.2f",
                        metricResult.getMaxValue(), metricResult.getMean()))
            .build();

    val llmReadingEaseInsight =
        ThresholdBaseInsight.builder()
            .name("llm_reading_ease")
            .numeratorColumn(InsightColumn.MEAN)
            .categoryColumn(CategoryColumn.CATEGORY_LLM)
            .columnList(tagMap.get("flesch_insight"))
            .lowerThreshold(60.0)
            .messageFormatter(
                metricResult ->
                    String.format(
                        "has a mean flesch reading ease of %.2f of 100 (higher is easier to understand), which implies difficulty understanding responses",
                        metricResult.getMean()))
            .build();

    val llmPatternInsights =
        ThresholdBaseInsight.builder()
            .name("llm_patterns")
            .numeratorColumn(InsightColumn.MOST_FREQ_ESTIMATE)
            .categoryColumn(CategoryColumn.CATEGORY_LLM)
            .columnList(tagMap.get("patterns_insight"))
            .upperThreshold(1.0)
            .isUpperThresholdInclusive(true)
            .messageFormatter(
                metricResult -> {
                  val estimateCount =
                      Optional.ofNullable(metricResult.getMostFreqEstimate()).orElse(0L);
                  val featureName = metricResult.getColumnName();
                  val promptsOrResponses =
                      featureName.startsWith("prompt") ? "prompts" : "responses";
                  val totalCount = metricResult.getCountsTotal();
                  val patternCount = metricResult.getPatternCount();
                  return String.format(
                      "has %d pattern matches, including \"%s\" with a count of %d in %d %s",
                      patternCount,
                      metricResult.mostFreqValue,
                      estimateCount,
                      totalCount,
                      promptsOrResponses);
                })
            .build();

    return InsightSqlQuery.builder() //
        .add(nullness)
        .add(imbalance)
        .add(llmToxicity) // ** toxicity_insight
        .add(llmRefusal) // ** refusal_insight
        .add(llmNegativeSentiment) // ** negative_sentiment_insight
        .add(llmJailbreakSimilarity) // ** jailbreak_insight
        .add(llmReadingEaseInsight) // ** flesch_insight
        .add(llmPatternInsights) // ** "patterns_insight"
        .build();
  }

  /**
   * spotless:off
   * Invert entity column tags map.
   *
   * `EntitySchema.ColumnMap` maps column name to struct, including a list of twitter-like tags.
   * Invert that map so keys are tags, and values are lists of column names that have that tag, e.g.
   *      negative_sentiment_insight=[prompt.sentiment_nltk, response.sentiment_nltk]
   *
   * spotless:on
   */
  private static Map<String, List<String>> invertTagMap(EntitySchema entitySchema) {
    // entitySchema might be legitimately null. - should produce empty Map.
    return Optional.ofNullable(entitySchema)
        .map(es -> es.getColumns().entrySet())
        .orElse(Collections.emptySet())
        .stream()
        .filter(c -> !isNull(c.getValue().getTags()))
        .flatMap(
            e ->
                e.getValue().getTags().stream()
                    .map(v -> new AbstractMap.SimpleImmutableEntry<>(v, e.getKey())))
        .collect(
            Collectors.groupingBy(
                Map.Entry::getKey, Collectors.mapping(Map.Entry::getValue, Collectors.toList())));
  }

  /*public static void main(String[] args) {
    System.out.println(standard().toSql(InsightSqlQueryType.OVERALL, false));
  }*/
}
