package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.models.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.microsoft.azure.kusto.data.KustoResultSetTable;
import io.micronaut.data.annotation.Repository;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Singleton;
import lombok.NoArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Singleton
@NoArgsConstructor
@Repository
public abstract class TraceEmbeddingService {

  public final int MAX_TRACE_EMBEDDINGS_OFFSET = 10000;

  @SneakyThrows
  private String findMostCriticalFailureLevel(
      JsonNode events, String embeddingType, List<String> filteredTags) {
    var behavior = filteredTags.isEmpty() ? "observe" : "";
    for (final JsonNode ev : events) {
      val isNotValidationEvent = !ev.get("EventName").asText().equals("whylabs.secure.validation");
      val isNotEmbeddingType =
          !ev.get("EventAttributes").get("metric").asText().startsWith(embeddingType.concat("."));
      val eventBehavior =
          Optional.ofNullable(ev.get("EventAttributes").get("failure_level").asText()).orElse("");
      val isFilteredTag =
          filteredTags.isEmpty()
              || filteredTags.stream()
                  .anyMatch(tag -> ev.get("EventAttributes").get("metric").asText().contains(tag));
      if (isNotValidationEvent || isNotEmbeddingType || eventBehavior.isEmpty() || !isFilteredTag)
        continue;
      if (eventBehavior.equals("flag") && (behavior.equals("observe") || behavior.isEmpty())) {
        behavior = "flag";
        continue;
      }
      if (eventBehavior.equals("block")) {
        behavior = "block";
        break;
      }
    }
    return behavior;
  }

  @SneakyThrows
  private String getEmbeddingBehavior(
      JsonNode events, String embeddingType, TraceSpanFilter embeddingsFilter) {
    if (!events.isArray() || events.isEmpty()) return "observe";
    val filteredTags =
        Optional.ofNullable(embeddingsFilter.getTags()).orElse(Collections.emptyList());
    val behavior = embeddingsFilter.getBehaviorType();
    // return the filtered behavior if it has behavior filter applied
    if (behavior != null) return behavior.toString();
    return findMostCriticalFailureLevel(events, embeddingType, filteredTags);
  }

  @SneakyThrows
  public TraceEmbeddingDataRow handleTraceEmbedding(
      String type,
      JsonNode coords,
      JsonNode events,
      String traceId,
      String spanId,
      String dataTag,
      Integer dataVersion,
      Integer dataMajorVersion,
      TraceSpanFilter embeddingsFilter) {
    val findBehavior = getEmbeddingBehavior(events, type, embeddingsFilter);
    if (findBehavior == null || findBehavior.isEmpty()) {
      return null;
    }
    val row = TraceEmbeddingDataRow.builder();
    row.traceId(traceId);
    row.spanId(spanId);
    row.type(type);
    row.x(coords.get(0).doubleValue());
    row.y(coords.get(1).doubleValue());
    row.z(coords.get(2).doubleValue());
    row.behavior(findBehavior);
    row.dataTag(dataTag);
    row.dataVersion(dataVersion);
    row.dataMajorVersion(dataMajorVersion);
    return row.build();
  }

  /*
   * This should use the container cause metadata on validation events once it's available to avoid looking on scores
   */
  @SneakyThrows
  private Set<String> handleRelevantDatasets(KustoResultSetTable kustoRow) {
    val relevantDatasets = new HashSet<String>();
    val events = kustoRow.getJSONObject("Events");
    val embeddingType = kustoRow.getString("Type");

    // mapping the violations related to projector datasets
    for (final JsonNode ev : events) {
      val isNotValidationEvent = !ev.get("EventName").asText().equals("whylabs.secure.validation");
      val eventMetric = ev.get("EventAttributes").get("metric").asText();
      val isNotEmbeddingType = !eventMetric.startsWith(embeddingType.concat("."));
      if (isNotValidationEvent || isNotEmbeddingType) continue;
      if (eventMetric.equals(embeddingType.concat(".score.bad_actors"))) {
        // we only have injections metric for bad_actors, so we don't need to look scores
        relevantDatasets.add("injection");
        continue;
      }
      if (eventMetric.equals(embeddingType.concat(".score.misuse"))) {
        // We need to change this conditional every new topic we add on misuse ruleset
        val misuseScore = Float.parseFloat(kustoRow.getString("MisuseScore"));
        val medicalScore = Float.parseFloat(kustoRow.getString("MedicalTopicScore"));
        val codeScore = Float.parseFloat(kustoRow.getString("CodeTopicScore"));
        val legalScore = Float.parseFloat(kustoRow.getString("LegalTopicScore"));
        val financialScore = Float.parseFloat(kustoRow.getString("FinancialTopicScore"));
        if (medicalScore == misuseScore) relevantDatasets.add("medical");
        if (codeScore == misuseScore) relevantDatasets.add("code");
        if (legalScore == misuseScore) relevantDatasets.add("legal");
        if (financialScore == misuseScore) relevantDatasets.add("financial");
        continue;
      }
      if (eventMetric.equals(embeddingType.concat(".score.customer_experience"))) {
        // customer experience also has PII metrics, but we don't have example datasets besides
        // hate/toxic
        val cxScore = Float.parseFloat(kustoRow.getString("CustomerExperienceScore"));
        val cxToxicityScore = Float.parseFloat(kustoRow.getString("ToxicityScore"));
        if (cxScore == cxToxicityScore) {
          relevantDatasets.add("hate");
          relevantDatasets.add("toxic");
        }
      }
    }
    return relevantDatasets;
  }

  @SneakyThrows
  public TraceEmbeddingsResponse processEmbeddingsResponse(
      KustoResultSetTable mainTableResult,
      int limit,
      int offset,
      TraceSpanFilter embeddingsFilter) {
    val rows = new ArrayList<TraceEmbeddingDataRow>();
    val builder = TraceEmbeddingsResponse.builder();
    var lastRecordRowId = 0;
    Map<String, Integer> majorVersionLatestDataVersion = new HashMap<>();
    Set<String> relevantDatasets = new HashSet<>();
    while (mainTableResult.next()) {
      if (lastRecordRowId >= offset + limit) {
        // if there's the extra entry, set as partial and don't include on response
        if (offset < MAX_TRACE_EMBEDDINGS_OFFSET) {
          builder.partial(true);
          builder.nextOffset(lastRecordRowId);
        }
        break;
      }
      relevantDatasets.addAll(handleRelevantDatasets(mainTableResult));
      val coords = mainTableResult.getJSONObject("Coords");
      val type = mainTableResult.getString("Type");
      val events = mainTableResult.getJSONObject("Events");
      val traceId = mainTableResult.getString("TraceId");
      val spanId = mainTableResult.getString("SpanId");
      val dataTag = mainTableResult.getString("DataTag");
      val dataVersionString =
          Optional.ofNullable(mainTableResult.getString("DataVersion")).orElse("");
      val dataMajorVersionString =
          Optional.ofNullable(mainTableResult.getString("DataMajorVersion")).orElse("");
      val dataVersion = dataVersionString.isEmpty() ? null : Integer.valueOf(dataVersionString);
      val dataMajorVersion =
          dataMajorVersionString.isEmpty() ? null : Integer.valueOf(dataMajorVersionString);

      if (coords != null && coords.isArray() && coords.size() == 3) {
        val embedding =
            handleTraceEmbedding(
                type,
                coords,
                events,
                traceId,
                spanId,
                dataTag,
                dataVersion,
                dataMajorVersion,
                embeddingsFilter);
        if (embedding != null) {
          rows.add(embedding);
          val versionMapKey = dataTag != null ? dataTag.concat(":" + dataMajorVersion) : null;
          val currentMajorVersion = majorVersionLatestDataVersion.get(versionMapKey);
          if (dataMajorVersion != null
              && dataTag != null
              && dataVersion != null
              && (currentMajorVersion == null || currentMajorVersion < dataVersion)) {
            majorVersionLatestDataVersion.put(versionMapKey, dataVersion);
          }
        }
      }
      lastRecordRowId = mainTableResult.getInt("RowId");
    }

    val groupedRows =
        rows.stream()
            .collect(
                Collectors.groupingBy(
                    i ->
                        i.getType()
                            + ":"
                            + i.getBehavior()
                            + ":"
                            + i.getDataTag()
                            + ":"
                            + i.getDataMajorVersion()));
    val entries =
        groupedRows.entrySet().stream()
            .collect(
                Collectors.toMap(
                    Map.Entry::getKey,
                    entry -> {
                      val categoryEmbeddings = TraceEmbeddingsCategoryDataset.builder();
                      val traceId = new ArrayList<String>();
                      val spanId = new ArrayList<String>();
                      val x = new ArrayList<Double>();
                      val y = new ArrayList<Double>();
                      val z = new ArrayList<Double>();
                      val type = entry.getKey().split(":")[0];
                      val behavior = entry.getKey().split(":")[1];
                      val dataTag = entry.getKey().split(":")[2];
                      val majorVersion = entry.getKey().split(":")[3];
                      val dataMajorVersion =
                          majorVersion.equals("null") ? null : Integer.valueOf(majorVersion);
                      val dataVersion =
                          majorVersionLatestDataVersion.get(dataTag.concat(":" + dataMajorVersion));
                      entry
                          .getValue()
                          .forEach(
                              i -> {
                                traceId.add(i.getTraceId());
                                spanId.add(i.getSpanId());
                                x.add(i.getX());
                                y.add(i.getY());
                                z.add(i.getZ());
                              });
                      categoryEmbeddings.x(x);
                      categoryEmbeddings.y(y);
                      categoryEmbeddings.z(z);
                      categoryEmbeddings.traceId(traceId);
                      categoryEmbeddings.spanId(spanId);
                      categoryEmbeddings.type(type);
                      categoryEmbeddings.behavior(behavior);
                      categoryEmbeddings.dataTag(dataTag.equals("null") ? null : dataTag);
                      categoryEmbeddings.dataVersion(dataVersion);
                      categoryEmbeddings.dataMajorVersion(dataMajorVersion);
                      return categoryEmbeddings.build();
                    }));
    builder.entries(entries);
    builder.count(rows.size());
    builder.relevantDatasets(relevantDatasets);
    return builder.build();
  }
}
