package ai.whylabs.dataservice.operationalMetrics;

import static ai.whylabs.dataservice.operationalMetrics.MetricType.STREAMING_INGESTION;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.DATASET_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.ORG_ID;
import static ai.whylabs.ingestion.WhylogsFileIterator.META_URI;
import static java.util.Objects.nonNull;

import ai.whylabs.core.configV3.structure.ColumnSchema;
import ai.whylabs.core.configV3.structure.Metadata;
import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.configV3.structure.enums.DataType;
import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import ai.whylabs.core.enums.ModelType;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.entitySchema.DefaultColumnMetadata;
import ai.whylabs.dataservice.entitySchema.DefaultMetadata;
import ai.whylabs.dataservice.entitySchema.DefaultSchemaMetadata;
import ai.whylabs.dataservice.enums.StandardMetrics;
import ai.whylabs.druid.whylogs.discrete.DiscretePostAggregator;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregator;
import ai.whylabs.druid.whylogs.streaming.KinesisProducerFactory;
import ai.whylabs.ingestion.V1Metadata;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.shaded.whylabs.com.google.protobuf.ByteString;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.whylogs.core.message.ColumnMessage;
import com.whylogs.core.message.HllSketchMessage;
import com.whylogs.core.message.MetricComponentMessage;
import com.whylogs.v0.core.message.InferredType;
import io.micrometer.core.instrument.MeterRegistry;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@RequiredArgsConstructor
@Getter
@Slf4j
public class EntitySchemaInstrumentationImpl implements EntitySchemaInstrumentation {
  private static final Integer SPLIT_THRESHOLD = 1000;

  private static final Gson GSON = new Gson();
  private static final ExecutorService EXECUTOR = Executors.newFixedThreadPool(2);

  final String OUTPUT_KEYWORD_CONST = "output";

  // required constructor arguments
  private final V1Metadata metadata;
  private final DataSvcConfig config;
  private final MeterRegistry meterRegistry;

  private List<ModelTypeInferencePredicate> metricPathModelInference =
      Arrays.asList(new ClassificationModelPredicate(), new RegressionModelPredicate());
  private ModelType modelType = null;
  private Map<String, DefaultColumnMetadata> defaultColumnMetadata = null;

  // map from columnName to inferred column metadata
  @Deprecated private final Map<String, ColumnMetadata> columnMetadata = new HashMap<>();

  public EntitySchemaInstrumentationImpl(
      V1Metadata metadata,
      DefaultSchemaMetadata schemaMetadata,
      DataSvcConfig config,
      MeterRegistry meterRegistry) {
    this.metadata = metadata;
    this.config = config;
    this.meterRegistry = meterRegistry;

    if (nonNull(schemaMetadata) && nonNull(schemaMetadata.metadata)) {
      DefaultMetadata llmMetaData = schemaMetadata.metadata.get("llm");
      if (nonNull(llmMetaData) && nonNull(llmMetaData.columnMetadata)) {
        defaultColumnMetadata =
            Arrays.stream(llmMetaData.columnMetadata)
                .collect(Collectors.toMap(e -> e.name, Function.identity()));

        // for every alias, create a duplicate entry in defaultColumnMetadata
        // aliases are key-value pairs, e.g. "alias_name: existing_name"
        val aliases =
            Optional.ofNullable(llmMetaData.aliases)
                .map(Map::entrySet)
                .orElse(Collections.emptySet());
        for (val e : aliases) {
          if (defaultColumnMetadata.containsKey(e.getValue())) {
            defaultColumnMetadata.put(e.getKey(), defaultColumnMetadata.get(e.getValue()));
          }
        }
      }
    }
  }

  private static HllSketch getHll(ColumnMessage metrics) {
    try {
      return StandardMetrics.HLL
          .getMetricComponent(metrics)
          .map(MetricComponentMessage::getHll) //
          .map(HllSketchMessage::getSketch)
          .map(ByteString::toByteArray)
          .map(Memory::wrap)
          .map(HllSketch::wrap)
          .orElse(null);
    } catch (Exception e) {
      log.warn("Failed to decode HLL sketch. Message: {}", e.getMessage());
      return null;
    }
  }

  /**
   * schema.direction schema.type schema.discrete schema.tags
   *
   * @param metrics
   */
  public void accummulateSchema(String columnName, ColumnMessage metrics) {
    // only infer column metrics - not dataset metrics
    if (columnName == null) return;

    try {
      val schema = ColumnMetadata.builder();

      // This is oldschool whylogs, when V1 launches a more formalized way to know direction we
      // should switch to that and keep this as a fallback for legacy uploads
      Direction direction = Direction.INPUT;
      if (columnName.contains(OUTPUT_KEYWORD_CONST)) {
        direction = Direction.OUTPUT;
      }
      schema.direction(direction);

      long nullCount = StandardMetrics.COUNT_NULL.getOptionalLong(metrics).orElse(0L);

      Map<InferredType.Type, Long> typeCounts = new HashMap<>();
      typeCounts.put(
          InferredType.Type.UNKNOWN, StandardMetrics.COUNT_TYPES_OBJECTS.getLong(metrics));
      typeCounts.put(
          InferredType.Type.FRACTIONAL, StandardMetrics.COUNT_TYPES_FRACTIONAL.getLong(metrics));
      typeCounts.put(
          InferredType.Type.INTEGRAL, StandardMetrics.COUNT_TYPES_INTEGRAL.getLong(metrics));
      typeCounts.put(
          InferredType.Type.BOOLEAN, StandardMetrics.COUNT_TYPES_BOOLEAN.getLong(metrics));
      typeCounts.put(InferredType.Type.STRING, StandardMetrics.COUNT_TYPES_STRING.getLong(metrics));
      InferredType.Type type = InferredTypePostAggregator.compute(typeCounts, nullCount).getType();
      schema.type(type);

      StandardMetrics.HLL
          .getOptionalHll(metrics)
          .ifPresent(
              hll -> {
                long count = StandardMetrics.COUNT_N.getLong(metrics);
                boolean isDiscrete =
                    Boolean.TRUE.equals(DiscretePostAggregator.compute(hll, count, type));
                schema.discrete(isDiscrete);
              });

      inferLLMTags(columnName, schema);
      columnMetadata.put(columnName, schema.build());

    } catch (Exception e) {
      meterRegistry.counter("whylabs.entityschema.accummulate.error").count();
      log.error("Error collecting entity schema information ", e);
    }

    if (modelType != null) {
      // Short circuit
      return;
    }
    // Infer model type based on metric paths present. First one wins
    try {
      for (val entry : metrics.getMetricComponentsMap().entrySet()) {
        val metricPath = entry.getKey();
        for (val p : metricPathModelInference) {
          if (modelType == null && p.test(metricPath)) {
            modelType = p.getType();
          }
        }
      }
    } catch (Exception e) {
      meterRegistry.counter("whylabs.entityschema.accummulate.error").count();
      log.error("Error inferring model type ", e);
    }
  }

  /**
   * add tags to columns that appear in the default LLM schema metadata. Set model type if not
   * already set.
   */
  private void inferLLMTags(String columnName, ColumnMetadata.ColumnMetadataBuilder schema) {
    // note defaultColumnMetadata can be null if there is no LLM section in the column metadata,
    // whether in the S3 override or in the default resource file.
    if (defaultColumnMetadata == null) {
      log.error(
          String.format("unexpected null defaultColumnMetadata for column \"%s\"", columnName));
      return;
    }

    val colMetadata = defaultColumnMetadata.get(columnName);
    if (nonNull(colMetadata)) {
      schema.tags(colMetadata.tags);
      if (modelType == null) {
        modelType = ModelType.llm;
      }
    }
  }

  /**
   * Translate entity schema to pojo format stored in postgres.
   *
   * <p>Note return type does NOT represent what is sent to kinesis/songbird. One day we will
   * eliminate kinesis stream to songbird and can then accumulate in native PG format instead of
   * doing this translation.
   */
  public ai.whylabs.core.configV3.structure.EntitySchema getEntitySchema() {
    Map<String, ColumnSchema> columnSchemaMap = new HashMap<>();

    for (val c : columnMetadata.entrySet()) {
      val builder =
          ColumnSchema.builder()
              .dataType(DataType.valueOf(c.getValue().getType().name()))
              .classifier(Classifier.valueOf(c.getValue().getDirection().name().toLowerCase()));
      if (c.getValue().discrete) {
        builder.discreteness(DiscretenessType.discrete);
      } else {
        builder.discreteness(DiscretenessType.continuous);
      }
      builder.tags(c.getValue().getTags());
      columnSchemaMap.put(c.getKey(), builder.build());
    }

    val b = ai.whylabs.core.configV3.structure.EntitySchema.builder().columns(columnSchemaMap);
    b.modelType(modelType);
    b.metadata(Metadata.builder().updatedTimestamp(System.currentTimeMillis()).build());
    return b.build();
  }

  /**
   * Produce a stream of metrics that describe whether a profile ingestion was successful. We'll
   * sink this to druid so we can surface issues in the UI around ingestion.
   *
   * <p>Secondly, do some dataset schema/direction/discrete inference. This gives Songbird an
   * opportunity to collect some schema data as profiles are being streamed in. Notably we won't put
   * the schema stuff into druid, that's just for songbird.
   *
   * <p>Also notably the schema inference stuff doesn't have to happen in Druid, that just happens
   * to be the only managed streaming task we have in place atm. I could totally see moving that
   * part of code into either a lambda function or service of some sort that's fed S3 upload
   * notifications to process.
   *
   * @return
   */
  @VisibleForTesting
  @Deprecated // We're going to move away from publishing this kinesis stream towards writing
  // directly to PG. See https://app.clickup.com/t/86aypbgrv
  public Stream<OperationalMetric> operationalMetrics() {
    val props = metadata.getProperties();
    val tags = props.getTagsMap();
    val m = metadata.getProperties().getMetadataMap();

    // Divide stream into chunks of SPLIT_THRESHOLD features per message.
    AtomicInteger ai = new AtomicInteger();
    val chunks =
        columnMetadata.entrySet().stream()
            .collect(Collectors.groupingBy(it -> ai.getAndIncrement() / SPLIT_THRESHOLD))
            .values();

    val metricBuilder =
        OperationalMetric.builder()
            .ts(System.currentTimeMillis())
            .datasetId(tags.get(DATASET_ID))
            .orgId(tags.get(ORG_ID))
            .file(m.get(META_URI))
            .datasetTs(props.getDatasetTimestamp())
            .metricType(STREAMING_INGESTION)
            .producer(getImplementationVersion());

    return chunks.stream()
        .map(ImmutableMap::copyOf)
        .map(mm -> metricBuilder.columnMetadata(mm).build());
  }

  /** return version string from jar manifest attributes. See https://yusuke.blog/2022/04/03/3259 */
  public static String getImplementationVersion() {
    return EntitySchemaInstrumentationImpl.class.getPackage().getImplementationVersion();
  }

  /** publish the column metadata accumulated in this instance to kinesis. */
  public void publish() {
    val props = metadata.getProperties();
    val tags = props.getTagsMap();

    if (!config.isEnableKinesis()) {
      meterRegistry.counter("whylabs.entityschema.publish.error").count();
      log.error(
          "kinesis disabled, skip schema {}",
          metadata.getProperties().getMetadataMap().get(META_URI));
      return;
    }
    if (config.getIngestionNotificationStream() == null) {
      meterRegistry.counter("whylabs.entityschema.publish.error").count();
      log.error("ingestionNotificationStream unconfigured, no notifications will be published");
      return;
    }

    val producer = KinesisProducerFactory.get();

    operationalMetrics()
        .forEach(
            operationalMetric -> {
              try {
                String metricJson = GSON.toJson(operationalMetric);
                val res =
                    producer.addUserRecord(
                        config.getIngestionNotificationStream(),
                        tags.get(ORG_ID),
                        ByteBuffer.wrap(metricJson.getBytes(StandardCharsets.UTF_8)));
                log.debug(
                    "Publishing operational metrics for: file={},ts={},kinesis_topic={},content={}", //
                    operationalMetric.getFile(), //
                    operationalMetric.getDatasetTs(), //
                    config.getIngestionNotificationStream(),
                    metricJson);

                res.addListener(
                    () -> {
                      try {
                        val userRecordResult = res.get();
                        if (userRecordResult.isSuccessful()) {
                          log.debug(
                              "Successfully sent operational metrics for {}",
                              operationalMetric.getFile());
                          meterRegistry.counter("whylabs.entityschema.publish.success").count();
                        } else {
                          val attemptErrorMessages =
                              userRecordResult.getAttempts().stream()
                                  .map(
                                      attempt ->
                                          attempt.getErrorMessage() + " " + attempt.getErrorCode())
                                  .collect(Collectors.joining(","));

                          meterRegistry.counter("whylabs.entityschema.publish.failure").count();
                          log.error(
                              "Failed to send operational metrics for {}. Attempt Messages: {}",
                              operationalMetric.getFile(),
                              attemptErrorMessages);
                        }
                      } catch (InterruptedException | ExecutionException e) {
                        meterRegistry.counter("whylabs.entityschema.publish.failure").count();
                        log.warn(
                            "Failed to check status for operational metrics: {}",
                            operationalMetric.getFile(),
                            e);
                      }
                    },
                    EXECUTOR);
              } catch (Exception e) {
                // Ingestion must succeed at all costs, don't any errors around operational metric
                // publishing crash the streaming task
                log.warn(
                    "Unable to publish operational metric for file {}. Skippling",
                    operationalMetric.getFile(),
                    e);
              }
            });
    producer.flush();
  }
}
