package ai.whylabs.core.serde;

import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.adhoc.structures.AdHocMonitorResponse;
import ai.whylabs.adhoc.structures.BackfillExplainerRequest;
import ai.whylabs.adhoc.structures.BackfillExplainerResponse;
import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.cache.Cache;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.function.Supplier;
import lombok.SneakyThrows;
import lombok.val;

public class MonitorConfigV3JsonSerde {

  @VisibleForTesting
  public static final transient ThreadLocal<ObjectMapper> MAPPER =
      ThreadLocal.withInitial(
          new Supplier<ObjectMapper>() {
            @Override
            public ObjectMapper get() {
              val mapper = new ObjectMapper();
              configureMapper(mapper);
              mapper.registerModule(new JavaTimeModule());

              return mapper;
            }
          });

  public static void configureMapper(ObjectMapper mapper) {
    mapper.configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true);
    mapper.configure(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES, false);
    mapper.configure(DeserializationFeature.FAIL_ON_INVALID_SUBTYPE, false);
    mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    mapper.configure(DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_AS_NULL, true);
    mapper.setSerializationInclusion(Include.NON_NULL);
    mapper.registerModule(new JavaTimeModule());
    mapper.registerModule(new ParameterNamesModule(JsonCreator.Mode.PROPERTIES));
    mapper.enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS);
  }

  public static MonitorConfigV3 parseMonitorConfigV3(MonitorConfigV3Row monitorConfigV3Row) {
    return parseMonitorConfigV3(monitorConfigV3Row.getJsonConf());
  }

  public static MonitorConfigV3 parseMonitorConfigV3(
      Cache<String, MonitorConfigV3> cache, MonitorConfigV3Row monitorConfigV3Row) {
    return parseMonitorConfigV3Cached(
        cache,
        monitorConfigV3Row.getJsonConf(),
        monitorConfigV3Row.getOrgId(),
        monitorConfigV3Row.getDatasetId());
  }

  @SneakyThrows
  public static MonitorConfigV3Row toMonitorConfigV3Row(MonitorConfigV3 monitorConfigV3) {
    return MonitorConfigV3Row.builder()
        .orgId(monitorConfigV3.getOrgId())
        .datasetId(monitorConfigV3.getDatasetId())
        .updatedTs(System.currentTimeMillis())
        .jsonConf(MAPPER.get().writeValueAsString(monitorConfigV3))
        .build();
  }

  @SneakyThrows
  public static Monitor parseMonitor(String monitorJson) {
    return MAPPER.get().readValue(monitorJson, Monitor.class);
  }

  @SneakyThrows
  public static String toJson(Monitor monitor) {
    return MAPPER.get().writeValueAsString(monitor);
  }

  @SneakyThrows
  public static String toJson(Analyzer analyzer) {
    return MAPPER.get().writeValueAsString(analyzer);
  }

  @SneakyThrows
  public static String toJson(List<Analyzer> analyzers) {
    return MAPPER.get().writeValueAsString(analyzers);
  }

  @SneakyThrows
  public static String toJson(AnalyzerSchedule analyzerSchedule) {
    return MAPPER.get().writeValueAsString(analyzerSchedule);
  }

  @SneakyThrows
  public static String toJson(AdHocMonitorRequestV3 req) {
    return MAPPER.get().writeValueAsString(req);
  }

  /**
   * Configure ObjectMapper to throw exception for unrecognized fields when parsing JSON. This is
   * exposed only for unit testing, not for use in production.
   */
  @VisibleForTesting
  public static void enableStrictParsing() {
    MAPPER.get().configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, false);
    MAPPER.get().configure(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES, true);
    MAPPER.get().configure(DeserializationFeature.FAIL_ON_INVALID_SUBTYPE, true);
    MAPPER.get().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);
  }

  @VisibleForTesting
  public static void disableStrictParsing() {
    MAPPER.get().configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true);
    MAPPER.get().configure(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES, false);
    MAPPER.get().configure(DeserializationFeature.FAIL_ON_INVALID_SUBTYPE, false);
    MAPPER.get().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
  }

  @SneakyThrows
  public static MonitorConfigV3 parseMonitorConfigV3Cached(
      Cache<String, MonitorConfigV3> cache, String json, String orgId, String datasetId) {
    String cacheKey = orgId + datasetId;
    return cache.get(
        cacheKey,
        new Callable<MonitorConfigV3>() {
          @Override
          public MonitorConfigV3 call() {
            return parseMonitorConfigV3(json);
          }
        });
  }

  @SneakyThrows
  public static MonitorConfigV3 parseMonitorConfigV3(String json) {
    return MAPPER.get().readValue(json, MonitorConfigV3.class);
  }

  @SneakyThrows
  public static Baseline parseBaseline(String json) {
    return MAPPER.get().readValue(json, Baseline.class);
  }

  @SneakyThrows
  public static Analyzer parseAnalyzer(String json) {
    return MAPPER.get().readValue(json, Analyzer.class);
  }

  @SneakyThrows
  public static Analyzer[] parseAnalyzerList(String json) {
    return MAPPER.get().readValue(json, Analyzer[].class);
  }

  @SneakyThrows
  public static AnalyzerSchedule parseAnalyzerSchedule(String json) {
    return MAPPER.get().readValue(json, AnalyzerSchedule.class);
  }

  @SneakyThrows
  public static String toString(MonitorConfigV3 configV3) {
    return MAPPER.get().writeValueAsString(configV3);
  }

  public static MonitorConfigV3 clone(MonitorConfigV3 config) {
    return parseMonitorConfigV3(toString(config));
  }

  @SneakyThrows
  public static String toString(Baseline baseline) {
    return MAPPER.get().writeValueAsString(baseline);
  }

  @SneakyThrows
  public static AdHocMonitorRequestV3 parseAdhocRequest(String json) {
    return MAPPER.get().readValue(json, AdHocMonitorRequestV3.class);
  }

  @SneakyThrows
  public static BackfillExplainerRequest parseBackfillExplanationRequest(String json) {
    return MAPPER.get().readValue(json, BackfillExplainerRequest.class);
  }

  @SneakyThrows
  public static String toString(AdHocMonitorResponse r) {
    return MAPPER.get().writeValueAsString(r);
  }

  @SneakyThrows
  public static String toString(BackfillExplainerResponse r) {
    return MAPPER.get().writeValueAsString(r);
  }
}
