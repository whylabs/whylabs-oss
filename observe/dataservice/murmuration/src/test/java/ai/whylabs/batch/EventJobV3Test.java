package ai.whylabs.batch;

import static ai.whylabs.core.configV3.structure.Analyzers.DriftConfig.Algorithm.hellinger;
import static ai.whylabs.core.configV3.structure.Analyzers.DriftConfig.Algorithm.kl_divergence;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.testng.Assert.*;
import static org.testng.AssertJUnit.assertEquals;

import ai.whylabs.batch.MapFunctions.EveryAnomalyModeFilter;
import ai.whylabs.batch.jobs.EventsJobV3;
import ai.whylabs.batch.jobs.WhylogDeltalakeWriterJob;
import ai.whylabs.batch.udfs.ConfigVersionSelector;
import ai.whylabs.batch.utils.FillMissingColumns;
import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.*;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.actions.EmailAction;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.Granularity;
import ai.whylabs.core.enums.MonitorRunStatus;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.AlertThreshold.MinMax;
import ai.whylabs.core.predicatesV3.inclusion.ActiveMonitorFeaturePredicate;
import ai.whylabs.core.predicatesV3.inclusion.FeaturePredicate;
import ai.whylabs.core.predicatesV3.inclusion.SchedulePredicate;
import ai.whylabs.core.predicatesV3.segment.MatchingSegmentFactory;
import ai.whylabs.core.predicatesV3.segment.OverallSegmentPredicate;
import ai.whylabs.core.predicatesV3.segment.SegmentPredicate;
import ai.whylabs.core.predicatesV3.segment.TargetSegmentPredicate;
import ai.whylabs.core.predicatesV3.validation.RequiredTopLevelFieldsCheck;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.*;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult.Fields;
import ai.whylabs.core.utils.ConfigAwsSdk;
import ai.whylabs.core.utils.SegmentUtils;
import ai.whylabs.druid.whylogs.column.DatasetMetrics;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.module.jsonSchema.JsonSchema;
import com.fasterxml.jackson.module.jsonSchema.factories.SchemaFactoryWrapper;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import io.delta.tables.DeltaTable;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.spark.api.java.function.ForeachFunction;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;
import org.hamcrest.number.IsCloseTo;
import org.joda.time.DateTimeZone;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;
import scala.Tuple2;

@Slf4j
public class EventJobV3Test extends BaseTest {

  private MonitorConfigV3 monitorConfigV3;
  private Segment overall;
  private Segment targeted;

  /**
   * Under the rubrik of "be liberal in what you accept, conservative in what you produce", check
   * that all the MonitorConfigV3 JSON consumed in this class strictly conform with expectations.
   */
  @BeforeClass
  public void enableStrictParsing() {
    MonitorConfigV3JsonSerde.enableStrictParsing();
  }

  @Test
  public void testConfigParseHourlyCadence() {
    String json =
        "{\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-29\",\n"
            + "  \"granularity\": \"hourly\",\n"
            + "  \"metadata\": {\n"
            + "    \"schemaVersion\": 1,\n"
            + "    \"author\": \"WhyLabs System\",\n"
            + "    \"updatedTimestamp\": 1661280684058,\n"
            + "    \"version\": 26\n"
            + "  },\n"
            + "  \"entitySchema\": {\n"
            + "    \"metadata\": {\n"
            + "      \"author\": \"system\",\n"
            + "      \"version\": 2,\n"
            + "      \"updatedTimestamp\": 1660671737416\n"
            + "    },\n"
            + "    \"columns\": {\n"
            + "      \"item.pet_breed_id\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.modifiers.3.type\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"quantity\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.modifiers.0.type\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.modifiers.2.type\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.modifiers.0.value\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.modifiers.3.value\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"unit_price\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"buyout\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"time_left\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"string\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.modifiers.1.type\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.modifiers.1.value\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.context\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.modifiers.2.value\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.id\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.pet_species_id\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"id\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.pet_quality_id\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"bid\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"item.pet_level\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"Brand\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"dataType\": \"string\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"Price\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"integral\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      }\n"
            + "    }\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"config\": {\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"baseline\": {\n"
            + "          \"size\": 7,\n"
            + "          \"type\": \"TrailingWindow\"\n"
            + "        },\n"
            + "        \"metric\": \"frequent_items\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"threshold\": 0.7,\n"
            + "        \"type\": \"drift\"\n"
            + "      },\n"
            + "      \"id\": \"frequent-items-drift-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"include\": [\n"
            + "          \"group:discrete\"\n"
            + "        ],\n"
            + "        \"exclude\": [\n"
            + "          \"group:output\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"type\": \"column\"\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658525303133,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"config\": {\n"
            + "        \"baseline\": {\n"
            + "          \"size\": 7,\n"
            + "          \"type\": \"TrailingWindow\"\n"
            + "        },\n"
            + "        \"factor\": 3,\n"
            + "        \"metric\": \"count_null_ratio\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"type\": \"stddev\"\n"
            + "      },\n"
            + "      \"id\": \"missing-values-ratio-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"type\": \"column\"\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658525308769,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"config\": {\n"
            + "        \"baseline\": {\n"
            + "          \"size\": 7,\n"
            + "          \"type\": \"TrailingWindow\"\n"
            + "        },\n"
            + "        \"factor\": 3,\n"
            + "        \"metric\": \"unique_est_ratio\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"type\": \"stddev\"\n"
            + "      },\n"
            + "      \"id\": \"unique-estimate-ratio-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"type\": \"column\"\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658525311162,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"config\": {\n"
            + "        \"baseline\": {\n"
            + "          \"size\": 7,\n"
            + "          \"type\": \"TrailingWindow\"\n"
            + "        },\n"
            + "        \"metric\": \"inferred_data_type\",\n"
            + "        \"operator\": \"eq\",\n"
            + "        \"type\": \"comparison\"\n"
            + "      },\n"
            + "      \"id\": \"inferred-data-type-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"type\": \"column\"\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658525315419,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"config\": {\n"
            + "        \"baseline\": {\n"
            + "          \"size\": 30,\n"
            + "          \"type\": \"TrailingWindow\"\n"
            + "        },\n"
            + "        \"factor\": 3,\n"
            + "        \"metric\": \"count_null_ratio\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"type\": \"stddev\"\n"
            + "      },\n"
            + "      \"id\": \"missing-values-ratio-30-trailing-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"type\": \"column\"\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658526626328,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"config\": {\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"baseline\": {\n"
            + "          \"size\": 7,\n"
            + "          \"type\": \"TrailingWindow\"\n"
            + "        },\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"threshold\": 0.7,\n"
            + "        \"type\": \"drift\"\n"
            + "      },\n"
            + "      \"id\": \"numerical-drift-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"include\": [\n"
            + "          \"group:continuous\"\n"
            + "        ],\n"
            + "        \"exclude\": [\n"
            + "          \"group:output\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"type\": \"column\"\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658526651748,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"spotless-black-pig-2205-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"hourly\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"bid\",\n"
            + "          \"buyout\",\n"
            + "          \"item.context\",\n"
            + "          \"item.id\",\n"
            + "          \"item.modifiers.0.value\",\n"
            + "          \"item.modifiers.1.value\",\n"
            + "          \"item.pet_species_id\",\n"
            + "          \"quantity\",\n"
            + "          \"unit_price\"\n"
            + "        ],\n"
            + "        \"exclude\": [],\n"
            + "        \"segments\": []\n"
            + "      },\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 14\n"
            + "        },\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"threshold\": 0.7\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1659545208781,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"ugly-firebrick-fly-9981-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"hourly\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"bid\",\n"
            + "          \"buyout\",\n"
            + "          \"item.context\",\n"
            + "          \"item.id\",\n"
            + "          \"item.modifiers.0.value\",\n"
            + "          \"item.modifiers.1.value\",\n"
            + "          \"item.pet_species_id\",\n"
            + "          \"quantity\",\n"
            + "          \"unit_price\"\n"
            + "        ],\n"
            + "        \"exclude\": [],\n"
            + "        \"segments\": []\n"
            + "      },\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 14\n"
            + "        },\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"threshold\": 0.7\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1659545613404,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"expensive-limegreen-cockroach-3273-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"hourly\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"group:discrete\"\n"
            + "        ],\n"
            + "        \"exclude\": [\n"
            + "          \"group:output\"\n"
            + "        ],\n"
            + "        \"segments\": []\n"
            + "      },\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"frequent_items\",\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 7\n"
            + "        },\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"threshold\": 0.7\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1660608775516,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": [\n"
            + "    {\n"
            + "      \"id\": \"frequent-items-drift-monitor\",\n"
            + "      \"displayName\": \"Frequent Items Drift Preset Monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"frequent-items-drift-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"EVERY_ANOMALY\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658525304265,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-values-ratio-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"missing-values-ratio-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"EVERY_ANOMALY\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658525309488,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"unique-estimate-ratio-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"unique-estimate-ratio-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"EVERY_ANOMALY\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658525311848,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"inferred-data-type-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"inferred-data-type-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"EVERY_ANOMALY\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658525316137,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-values-ratio-30-trailing-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"missing-values-ratio-30-trailing-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"EVERY_ANOMALY\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1658526627425,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"spotless-black-pig-2205\",\n"
            + "      \"displayName\": \"drift-monitor-9-selected-features\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"spotless-black-pig-2205-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 1,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"P1D\",\n"
            + "        \"datasetTimestampOffset\": \"P7D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1659545209473,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"ugly-firebrick-fly-9981\",\n"
            + "      \"displayName\": \"ugly-firebrick-fly-9981\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"ugly-firebrick-fly-9981-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 1,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"P1D\",\n"
            + "        \"datasetTimestampOffset\": \"P7D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1659545614215,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"expensive-limegreen-cockroach-3273\",\n"
            + "      \"displayName\": \"expensive-limegreen-cockroach-3273\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"expensive-limegreen-cockroach-3273-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 3,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"P1D\",\n"
            + "        \"datasetTimestampOffset\": \"P7D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1660608776311,\n"
            + "        \"version\": 1\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"numerical-drift-monitor\",\n"
            + "      \"displayName\": \"Numerical Drift Preset Monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"numerical-drift-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"cadence\": \"hourly\",\n"
            + "        \"type\": \"fixed\"\n"
            + "      },\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"EVERY_ANOMALY\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"email\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"slack\"\n"
            + "        }\n"
            + "      ],\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"updatedTimestamp\": 1661209962872,\n"
            + "        \"version\": 3\n"
            + "      }\n"
            + "    }\n"
            + "  ]\n"
            + "}";
    val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    assertEquals("hourly", conf.getGranularity().toString());
  }

  @Test
  public void testModel303ConfigEnabled() throws IOException {
    String json =
        "{\n"
            + "  \"id\": \"demo-document\",\n"
            + "  \"orgId\": \"org-11\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"columns\": {\n"
            + "      \"annual_inc\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"fractional\"\n"
            + "      },\n"
            + "      \"prediction\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"classifier\": \"output\",\n"
            + "        \"dataType\": \"integral\"\n"
            + "      }\n"
            + "    }\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"missing_upload_analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 * * * *\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"dataset\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          },\n"
            + "          {\n"
            + "            \"tags\": [{\"key\" : \"purpose\", \"value\": \"small_business\"}]\n"
            + "          }\n"
            + "        ]\n"
            + "      },\n"
            + "      \"config\": {\n"
            + "        \"version\": 1,\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"metric\": \"secondsSinceLastUpload\",\n"
            + "        \"lower\":0,\n"
            + "        \"upper\": 86400000\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing_datapoint_analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 * * * *\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"dataset\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          },\n"
            + "          {\n"
            + "            \"tags\": [{\"key\" : \"purpose\", \"value\": \"small_business\"}]\n"
            + "          }\n"
            + "        ]\n"
            + "      },\n"
            + "      \"dataReadinessDuration\": \"PT4H\",\n"
            + "      \"config\": {\n"
            + "        \"version\": 1,\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"metric\": \"missingDatapoint\",\n"
            + "        \"upper\": 0\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"drift_analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 * * * *\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          },\n"
            + "          {\n"
            + "            \"tags\": [{\"key\" : \"purpose\", \"value\": \"small_business\"}]\n"
            + "          }\n"
            + "        ],\n"
            + "        \"batchOffset\": 1,\n"
            + "        \"maxDelayBatchCount\": 14\n"
            + "      },\n"
            + "      \"config\": {\n"
            + "        \"version\": 1,\n"
            + "        \"type\": \"stddev\",\n"
            + "        \"metric\": \"median\",\n"
            + "        \"factor\": 5,\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\"\n"
            + "        }\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": [\n"
            + "    {\n"
            + "      \"id\": \"drift-monitor-1\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"drift_analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 0 * * * *\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"severity\": 2,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"EVERY_ANOMALY\",\n"
            + "        \"filter\": {\n"
            + "          \"excludeColumns\": [\n"
            + "            \"unimportant\"\n"
            + "          ]\n"
            + "        }\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"email\",\n"
            + "          \"target\": \"demo@whylabs.ai\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"slack\",\n"
            + "          \"target\": \"https://demo.com\"\n"
            + "        }\n"
            + "      ]\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"drift-monitor-2\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"drift_analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 0 * * * *\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"severity\": 2,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"filter\": {\n"
            + "          \"excludeColumns\": [\n"
            + "            \"unimportant\"\n"
            + "          ]\n"
            + "        }\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"email\",\n"
            + "          \"target\": \"demo@whylabs.ai\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"slack\",\n"
            + "          \"target\": \"https://demo.com\"\n"
            + "        }\n"
            + "      ]\n"
            + "    }\n"
            + "  ]\n"
            + "}";
    val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    assertTrue(conf.getAnalyzers().size() > 0);
    val aprilFirst = ZonedDateTime.of(2022, 4, 5, 0, 0, 0, 0, ZoneOffset.UTC);
    assertTrue(conf.getAnalyzers().get(0).getSchedule().isMatch(aprilFirst));
    assertTrue(new RequiredTopLevelFieldsCheck().test(conf));

    val activeMonitorPredicate = new ActiveMonitorFeaturePredicate(aprilFirst);
    assertTrue(activeMonitorPredicate.test(conf, DatasetMetrics.DATASET_METRICS));
    for (val analyzer : conf.getAnalyzers()) {
      if (analyzer.getId().equals("drift_analyzer")) {
        // Make sure we fall back to 7 when size is null
        assertEquals(
            Optional.of(7),
            Optional.of(
                analyzer
                    .getBaseline()
                    .getExpectedBaselineDatapoints(
                        ai.whylabs.core.configV3.structure.enums.Granularity.daily)));
      }
    }
  }

  @Test
  public void testFixedCadenceSchedule() {
    val hourly =
        FixedCadenceSchedule.builder()
            .cadence(ai.whylabs.core.configV3.structure.enums.Granularity.hourly)
            .build();
    val daily =
        FixedCadenceSchedule.builder()
            .cadence(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .build();
    val weekly =
        FixedCadenceSchedule.builder()
            .cadence(ai.whylabs.core.configV3.structure.enums.Granularity.weekly)
            .build();
    val monthly =
        FixedCadenceSchedule.builder()
            .cadence(ai.whylabs.core.configV3.structure.enums.Granularity.monthly)
            .build();

    val aprilFirst = ZonedDateTime.of(2022, 4, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    val aprilSecond = ZonedDateTime.of(2022, 4, 2, 0, 0, 0, 0, ZoneOffset.UTC);
    val monday = ZonedDateTime.of(2022, 4, 4, 0, 0, 0, 0, ZoneOffset.UTC);
    val twoPm = ZonedDateTime.of(2022, 4, 4, 14, 0, 0, 0, ZoneOffset.UTC);

    assertTrue(weekly.isMatch(monday));
    assertFalse(weekly.isMatch(aprilSecond));
    assertFalse(weekly.isMatch(twoPm));

    assertTrue(daily.isMatch(monday));
    assertTrue(daily.isMatch(aprilSecond));
    assertTrue(daily.isMatch(aprilFirst));
    assertFalse(daily.isMatch(twoPm));

    assertTrue(hourly.isMatch(monday));
    assertTrue(hourly.isMatch(aprilSecond));
    assertTrue(hourly.isMatch(aprilFirst));
    assertTrue(hourly.isMatch(twoPm));

    assertTrue(monthly.isMatch(aprilFirst));
    assertFalse(monthly.isMatch(aprilSecond));
    assertFalse(monthly.isMatch(twoPm));
  }

  @Test
  public void testMonitorRun() {
    val request =
        AnalyzerRun.builder()
            .orgId("org-0")
            .datasetId("model-0")
            .status(MonitorRunStatus.REQUESTED)
            .build();
    val success =
        AnalyzerRun.builder()
            .orgId("org-0")
            .datasetId("model-0")
            .status(MonitorRunStatus.COMPLETED)
            .startedTs(System.currentTimeMillis())
            .completedTs(System.currentTimeMillis())
            .build();
    System.out.println(request);
    System.out.println(success);
  }

  @SneakyThrows
  @Test
  public void testSchema() {
    String json =
        "{\n"
            + "  \"id\": \"demo-document\",\n"
            + "  \"orgId\": \"org-11\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"columns\": {\n"
            + "      \"annual_inc\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"fractional\"\n"
            + "      },\n"
            + "      \"prediction\": {\n"
            + "        \"discreteness\": \"discrete\",\n"
            + "        \"classifier\": \"output\",\n"
            + "        \"dataType\": \"integral\"\n"
            + "      }\n"
            + "    }\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"drift_analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 * * * * *\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ],\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"batchOffset\": 1,\n"
            + "        \"maxDelayBatchCount\": 14\n"
            + "      },\n"
            + "      \"config\": {\n"
            + "        \"version\": 1,\n"
            + "        \"type\": \"stddev\",\n"
            + "        \"metric\": \"median\",\n"
            + "        \"factor\": 5,\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 14\n"
            + "        }\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": [\n"
            + "    {\n"
            + "      \"id\": \"drift-monior-1\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"drift_analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 0 * * * *\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"severity\": 2,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"EVERY_ANOMALY\",\n"
            + "        \"filter\": {\n"
            + "          \"excludeColumns\": [\n"
            + "            \"unimportant\"\n"
            + "          ]\n"
            + "        }\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"email\",\n"
            + "          \"target\": \"demo@whylabs.ai\"\n"
            + "        },\n"
            + "        {\n"
            + "          \"type\": \"slack\",\n"
            + "          \"target\": \"https://demo.com\"\n"
            + "        }\n"
            + "      ]\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    System.out.println(json);
    val m = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    System.out.println(m);
  }

  @Test
  public void testConfigVersionSelector() {
    ConfigVersionSelector selector = new ConfigVersionSelector(false);
    long datasetTs = 3;

    // Modifed config == datasetTs, use it
    Long[] configUpdateBins = {0L, 1L, 2L, 3L, 4L, 5L};
    assertEquals(
        Optional.of(3L),
        Optional.of(selector.getTargetConfigBin(datasetTs, Arrays.asList(configUpdateBins))));

    // Round down to most recent config prior to dataset ts
    Long[] bins2 = {0L, 1L, 2L, 4L, 5L};
    assertEquals(
        Optional.of(2L), Optional.of(selector.getTargetConfigBin(datasetTs, Arrays.asList(bins2))));

    // Override mode
    ConfigVersionSelector latestSelector = new ConfigVersionSelector(true);
    assertEquals(
        Optional.of(5L),
        Optional.of(latestSelector.getTargetConfigBin(datasetTs, Arrays.asList(bins2))));

    // Only 1 config version, use it
    Long[] bins3 = {5L};
    assertEquals(
        Optional.of(5L), Optional.of(selector.getTargetConfigBin(datasetTs, Arrays.asList(bins3))));

    // Multiple subsequent config edits dated after the dataset ts, use the oldest
    Long[] bins4 = {4L, 5L};
    assertEquals(
        Optional.of(4L), Optional.of(selector.getTargetConfigBin(datasetTs, Arrays.asList(bins4))));
  }

  @Test
  public void initDefaultConfig() throws JsonProcessingException {
    overall = Segment.builder().build();
    targeted =
        Segment.builder()
            .tags(Arrays.asList(Tag.builder().key("house").value("blue").build()))
            .build();

    ColumnSchema featureMetadata =
        ColumnSchema.builder()
            .classifier(Classifier.input)
            .discreteness(DiscretenessType.discrete)
            .build();

    ColumnSchema featureMetadata2 =
        ColumnSchema.builder()
            .classifier(Classifier.input)
            .discreteness(DiscretenessType.continuous)
            .build();

    EmailAction emailAction = EmailAction.builder().build();

    val baseline = TrailingWindowBaseline.builder().size(7).build();
    val baselineArima = TrailingWindowBaseline.builder().size(30).build();

    List<Analyzer> analyzers = new ArrayList<>();
    analyzers.add(
        Analyzer.builder()
            .id("unique_analyzer_1")
            .disabled(false)
            .config(
                ComparisonConfig.builder()
                    .metric(AnalysisMetric.inferred_data_type.name())
                    .operator("eq")
                    .baseline(baseline)
                    .version(1)
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    // Unique
    val unique =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .actions(Arrays.asList(emailAction))
            .analyzerIds(Arrays.asList("unique_analyzer_1"))
            .build();

    analyzers.add(
        Analyzer.builder()
            .id("datatype_drift_analyzer_1")
            .disabled(false)
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    // Datatype
    val dataType =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .actions(Arrays.asList(emailAction))
            .analyzerIds(Arrays.asList("datatype_drift_analyzer_1"))
            .build();

    analyzers.add(
        Analyzer.builder()
            .id("distance_analyzer_1")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .baseline(baseline)
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .threshold(.7)
                    .version(1)
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());
    // Distance: Histogram
    val distanceHistogram =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .actions(Arrays.asList(emailAction))
            .analyzerIds(Arrays.asList("distance_analyzer_1"))
            .build();

    analyzers.add(
        Analyzer.builder()
            .id("top_k_distance_analyzer_1")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .baseline(baseline)
                    .metric(AnalysisMetric.frequent_items.name())
                    .algorithm(kl_divergence)
                    .threshold(.7)
                    .version(1)
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    // Distance: Freq Items
    val distanceFrequentItems =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .actions(Arrays.asList(emailAction))
            .analyzerIds(Arrays.asList("top_k_distance_analyzer_1"))
            .build();

    analyzers.add(
        Analyzer.builder()
            .id("missing_value_1")
            .disabled(false)
            .config(
                ComparisonConfig.builder()
                    .expected(ExpectedValue.builder().stringValue("discrete").build())
                    .version(1)
                    .baseline(baseline)
                    .metric(AnalysisMetric.field_list.name())
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());
    val missingValuesNullRatio =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .actions(Arrays.asList(emailAction))
            .analyzerIds(Arrays.asList("missing_value_1"))
            .build();

    // ARIMA
    analyzers.add(
        Analyzer.builder()
            .id("predicted_arima_1")
            .disabled(false)
            .config(
                SeasonalConfig.builder()
                    .maxUpperThreshold(1.0)
                    .minLowerThreshold(0.0)
                    .baseline(baselineArima)
                    .metric(AnalysisMetric.median.name())
                    .schemaVersion(1)
                    .build())
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("*"))
                    .exclude(Arrays.asList("acc_now_delinq"))
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    val arima =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .actions(Arrays.asList(emailAction))
            .analyzerIds(Arrays.asList("predicted_arima_1"))
            .build();

    // Model Perf
    val modelPerformance =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .actions(Arrays.asList(emailAction))
            .analyzerIds(Arrays.asList("model_performance_metric_1"))
            .build();

    // Missing data
    // Unique
    val missingData =
        Monitor.builder()
            .id(UUID.randomUUID().toString())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .actions(Arrays.asList(emailAction))
            .analyzerIds(Arrays.asList("missing_data_analyzer_1"))
            .build();
    Monitor.builder().schedule(CronSchedule.builder().cron("0 * * * *").build()).build();

    analyzers.add(
        Analyzer.builder()
            .id("missing_data_analyzer_1")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .version(1)
                    .build())
            .targetMatrix(
                DatasetMatrix.builder().segments(Arrays.asList(overall, targeted)).build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    monitorConfigV3 =
        MonitorConfigV3.builder()
            .orgId("org-11")
            .id(UUID.randomUUID().toString())
            .updatedTs(System.currentTimeMillis())
            .datasetId("model-0")
            .schemaVersion(3)
            .analyzers(analyzers)
            .monitors(
                Arrays.asList(
                    dataType,
                    modelPerformance,
                    arima,
                    distanceHistogram,
                    distanceFrequentItems,
                    missingValuesNullRatio,
                    unique))
            .entitySchema(
                EntitySchema.builder()
                    .columns(
                        ImmutableMap.of(
                            "bc_util",
                            featureMetadata,
                            "collection_recovery_fee",
                            featureMetadata2))
                    .build())
            .build();

    monitorConfigV3.setGranularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily);

    String json = MonitorConfigV3JsonSerde.toString(monitorConfigV3);
    System.out.println(json);
    MonitorConfigV3 confReadBack = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);

    assertTrue(
        new FeaturePredicate()
            .test(
                analyzers.get(0),
                MonitorConfigV3Utils.getSchemaIfPresent(monitorConfigV3, "bc_util"),
                "bc_util",
                null));
    assertTrue(
        new FeaturePredicate()
            .test(
                confReadBack.getAnalyzers().get(0),
                MonitorConfigV3Utils.getSchemaIfPresent(monitorConfigV3, "collection_recovery_fee"),
                "collection_recovery_fee",
                null));
    assertFalse(
        new FeaturePredicate()
            .test(
                confReadBack.getAnalyzers().get(0),
                MonitorConfigV3Utils.getSchemaIfPresent(monitorConfigV3, "acc_now_delinq"),
                "acc_now_delinq",
                null));
    // Ok whitelist monitoring just for bc_util, make sure things work without any wildcard
    ((ColumnMatrix) (confReadBack.getAnalyzers().get(0).getTarget()))
        .setInclude(Arrays.asList("bc_util"));
    assertTrue(
        new FeaturePredicate()
            .test(
                confReadBack.getAnalyzers().get(0),
                MonitorConfigV3Utils.getSchemaIfPresent(monitorConfigV3, "bc_util"),
                "bc_util",
                null));
    assertFalse(
        new FeaturePredicate()
            .test(
                confReadBack.getAnalyzers().get(0),
                MonitorConfigV3Utils.getSchemaIfPresent(monitorConfigV3, "acc_now_delinq"),
                "acc_now_delinq",
                null));
    assertFalse(
        new FeaturePredicate()
            .test(
                confReadBack.getAnalyzers().get(0),
                MonitorConfigV3Utils.getSchemaIfPresent(monitorConfigV3, "collection_recovery_fee"),
                "collection_recovery_fee",
                null));

    Arrays.asList(overall, targeted);

    Tag t1 = new Tag();
    t1.setKey("house");
    t1.setValue("blue");

    Tag t2 = new Tag();
    t2.setKey("city");
    t2.setValue("durham");

    assertFalse(new SegmentPredicate().test(overall, Arrays.asList(t1)).isPresent());
    assertTrue(new SegmentPredicate().test(targeted, Arrays.asList(t1)).isPresent());
    assertEquals(1, new SegmentPredicate().test(targeted, Arrays.asList(t1, t2)).get().size());
    assertFalse(new SegmentPredicate().test(overall, Arrays.asList(t1)).isPresent());
    assertTrue(new OverallSegmentPredicate().test(overall));
    assertFalse(new OverallSegmentPredicate().test(targeted));

    val doubleWildcardConfig =
        Segment.builder()
            .tags(
                Arrays.asList(
                    Tag.builder().key("house").value("*").build(),
                    Tag.builder().key("city").value("*").build()))
            .build();
    assertEquals(
        2, new SegmentPredicate().test(doubleWildcardConfig, Arrays.asList(t1, t2)).get().size());
  }

  @Test
  public void testSegmentMatch() throws JsonProcessingException {
    // analyzer config targets "purpose=car & verification_status=Not Verified"
    //
    // model has tags "purpose=car", "verification_status=Not Verified", "verification_status=Source
    // Verified"
    //
    // SegmentPredicate().test says no matches.

    val configSegment =
        Segment.builder()
            .tags(
                Arrays.asList(
                    Tag.builder().key("purpose").value("car").build(),
                    Tag.builder().key("verification_status").value("Not Verified").build()))
            .build();
    val modelTags =
        Arrays.asList(
            Tag.builder().key("purpose").value("car").build(),
            Tag.builder().key("verification_status").value("Not Verified").build(),
            Tag.builder().key("verification_status").value("Source Verified").build());
    Optional<List<Tag>> matches = new SegmentPredicate().test(configSegment, modelTags);
    assertTrue(matches.isPresent());
    assertEquals(2, matches.get().size());

    // now add a wildcard in the target config.  Expect the wildcard to match an additional tag form
    // the profile segments.
    val wildcardSegment =
        Segment.builder()
            .tags(
                Arrays.asList(
                    Tag.builder().key("purpose").value("car").build(),
                    Tag.builder().key("verification_status").value("*").build()))
            .build();
    matches = new SegmentPredicate().test(wildcardSegment, modelTags);
    assertTrue(matches.isPresent());
    assertEquals(3, matches.get().size());
  }

  @Test
  public void testSegmentWildcardsExplode() {}

  @Test
  public void testSegmentWildcards() {
    // Won't Match b/c city tag isn't present
    Tag t1 = new Tag();
    t1.setKey("house");
    t1.setValue("blue");

    // Match
    Tag t2 = new Tag();
    t2.setKey("city");
    t2.setValue("durham");

    // Match
    Tag t3 = new Tag();
    t3.setKey("city");
    t3.setValue("seattle");

    val testSegment =
        Segment.builder().tags(Arrays.asList(Tag.builder().key("city").value("*").build())).build();

    val monitorConfigV3 =
        MonitorConfigV3.builder()
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .targetMatrix(
                            ColumnMatrix.builder().segments(Arrays.asList(testSegment)).build())
                        .build()))
            .build();

    val matching =
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
            monitorConfigV3.getAnalyzers(), Arrays.asList(t1, t2));
    assertEquals(1, matching.size());
    assertEquals("city=durham", matching.keySet().toArray()[0]);

    val matching2 =
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
            monitorConfigV3.getAnalyzers(), Arrays.asList(t1));
    assertEquals(0, matching2.size());

    val matching3 =
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
            monitorConfigV3.getAnalyzers(), Arrays.asList(t1, t3));
    assertEquals(1, matching3.size());
    assertEquals("city=seattle", matching3.keySet().toArray()[0]);
  }

  @Test
  public void testMultiTagSegmentWildcards() {
    // Won't Match b/c city tag isn't present
    Tag t1 = new Tag();
    t1.setKey("house");
    t1.setValue("blue");

    // Match
    Tag t2 = new Tag();
    t2.setKey("city");
    t2.setValue("durham");

    // Match
    Tag t3 = new Tag();
    t3.setKey("city");
    t3.setValue("seattle");

    val testSegment =
        Segment.builder()
            .tags(
                Arrays.asList(
                    Tag.builder().key("house").value("*").build(),
                    Tag.builder().key("city").value("*").build()))
            .build();

    val monitorConfigV3 =
        MonitorConfigV3.builder()
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .targetMatrix(
                            ColumnMatrix.builder().segments(Arrays.asList(testSegment)).build())
                        .build()))
            .build();

    val matching =
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
            monitorConfigV3.getAnalyzers(), Arrays.asList(t1, t2));
    assertEquals(1, matching.size());
    assertEquals("city=durham&house=blue", matching.keySet().toArray()[0]);

    // Missing tag
    val matching2 =
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
            monitorConfigV3.getAnalyzers(), Arrays.asList(t1));
    assertEquals(0, matching2.size());

    // Missing tag
    val matching3 =
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
            monitorConfigV3.getAnalyzers(), Arrays.asList(t2));
    assertEquals(0, matching3.size());

    val matching4 =
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
            monitorConfigV3.getAnalyzers(), Arrays.asList(t1, t3));
    assertEquals(1, matching4.size());
    assertEquals("city=seattle&house=blue", matching4.keySet().toArray()[0]);
  }

  @Test
  public void testDatasetLevelSegment() {
    Tag t1 = new Tag();
    t1.setKey("house");
    t1.setValue("blue");

    Tag t2 = new Tag();
    t2.setKey("city");
    t2.setValue("durham");

    Tag t3 = new Tag();
    t3.setKey("city");
    t3.setValue("seattle");

    val targetSegmentPredicate = new TargetSegmentPredicate();
    val overallDatasetMatrix = DatasetMatrix.builder().segments(Arrays.asList()).build();
    val overallColumnMatrix = ColumnMatrix.builder().segments(Arrays.asList()).build();

    val segmentedRow =
        new QueryResultStructure(
            ExplodedRow.builder()
                .segmentText(SegmentUtils.toStringV3(Arrays.asList(t1, t2)))
                .build(),
            null);
    val overallRow = new QueryResultStructure(ExplodedRow.builder().segmentText("").build(), null);
    assertFalse(
        targetSegmentPredicate.test(
            segmentedRow, Analyzer.builder().targetMatrix(overallDatasetMatrix).build()));
    assertFalse(
        targetSegmentPredicate.test(
            segmentedRow, Analyzer.builder().targetMatrix(overallColumnMatrix).build()));

    val nullDatasetMatrix = DatasetMatrix.builder().build();
    val nullColumnMatrix = ColumnMatrix.builder().build();
    assertFalse(
        targetSegmentPredicate.test(
            segmentedRow, Analyzer.builder().targetMatrix(nullDatasetMatrix).build()));
    assertFalse(
        targetSegmentPredicate.test(
            segmentedRow, Analyzer.builder().targetMatrix(nullColumnMatrix).build()));

    assertTrue(
        targetSegmentPredicate.test(
            overallRow, Analyzer.builder().targetMatrix(overallDatasetMatrix).build()));

    assertTrue(
        targetSegmentPredicate.test(
            overallRow, Analyzer.builder().targetMatrix(overallColumnMatrix).build()));
    assertTrue(
        targetSegmentPredicate.test(
            overallRow, Analyzer.builder().targetMatrix(nullColumnMatrix).build()));
    assertTrue(
        targetSegmentPredicate.test(
            overallRow, Analyzer.builder().targetMatrix(nullDatasetMatrix).build()));

    // Both include and exclude the overall segment
    assertFalse(
        targetSegmentPredicate.test(
            overallRow,
            Analyzer.builder()
                .targetMatrix(
                    DatasetMatrix.builder()
                        .segments(Arrays.asList())
                        .excludeSegments(Arrays.asList())
                        .build())
                .build()));

    // Exclude a very specific segment
    val segmentRow1 =
        new QueryResultStructure(
            ExplodedRow.builder().segmentText("house=blue&city=durham").build(), null);
    val segmentRow2 =
        new QueryResultStructure(
            ExplodedRow.builder().segmentText("house=blue&city=seattle").build(), null);
    val abcd =
        DatasetMatrix.builder()
            .segments(Arrays.asList(Segment.builder().tags(Arrays.asList(t1, t2)).build()))
            .excludeSegments(Arrays.asList(Segment.builder().tags(Arrays.asList(t1, t3)).build()))
            .build();

    assertTrue(
        targetSegmentPredicate.test(segmentRow1, Analyzer.builder().targetMatrix(abcd).build()));
    assertFalse(
        targetSegmentPredicate.test(segmentRow2, Analyzer.builder().targetMatrix(abcd).build()));

    assertFalse(
        targetSegmentPredicate.test(overallRow, Analyzer.builder().targetMatrix(abcd).build()));

    // Exclude the overall row but target some segmented rows
    val excludeOverall =
        DatasetMatrix.builder()
            .segments(Arrays.asList(Segment.builder().tags(Arrays.asList(t1, t2)).build()))
            .excludeSegments(Arrays.asList(Segment.builder().tags(Arrays.asList()).build()))
            .build();
    assertTrue(
        targetSegmentPredicate.test(
            segmentRow1, Analyzer.builder().targetMatrix(excludeOverall).build()));
    assertFalse(
        targetSegmentPredicate.test(
            segmentRow2, Analyzer.builder().targetMatrix(excludeOverall).build()));

    assertFalse(
        targetSegmentPredicate.test(
            overallRow, Analyzer.builder().targetMatrix(excludeOverall).build()));
  }

  @Test
  public void testMultiTagSegmentation() {
    // Match
    Tag t1 = new Tag();
    t1.setKey("house");
    t1.setValue("blue");

    Tag t2 = new Tag();
    t2.setKey("city");
    t2.setValue("durham");

    // Wont match
    Tag t3 = new Tag();
    t3.setKey("city");
    t3.setValue("seattle");

    val testSegment =
        Segment.builder()
            .tags(
                Arrays.asList(
                    Tag.builder().key("house").value("blue").build(),
                    Tag.builder().key("city").value("durham").build()))
            .build();

    Map<String, Double> durhamWeights = new HashMap<>();
    durhamWeights.put("a", .3);
    durhamWeights.put("b", .4);

    Map<String, Double> seattleWeights = new HashMap<>();
    seattleWeights.put("a", .5);
    seattleWeights.put("b", .6);

    Map<String, Double> defaultWeights = new HashMap<>();
    defaultWeights.put("default", 1.0);
    defaultWeights.put("a", 1.0);
    defaultWeights.put("b", 1.0);

    val monitorConfigV3 =
        MonitorConfigV3.builder()
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .targetMatrix(
                            ColumnMatrix.builder().segments(Arrays.asList(testSegment)).build())
                        .build()))
            .weightConfig(
                WeightConfig.builder()
                    .defaultWeights(Weights.builder().weights(defaultWeights).build())
                    .segmentWeights(
                        Arrays.asList(
                            // Durham
                            SegmentWeightConfig.builder()
                                .segment(Arrays.asList(t2))
                                .weights(durhamWeights)
                                .build(),
                            // Seattle
                            SegmentWeightConfig.builder()
                                .segment(Arrays.asList(t3))
                                .weights(seattleWeights)
                                .build()))
                    .build())
            .build();

    val targetSegmentPredicate = new TargetSegmentPredicate();
    val matrix = ColumnMatrix.builder().segments(Arrays.asList(testSegment)).build();
    assertTrue(
        targetSegmentPredicate.test(
            new QueryResultStructure(
                ExplodedRow.builder()
                    .segmentText(SegmentUtils.toStringV3(Arrays.asList(t1, t2)))
                    .build(),
                null),
            Analyzer.builder().targetMatrix(matrix).build()));
    assertFalse(
        targetSegmentPredicate.test(
            new QueryResultStructure(
                ExplodedRow.builder()
                    .segmentText(SegmentUtils.toStringV3(Arrays.asList(t1, t3)))
                    .build(),
                null),
            Analyzer.builder().targetMatrix(matrix).build()));

    // Durham
    assertThat(
        MatchingSegmentFactory.getFieldWeight(
            monitorConfigV3, new Segment(Arrays.asList(t2)), "default"),
        IsCloseTo.closeTo(1.0, 0.01));

    assertThat(
        MatchingSegmentFactory.getFieldWeight(monitorConfigV3, new Segment(Arrays.asList(t2)), "a"),
        IsCloseTo.closeTo(.3, 0.01));

    assertThat(
        MatchingSegmentFactory.getFieldWeight(monitorConfigV3, new Segment(Arrays.asList(t2)), "b"),
        IsCloseTo.closeTo(.4, 0.01));

    // Seattle
    assertThat(
        MatchingSegmentFactory.getFieldWeight(
            monitorConfigV3, new Segment(Arrays.asList(t3)), "default"),
        IsCloseTo.closeTo(1.0, 0.01));

    assertThat(
        MatchingSegmentFactory.getFieldWeight(monitorConfigV3, new Segment(Arrays.asList(t3)), "a"),
        IsCloseTo.closeTo(.5, 0.01));

    assertThat(
        MatchingSegmentFactory.getFieldWeight(monitorConfigV3, new Segment(Arrays.asList(t3)), "b"),
        IsCloseTo.closeTo(.6, 0.01));

    // Irrelevant segment
    assertThat(
        MatchingSegmentFactory.getFieldWeight(monitorConfigV3, new Segment(Arrays.asList(t1)), "a"),
        IsCloseTo.closeTo(1.0, 0.01));

    assertEquals(
        0,
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
                monitorConfigV3.getAnalyzers(), Arrays.asList(t1, t3))
            .size());
    assertEquals(
        0,
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
                monitorConfigV3.getAnalyzers(), Arrays.asList(t1))
            .size());
    assertEquals(
        0,
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
                monitorConfigV3.getAnalyzers(), Arrays.asList(t2))
            .size());

    // One must have all tags match in the segment to be considered for it
    Map<String, Segment> matching =
        MatchingSegmentFactory.getApplicableSegmentsForProfile(
            monitorConfigV3.getAnalyzers(), Arrays.asList(t1, t2));
    assertEquals(1, matching.size());
    assertEquals("city=durham&house=blue", matching.keySet().toArray()[0]);
  }

  @Test
  public void testOutputGroupPredicate() {
    val a =
        Analyzer.builder()
            .id("distance_analyzer_1")
            .disabled(false)
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("group:output"))
                    .exclude(Arrays.asList())
                    .build())
            .build();
    assertTrue(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().classifier(Classifier.output).build(),
                "collection_recovery_fee",
                null));
    assertFalse(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().classifier(Classifier.input).build(),
                "collection_recovery_fee",
                null));
  }

  @Test
  public void testGroupExclusion() {
    val a =
        Analyzer.builder()
            .id("distance_analyzer_1")
            .disabled(false)
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("a"))
                    .exclude(Arrays.asList("group:output"))
                    .build())
            .build();
    // group:output is excluded which supersedes the fact that "a" is a match
    assertFalse(
        new FeaturePredicate()
            .test(a, ColumnSchema.builder().classifier(Classifier.output).build(), "a", null));
    assertTrue(
        new FeaturePredicate()
            .test(a, ColumnSchema.builder().classifier(Classifier.input).build(), "a", null));
  }

  @Test
  public void testInputGroupPredicate() {
    val a =
        Analyzer.builder()
            .id("distance_analyzer_1")
            .disabled(false)
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("group:input"))
                    .exclude(Arrays.asList())
                    .build())
            .build();
    assertTrue(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().classifier(Classifier.input).build(),
                "collection_recovery_fee",
                null));
    assertFalse(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().classifier(Classifier.output).build(),
                "collection_recovery_fee",
                null));

    // Null scenario
    assertFalse(
        new FeaturePredicate()
            .test(a, ColumnSchema.builder().build(), "collection_recovery_fee", null));
  }

  @Test
  public void testFeatureImportancePredicate() {
    val a =
        Analyzer.builder()
            .id("distance_analyzer_1")
            .disabled(false)
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("weight>.24"))
                    .exclude(Arrays.asList())
                    .build())
            .build();

    assertFalse(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().classifier(Classifier.input).build(),
                "collection_recovery_fee",
                .22));

    assertTrue(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().classifier(Classifier.input).build(),
                "collection_recovery_fee",
                .28));
    assertFalse(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().classifier(Classifier.output).build(),
                "collection_recovery_fee",
                null));
  }

  @Test
  public void testFeatureGroupDiscretePredicate() {
    val a =
        Analyzer.builder()
            .id("distance_analyzer_1")
            .disabled(false)
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("acc_now_delinq", "group:discrete"))
                    .exclude(Arrays.asList())
                    .build())
            .build();
    assertTrue(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().discreteness(DiscretenessType.discrete).build(),
                "collection_recovery_fee",
                null));
    assertFalse(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().discreteness(DiscretenessType.continuous).build(),
                "collection_recovery_fee",
                null));

    // Null scenario
    assertFalse(
        new FeaturePredicate()
            .test(a, ColumnSchema.builder().build(), "collection_recovery_fee", null));
  }

  @Test
  public void testFeatureGroupContinuousPredicate() {
    val a =
        Analyzer.builder()
            .id("distance_analyzer_1")
            .disabled(false)
            .targetMatrix(
                ColumnMatrix.builder()
                    .segments(Arrays.asList(overall, targeted))
                    .include(Arrays.asList("acc_now_delinq", "group:continuous"))
                    .exclude(Arrays.asList())
                    .build())
            .build();
    assertFalse(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().discreteness(DiscretenessType.discrete).build(),
                "collection_recovery_fee",
                null));
    assertTrue(
        new FeaturePredicate()
            .test(
                a,
                ColumnSchema.builder().discreteness(DiscretenessType.continuous).build(),
                "collection_recovery_fee",
                null));
  }

  @Test
  public void testMinMaxPredicate() {
    assertTrue(new MinMax(null, 5.0).test(7.0));
    assertFalse(new MinMax(null, 5.0).test(4.0));
    assertTrue(new MinMax(1.0, 5.0).test(7.0));
    assertFalse(new MinMax(1.0, 5.0).test(4.0));
    assertTrue(new MinMax(4.5, 5.0).test(4.0));
    assertTrue(new MinMax(4.5, null).test(4.0));
    assertFalse(new MinMax(null, null).test(4.0));
  }

  @Test
  public void testCronPredicate() {
    val p = new SchedulePredicate();

    assertFalse(
        p.test(
            CronSchedule.builder().cron("0 * * * *").build(),
            ZonedDateTime.of(2021, 9, 22, 2, 5, 0, 0, ZoneOffset.UTC)));
    assertTrue(
        p.test(
            CronSchedule.builder().cron("0 * * * *").build(),
            ZonedDateTime.of(2021, 9, 22, 2, 0, 0, 0, ZoneOffset.UTC)));
    assertFalse(
        p.test(
            CronSchedule.builder().cron("").build(),
            ZonedDateTime.of(2021, 9, 22, 2, 5, 0, 0, ZoneOffset.UTC)));
    assertFalse(
        p.test(
            CronSchedule.builder().cron(null).build(),
            ZonedDateTime.of(2021, 9, 22, 2, 5, 0, 0, ZoneOffset.UTC)));

    assertTrue(
        p.test(
            CronSchedule.builder().cron("0 0 * * * *").build(),
            ZonedDateTime.of(2021, 9, 22, 0, 0, 0, 0, ZoneOffset.UTC)));
  }

  /*
  @Test
  public void copyDelta() {

    String inputProfiles =
            Objects.requireNonNull(getClass().getResource("/deltasample")).getPath();
    val job = new WhylogDeltalakeWriterJob();

    job.setSpark(spark);
    val args =
            ImmutableList.of(
                            // spotless:off
                            "-sparkMaster", "local[*]",
                            "-destination", inputProfiles,
                            "-profilesDatalakeV2", "/tmp/d" ,
                            "-currentTime", "2021-06-01T00:01:07Z"
                            // spotless:on
                    )
                    .toArray(new String[0]);

    job.apply(args);
    job.runprofilesDatalakeV2Migration();



  }*/

  @Test(enabled = false)
  // [Drew] still have missing data alerts on a diff codepath in V3, haven’t had a chance to
  // consolidate
  // flows yet.
  public void testNoDataAlert() throws Exception {
    val tmp = Files.createTempDirectory("delta");

    try {
      String inputProfiles =
          Objects.requireNonNull(getClass().getResource("/deltasample-v1ified")).getPath();

      String monitorsConfig =
          Objects.requireNonNull(getClass().getResource("/monitors.configv3")).getPath();
      val s3SnapshotStagingArea = Files.createTempDirectory("s3SnapshotStagingArea");
      val eventsDruidPath = Files.createTempDirectory("eventsDruidPath");

      val job = new EventsJobV3();
      job.setSpark(spark);
      val args =
          ImmutableList.of(
                  "-sparkMaster",
                  "local[*]",
                  "-profilesDatalakeV2",
                  inputProfiles,
                  "-lateWindowDays",
                  "7",
                  "-currentTime",
                  "2021-06-01T00:01:07Z",
                  "-analyzerResultsPath",
                  eventsDruidPath.toString(),
                  "-monitorsConfigV3",
                  monitorsConfig,
                  "-duration",
                  Granularity.P1D.name(),
                  "-orgId",
                  "org-11",
                  "-skipManifestGeneration",
                  "-s3SnapshotStagingArea",
                  s3SnapshotStagingArea.toString())
              .toArray(new String[0]);
      job.apply(args);
      job.runBefore();
      val events = job.calculate().as(Encoders.bean(AnalyzerResult.class));
      job.runAfter(events.toDF());

      List<AnalyzerResult> rows =
          DeltaTable.forPath(spark, eventsDruidPath.toString())
              .toDF()
              .as(Encoders.bean(AnalyzerResult.class))
              .filter(
                  col(AnalyzerResult.Fields.metric)
                      .equalTo(lit(AnalysisMetric.mostRecentDatasetTs.name())))
              .collectAsList();

      assertEquals(rows.size(), 1);
      val monitorEvent = rows.get(0);
      assertThat(monitorEvent.getOrgId(), is("org-11"));
      assertThat(monitorEvent.getDatasetId(), is("model-0"));
      assertNull(monitorEvent.getColumn());
      assertEquals(monitorEvent.getGranularity().name(), "DAYS");
      assertThat(monitorEvent.getTargetLevel().toString(), is(TargetLevel.dataset.toString()));
      assertThat(monitorEvent.getAnomalyCount(), is(1L));
      // assertEquals(monitorEvent.getAlertId(), "9f5742fe-c8bc-3a3d-8d43-184385019239");
    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  @Test
  public void testJob() throws Exception {
    Dataset<AnalyzerResult> events = runJob("2021-05-31T00:01:07Z");
    assertTrue(
        events
                .filter("segment=\"purpose=small_business\"")
                .filter("column=\"acc_now_delinq\"")
                .count()
            > 1);
    List<AnalyzerResult> rows = events.filter("segment=\"\"").collectAsList();
    val firstRunId = rows.get(0).getRunId();

    // assertEquals(rows.size(), 8);
    int eventCount = 0;
    int missing_datapoint_analyzerAnomalyCount = 0;
    int acc_open_past_24mthsTargetCount = 0;

    for (val row : rows) {
      if (row.getColumn().equals("acc_open_past_24mths")) {
        eventCount++;
        if (row.getDatasetTimestamp().equals(1622332800000L)) { // 30th
          // Calculated over 14-day baseline. However, 4 of the dataset in the baseline have null
          // histogram which is used to calculate "median" metric, so baselineDatapointsCount is
          // only
          // 10.
          assertEquals(row.getBaselineCount().longValue(), 10);
          assertEquals(row.getExpectedBaselineCount().longValue(), 14);
          assertTarget30(row);
          assertEquals(row.getExpectedBaselineSuppressionThreshold().longValue(), 7);
          assertEquals("StddevCalculationResult", row.getAnalyzerResultType());
          acc_open_past_24mthsTargetCount += 1;
        }
        if (row.getDatasetTimestamp().equals(1621900800000L)) { // 26th
          assertTarget26(row);
        }
      }
      if (row.getAnalyzerId().equals("missing_upload_analyzer")) {
        eventCount++;
        assertTrue(row.getThreshold_metricValue() > 5122600d);
        assertTrue(row.getThreshold_metricValue() < 5122700d);
        // Should align with currentTime of the job run
        assertEquals(Optional.of(1622419200000l), Optional.of(row.getDatasetTimestamp()));
      }
      if (row.getAnalyzerId().equals("missing_datapoint_analyzer")) {
        eventCount++;
        missing_datapoint_analyzerAnomalyCount += row.getAnomalyCount();
      }
    }
    assertEquals(24, eventCount);
    assertEquals(1, missing_datapoint_analyzerAnomalyCount);
    assertEquals(1, acc_open_past_24mthsTargetCount);
  }

  @Test
  public void testMissingDatapointAnalyzer() throws Exception {
    // Lets run the job further into the future on days we know there's no data
    Dataset<AnalyzerResult> events = runJob("2021-06-15T00:01:07Z");
    List<AnalyzerResult> rows =
        events
            .filter("segment=\"\"")
            .filter(col(Fields.analyzerId).equalTo(lit("missing_datapoint_analyzer")))
            .collectAsList();

    int c = 0;
    int anomalies = 0;
    for (val row : rows) {
      if (row.getColumn().equals("acc_open_past_24mths")
          && row.getAnalyzerId().equals("missing_datapoint_analyzer")) {
        // That analyzer has a dataset level target
        assertFalse(true);
      }
      if (row.getColumn().equals(DatasetMetrics.DATASET_METRICS)) {
        c++;
        // No data, default grace periods, these are anomalies
        // assertEquals(Optional.of(1l), Optional.of(row.getAnomalyCount()));

        anomalies += row.getAnomalyCount();
      } else {
        // This analyzer is dataset level, shouldn't have any feature level targeting
        assertFalse(true);
      }
    }

    assertEquals(rows.size(), c);
    assertEquals(16, anomalies);
  }

  /** assertions for timestamp "2021-05-26T00:01:07Z". */
  private void assertTarget26(AnalyzerResult monitorEvent) {
    // 5/26/21 is 5 days after the start of dataset, so expect at most 5 values in the baseline.
    assertThat(monitorEvent.getBaselineCount(), is(5L));
    assertThat(monitorEvent.getExpectedBaselineCount(), is(14L));

    /*
    switch (monitorEvent.getAlgorithmName()) {
      case AlgorithmFactory.HELLINGER:
        // assertThat("c958a130-c676-378d-a00d-606c16b9e716", is(monitorEvent.getAlertId()));
        //TODO:
        break;
      case AlgorithmFactory.DATATYPE:
        // TODO: Hash out the remainder asserts with someone who can help validate
        // assertThat("ff5a1283-e99e-3774-a642-e572d280296f", is(monitorEvent.getAlertId()));
        assertThat(monitorEvent.getStringMetricValue(), is("FRACTIONAL"));
        assertThat(monitorEvent.getBaselineStringMetricValue(), is("FRACTIONAL"));
        break;
      case AlgorithmFactory.UNIQUE:
        assertThat(monitorEvent.getAlertCount(), is(0L));
        // assertThat(monitorEvent.getAlertId(), is("c5ae6070-0acc-366d-86ca-1d8a43081507"));
        assertThat(monitorEvent.getTargetType(), is(TargetType.feature));
        assertThat(monitorEvent.getAlertCount(), is(0L));

        // TODO: Hash out the remainder asserts with someone who can help validate
        break;
      case AlgorithmFactory.MISSING_VALUE:
        // assertThat(monitorEvent.getAlertId(), is("33fbf6dc-cdc3-35b2-befa-5e16165ed398"));
        assertThat(monitorEvent.getAlertCount(), is(0L));
        assertThat(monitorEvent.getMetricValue(), is(0.0));
        break;
      default:
        // Not accounted for
        assertTrue(false);
    }

     */
    assertThat(monitorEvent.getOrgId(), is("org-11"));
    assertThat(monitorEvent.getDatasetId(), is("model-0"));
    assertThat(monitorEvent.getColumn(), is("acc_open_past_24mths"));
    assertEquals(monitorEvent.getGranularity().name(), "DAYS");
    assertThat(monitorEvent.getTargetLevel().toString(), is(TargetLevel.column.toString()));
    assertThat(monitorEvent.getAnomalyCount(), is(0L));
  }

  private void assertTarget30(AnalyzerResult monitorEvent) {
    assertNotNull(monitorEvent.getCalculationRuntimeNano());

    /*
    switch (monitorEvent.getAlgorithmName()) {
      case AlgorithmFactory.HELLINGER:
        // assertThat("7d91c8ed-f8a6-3a14-9746-70f32b5ab319", is(monitorEvent.getAlertId()));
        //TODO:
        assertThat(monitorEvent.getBaselineDatapointsCount(), is(7L));
        assertThat(monitorEvent.getExpectedBaselineDatapointsCount(), is(7L));
        break;
      case AlgorithmFactory.DATATYPE:
        // TODO: Hash out the remainder asserts with someone who can help validate
        // assertThat("a6841a35-e7fb-3418-8330-a2b49abb9c41", is(monitorEvent.getAlertId()));
        assertThat(monitorEvent.getStringMetricValue(), is("FRACTIONAL"));
        assertThat(monitorEvent.getBaselineStringMetricValue(), is("FRACTIONAL"));
        assertThat(monitorEvent.getBaselineDatapointsCount(), is(7L));
        assertThat(monitorEvent.getExpectedBaselineDatapointsCount(), is(7L));
        break;
      case AlgorithmFactory.UNIQUE:
        assertThat(monitorEvent.getAlertCount(), is(0L));
        // assertThat("6849e3ac-1f2b-3e0b-9232-a80cac13269b", is(monitorEvent.getAlertId()));
        assertThat(monitorEvent.getTargetType(), is(TargetType.feature));
        assertThat(monitorEvent.getAlertCount(), is(0L));
        assertThat(monitorEvent.getBaselineDatapointsCount(), is(7L));
        assertThat(monitorEvent.getExpectedBaselineDatapointsCount(), is(7L));

        // TODO: Hash out the remainder asserts with someone who can help validate
        break;
      case AlgorithmFactory.MISSING_VALUE:
        // assertThat("d54b3963-ca8d-3838-98ee-62460ea4ccde", is(monitorEvent.getAlertId()));
        assertThat(monitorEvent.getAlertCount(), is(0L));
        assertThat(monitorEvent.getMetricValue(), is(0.0));
        assertThat(monitorEvent.getBaselineDatapointsCount(), is(7L));
        assertThat(monitorEvent.getExpectedBaselineDatapointsCount(), is(7L));

        break;
      case AlgorithmFactory.SEASONAL_ARIMA:
        assertThat(monitorEvent.getBaselineDatapointsCount(), is(30L));
        assertThat(monitorEvent.getExpectedBaselineDatapointsCount(), is(30L));
        assertThat(monitorEvent.getAlgorithm(), is(oneOf(MonitorAlgorithm.SeasonalArima)));

      default:
        // Not accounted for
        assertTrue(false);
    }
    */
    assertThat(monitorEvent.getOrgId(), is("org-11"));
    assertThat(monitorEvent.getDatasetId(), is("model-0"));
    assertThat(monitorEvent.getColumn(), is("acc_open_past_24mths"));
    assertEquals(monitorEvent.getGranularity().name(), "DAYS");
    assertThat(monitorEvent.getTargetLevel().toString(), is(TargetLevel.column.toString()));
    // assertThat(monitorEvent.getAlertCount(), is(0L));
  }

  private Dataset<AnalyzerResult> runJob(String date) throws IOException {
    val tmp = Files.createTempDirectory("delta");

    try {
      String inputProfiles =
          Objects.requireNonNull(getClass().getResource("/deltasample-v1ified")).getPath();

      String monitorsConfig =
          Objects.requireNonNull(getClass().getResource("/monitors.configv3")).getPath();
      val s3SnapshotStagingArea = Files.createTempDirectory("s3SnapshotStagingArea");
      val nearRealTimeAlertStagingArea = Files.createTempDirectory("nearRealTimeAlertStagingArea");
      val analyzerResultsPath = Files.createTempDirectory("analyzerResultsPath");
      val monitorRunsPath = Files.createTempDirectory("monitorRunsPath");

      val job = new EventsJobV3();
      job.setSpark(spark);
      val args =
          ImmutableList.of(
                  "-sparkMaster",
                  "local[*]",
                  "-profilesDatalakeV2",
                  inputProfiles,
                  "-analyzerRuns",
                  monitorRunsPath.toString(),
                  "-lateWindowDays", // Notable, enabling
                  "7",
                  "-currentTime",
                  date,
                  "-nearRealTimeAlertStagingArea",
                  nearRealTimeAlertStagingArea.toString(),
                  "-analyzerResultsPath",
                  analyzerResultsPath.toString(),
                  "-monitorsConfigV3",
                  monitorsConfig,
                  "-duration",
                  Granularity.P1D.name(),
                  "-orgId",
                  "org-11",
                  "-skipManifestGeneration",
                  "-s3SnapshotStagingArea",
                  s3SnapshotStagingArea.toString())
              .toArray(new String[0]);
      job.apply(args);
      job.runBefore();
      val events = job.calculate().as(Encoders.bean(AnalyzerResult.class));
      job.runAfter(events.toDF());

      assertTrue(DeltaTable.forPath(spark, analyzerResultsPath.toString()).toDF().count() > 1);
      assertTrue(DeltaTable.forPath(spark, monitorRunsPath.toString()).toDF().count() > 0);

      List<Path> paths =
          Files.walk(Paths.get(s3SnapshotStagingArea.toString()))
              .filter(Files::isRegularFile)
              .collect(Collectors.toList());

      val csv = spark.read().text(s3SnapshotStagingArea.toString() + "/*/*");
      List<Row> asAnalyserResults = csv.collectAsList();
      assertTrue(asAnalyserResults.size() > 0);
      assertTrue(asAnalyserResults.get(0).toString().contains("org-11"));
      return events;
    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  /*
  @Test
  public void updateUploadTs() {

    DeltaTable.forPath(
            spark,
            "/Users/drew/whylabs/whylabs-processing-core2/murmuration/src/test/resources/deltasample-v1ified")
        .toDF()
        .withColumn(DatalakeRow.Fields.lastUploadTs, lit(1617296595000l))
        .write()
        .format(DeltalakeWriter.DELTA)
        .partitionBy(DatalakeRow.Fields.partition, DatalakeRow.Fields.type)
        .mode(SaveMode.Overwrite)
        .save(
            "/Users/drew/whylabs/whylabs-processing-core2/murmuration/src/test/resources/deltasample-v1ified");
  }*/

  @Test
  public void testFeedbackLoopAndLateWindow() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/deltasample-v1ified")).getPath();

    String monitorsConfig =
        Objects.requireNonNull(getClass().getResource("/monitors.configv3")).getPath();
    val tmp = Files.createTempDirectory("delta");
    val s3SnapshotStagingArea = Files.createTempDirectory("s3SnapshotStagingArea");
    val analyzerResultsPath = Files.createTempDirectory("analyzerResultsPath");

    String sampleBackfillRequest =
        Objects.requireNonNull(getClass().getResource("/actions/backfill/org_0_model_303.json"))
            .getPath();
    val backfillsPath = Files.createTempDirectory("backfillRequests");
    val backfillRequestFile = backfillsPath.toString() + "/test.json";
    FileUtils.copyFile(new File(sampleBackfillRequest), new File(backfillRequestFile));

    val job = new EventsJobV3();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-profilesDatalakeV2",
                inputProfiles,
                "-currentTime",
                "2021-05-27T02:01:07Z",
                "-lateWindowDays",
                "90",
                "-analyzerResultsPath",
                analyzerResultsPath.toString(),
                "-monitorsConfigV3",
                monitorsConfig,
                "-appendMode",
                "false",
                "-duration",
                Granularity.P1D.name(),
                "-orgId",
                "org-11",
                "-skipManifestGeneration",
                "-s3SnapshotStagingArea",
                s3SnapshotStagingArea.toString())
            .toArray(new String[0]);
    try {
      job.apply(args);
      job.runBefore();
      val events = job.calculate().as(Encoders.bean(AnalyzerResult.class));

      job.runAfter(events.toDF());
      assertTrue(DeltaTable.forPath(spark, analyzerResultsPath.toString()).toDF().count() > 1);
      // events.toDF().show(100, 100, true);
      // System.out.println("Produced " + events.toDF().count() + " events");

      val digests = job.getDigestSirenPayloadDf().collectAsList();
      for (val digest : digests) {
        for (val a : digest.getAnomalySample()) {
          log.info(
              "{},{},{},{}",
              a.getAnalyzerId(),
              a.getSegment(),
              a.getDatasetId(),
              a.getDatasetTimestamp());
        }

        assertFalse(StringUtils.isEmpty(digest.getId()));
        assertEquals("org-11", digest.getOrgId());
        assertEquals("model-0", digest.getDatasetId());
        assertEquals(Optional.of(digest.getNumAnomalies()), Optional.of(5l));
        assertEquals(Optional.of(2), Optional.of(digest.getSeverity()));
        assertEquals(2, digest.getSegmentStatistics().size());
        for (val segment : digest.getSegmentStatistics()) {
          assertEquals("fixed", segment.getAnalyzerType());
          if (segment.getSegment().equals("purpose=small_business")) {
            assertEquals(1, segment.getColumns().size());
            assertEquals(Optional.of(4l), Optional.of(segment.getNumAnomalies()));
          } else {
            // overall
            assertEquals("", segment.getSegment());
            assertEquals(
                Optional.of(1621987200000l),
                Optional.of(segment.getOldestAnomalyDatasetTimestamp()));
            assertEquals(
                Optional.of(1621468800000l),
                Optional.of(segment.getEarliestAnomalyDatasetTimestamp()));
          }
        }
        val col = digest.getColumnStatistics().get(0);
        assertEquals("fixed", col.getAnalyzerType());
        assertEquals(Optional.of(5l), Optional.of(col.getNumAnomalies()));
        assertEquals(
            Optional.of(1621987200000l), Optional.of(col.getOldestAnomalyDatasetTimestamp()));
        assertEquals(
            Optional.of(1621468800000l), Optional.of(col.getEarliestAnomalyDatasetTimestamp()));
      }

      assertEquals(1, digests.size());
      val everyAnomaly = job.getEveryAnomalySirenDf().collectAsList();
      assertEquals(Optional.of(everyAnomaly.size()), Optional.of(5));
      for (val anomaly : everyAnomaly) {
        assertFalse(StringUtils.isEmpty(anomaly.getId()));
        assertEquals("org-11", anomaly.getAnalyzerResult().getOrgId());
        assertEquals("model-0", anomaly.getAnalyzerResult().getDatasetId());
        assertEquals("EVERY_ANOMALY", anomaly.getMode());
        assertEquals(Optional.of(2), Optional.of(anomaly.getSeverity()));
      }

      val job2 = new EventsJobV3();
      job2.setSpark(spark);
      // Run the job again 2 days later, should have fewer anomalies due to feedback loop
      val args2 =
          ImmutableList.of(
                  "-sparkMaster",
                  "local[*]",
                  "-profilesDatalakeV2",
                  inputProfiles,
                  "-currentTime",
                  "2021-05-29T02:01:07Z",
                  "-lateWindowDays",
                  "90",
                  "-analyzerResultsPath",
                  analyzerResultsPath.toString(),
                  "-monitorsConfigV3",
                  monitorsConfig,
                  "-embedableImageBasePath",
                  "/tmp/blah",
                  "-duration",
                  Granularity.P1D.name(),
                  "-orgId",
                  "org-11",
                  "-skipManifestGeneration",
                  "-s3SnapshotStagingArea",
                  s3SnapshotStagingArea.toString())
              .toArray(new String[0]);

      job2.apply(args2);
      val events2 =
          job2.calculate()
              .as(Encoders.bean(AnalyzerResult.class))
              .filter(col(Fields.targetLevel).equalTo(lit(TargetLevel.column.name())));
      job2.runAfter(events2.toDF());
      assertEquals(0, events2.count());

      // Two days later we should have some siren notifications, but fewer anomalies in them
      val sirenDigests = job2.getDigestSirenPayloadDf().collectAsList();
      assertEquals("model-0", sirenDigests.get(0).getDatasetId());
      assertEquals("org-11", sirenDigests.get(0).getOrgId());
      assertEquals(Optional.of(9l), Optional.of(sirenDigests.get(0).getNumAnomalies()));
      assertEquals(Optional.of(2), Optional.of(sirenDigests.get(0).getSeverity()));
      assertEquals(9, sirenDigests.get(0).getAnomalySample().size());

      assertEquals(1, sirenDigests.size());
      assertEquals(4, job2.getEveryAnomalySirenDf().count());

      List<Path> paths =
          Files.walk(Paths.get(s3SnapshotStagingArea.toString()))
              .filter(Files::isRegularFile)
              .collect(Collectors.toList());

      int numTextFiles = 0;
      boolean foundAnalysis = false;
      for (Path p : paths) {
        if (p.toString().endsWith(".txt")) { // Path.endsWith only matches entire path...
          numTextFiles++;
          /* TODO: Add some assertions on our csv dump
          val sqlContext = new SQLContext(spark.sparkContext());
          val parquetFile = sqlContext.read().parquet(p.toString());
          val asAnalyserResults =
              parquetFile.as(Encoders.bean(AnalyzerResult.class)).collectAsList();

          for (AnalyzerResult ar : asAnalyserResults) {
            if (ar.getAnalyzerId().equals("drift_analyzer")
                && ar.getColumn().equals("num_op_rev_tl")
                && ar.getSegment().isEmpty()
                && ar.getDatasetTimestamp() == 1622073600000l) {
              foundAnalysis = true;
              assertEquals("org-11", ar.getOrgId());
              assertEquals("model-0", ar.getDatasetId());
              // The enum for this unit is Days, but we use the all-cap version. Jackson doesn't
              // care.
              assertEquals("DAYS", ar.getGranularity().toString().toUpperCase());
              assertEquals(TargetLevel.column, ar.getTargetLevel());
              assertNull(ar.getSegmentWeight());
              assertFalse(ar.getSegmentWeightProvided());

              assertEquals(0l, (long) ar.getAnomalyCount());
              assertEquals(TargetLevel.column, ar.getTargetLevel());
              assertTrue(ar.getBaselineCount() >= 6l);

              assertTrue(ar.getThreshold_metricValue() >= 0.0);
              assertTrue(ar.getThreshold_calculatedUpper() >= 0.0);
              assertTrue(ar.getThreshold_calculatedLower() <= 0.0);

              ar.getMonitorIds().forEach(mid -> assertTrue(mid.startsWith("drift-monitor-")));
              assertEquals(2, ar.getMonitorIds().size());
            }
          }*/
        }
      }
      assertTrue(numTextFiles > 0);
      // assertTrue(foundAnalysis);

    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  @Test
  public void testModel303PerfMetrics() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/profiles_model_303-v1ified")).getPath();

    String monitorsConfig =
        Objects.requireNonNull(getClass().getResource("/config_model_303")).getPath();
    val tmp = Files.createTempDirectory("delta");
    val s3SnapshotStagingArea = Files.createTempDirectory("s3SnapshotStagingArea");
    val analyzerResultsPath = Files.createTempDirectory("analyzerResultsPath");

    val job = new EventsJobV3();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-profilesDatalakeV2",
                inputProfiles,
                "-currentTime",
                "2021-10-13T00:01:07Z",
                "-lateWindowDays",
                "0",
                "-analyzerResultsPath",
                analyzerResultsPath.toString(),
                "-monitorsConfigV3",
                monitorsConfig,
                "-duration",
                Granularity.P1D.name(),
                "-orgId",
                "org-0",
                "-skipManifestGeneration",
                "-datasetId",
                "model-303",
                "-s3SnapshotStagingArea",
                s3SnapshotStagingArea.toString())
            .toArray(new String[0]);
    try {
      job.apply(args);
      job.runBefore();
      val events =
          job.calculate()
              .as(Encoders.bean(AnalyzerResult.class))
              .filter(col(Fields.datasetTimestamp).equalTo(lit(1633996800000l)));
      val row = events.collectAsList().get(0);
      assertFalse(row.getIsRollup());
      assertTrue(row.getThreshold_calculatedLower() < 0);
      assertTrue(row.getThreshold_calculatedUpper() > 0);
      // `metricValue` is target value of metric; happens to be 0.0 on this date
      assertThat(row.getThreshold_metricValue(), equalTo(0.0));
      assertEquals(Optional.of(0l), Optional.of(row.getAnomalyCount()));
      assertTrue(row.getMonitorIds().contains("f1-monitor-1"));
      assertEquals("classification.f1", row.getMetric());
      assertTrue(row.getLatest());
      assertEquals("DAYS", row.getGranularity().toString().toUpperCase());
      assertNull(row.getFailureType());
      assertNull(row.getFailureExplanation());
      assertEquals(Optional.of(14l), Optional.of(row.getBaselineCount()));
      assertEquals("stddev", row.getAnalyzerType());
      assertNull(row.getAlgorithm());
      assertNull(row.getAlgorithmMode());

      // events.show();
      job.runAfter(events.toDF());

    } finally {
      FileUtils.deleteDirectory(tmp.toFile());
    }
  }

  @Test
  public void testMissingConfigIsANoOpAndDoesntFailThePipeline() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/deltasample-v1ified")).getPath();

    val tmp = Files.createTempDirectory("delta");
    val s3SnapshotStagingArea = Files.createTempDirectory("s3SnapshotStagingArea");
    val analyzerResultsPath = Files.createTempDirectory("analyzerResultsPath");

    val job = new EventsJobV3();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-profilesDatalakeV2",
                inputProfiles,
                "-currentTime",
                "2021-06-04T02:01:07Z",
                "-lateWindowDays",
                "90",
                "-analyzerResultsPath",
                analyzerResultsPath.toString(),
                "-monitorsConfigV3",
                "/tmp/config_not_present",
                "-duration",
                Granularity.P1D.name(),
                "-orgId",
                "org-11",
                "-s3SnapshotStagingArea",
                s3SnapshotStagingArea.toString())
            .toArray(new String[0]);

    EventsJobV3.main(args);
  }

  @Test
  public void testTargetWithEmptyBaseline() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/deltasample-v1ified")).getPath();
    String monitorsConfig =
        Objects.requireNonNull(getClass().getResource("/monitors.configv3")).getPath();
    val s3SnapshotStagingArea = Files.createTempDirectory("s3SnapshotStagingArea");
    val analyzerResultsPath = Files.createTempDirectory("analyzerResultsPath");

    val croppedBaselineDatalake = Files.createTempDirectory("croppedBaselineDatalake");

    /** Crop the datalake so there's target data but a totally empty baseline */
    DeltaTable.forPath(spark, inputProfiles)
        .toDF()
        .filter(functions.col("datasetTimestamp").$greater(1622074430000L))
        .write()
        .format("delta")
        .mode(SaveMode.Overwrite)
        .save(croppedBaselineDatalake.toString());

    /** Run Events Job for all orgs */
    val job = new EventsJobV3();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-profilesDatalakeV2",
                croppedBaselineDatalake.toString(),
                "-currentTime",
                "2021-05-29T00:01:07Z",
                "-analyzerResultsPath",
                analyzerResultsPath.toString(),
                "-monitorsConfigV3",
                monitorsConfig,
                "-duration",
                Granularity.P1D.name(),
                "-skipManifestGeneration",
                "-s3SnapshotStagingArea",
                s3SnapshotStagingArea.toString())
            .toArray(new String[0]);
    try {
      job.apply(args);
      job.runBefore();
    } finally {
      FileUtils.deleteDirectory(croppedBaselineDatalake.toFile());
    }
  }

  /**
   * Assert monitor job does not calculate events on __internal__.datasetMetrics. update: as of
   * 8/4/2021 we no longer calculate monitor statistics on derived metrics.
   */
  @Test
  public void testMonitorJobDerivedMetrics() throws Exception {
    String inputProfiles =
        Objects.requireNonNull(getClass().getResource("/delta-model-metrics-v1ified")).getPath();
    String monitorsConfig =
        Objects.requireNonNull(getClass().getResource("/monitors.configv3")).getPath();
    val tmp = Files.createTempDirectory("delta");
    val s3SnapshotStagingArea = Files.createTempDirectory("s3SnapshotStagingArea");
    val analyzerResultsPath = Files.createTempDirectory("analyzerResultsPath");

    val job = new EventsJobV3();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                "-sparkMaster",
                "local[*]",
                "-profilesDatalakeV2",
                inputProfiles,
                "-currentTime",
                "2021-06-17T00:00:00Z",
                "-analyzerResultsPath",
                analyzerResultsPath.toString(),
                "-monitorsConfigV3",
                monitorsConfig,
                "-duration",
                Granularity.P1D.name(),
                "-orgId",
                "org-11",
                "-s3SnapshotStagingArea",
                s3SnapshotStagingArea.toString())
            .toArray(new String[0]);

    job.apply(args);
    job.runBefore();
    val result = job.calculate();
    val internal = result.filter("column=\"__internal__.datasetMetrics\"").collectAsList();

    val derived =
        result.filter(result.col("column").contains("whylogs.metrics.derived.")).collectAsList();
    assertEquals(0, internal.size());
    assertEquals(0, derived.size());
  }

  private String singleReferenceProfileMonitorConfig =
      "{\n"
          + "  \"config\": {\n"
          + "    \"reference\": {\n"
          + "      \"type\": \"reference_profile\",\n"
          + "      \"profileId\": \"ref-ZOZliYhAItjw5B7Y\"\n" // Here
          // + "      \"profileId\": \"ref-ZOZliYhAItjw5B7\"\n" // Here
          + "    },\n"
          + "    \"referenceType\": \"reference_profile\",\n"
          + "    \"datatype\": {\n"
          + "      \"enable\": true\n"
          + "    },\n"
          + "    \"distribution\": {\n"
          + "      \"enable\": true\n"
          + "    },\n"
          + "    \"missing_values\": {\n"
          + "      \"enable\": true\n"
          + "    },\n"
          + "    \"unique_values\": {\n"
          + "      \"enable\": true\n"
          + "    }\n"
          + "  },\n"
          + "  \"per_feature_config\": {\n"
          + "    \"total_bc_limit\": {\n"
          + "      \"distribution\": {\n"
          + "        \"enable\": true\n"
          + "      },\n"
          + "      \"datatype\": {\n"
          + "        \"enable\": true\n"
          + "      },\n"
          + "      \"missing_values\": {\n"
          + "        \"enable\": true,\n"
          + "        \"threshold\": 2,\n"
          + "        \"threshold_lower_bound\": 1,\n"
          + "        \"threshold_upper_bound\": 2\n"
          + "      },\n"
          + "      \"unique_values\": {\n"
          + "        \"enable\": true\n"
          + "      }\n"
          + "    }\n"
          + "  }\n"
          + "}";

  @SneakyThrows
  static void createMonitorConfigs(
      SparkSession spark, String monitorConfigJson, Path monitorConfigPath) {
    // Helper routine to create a monitor config deltalake from string json config.
    //
    val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(monitorConfigJson);

    /** write json config to temp file */
    val currentTime = "2021-07-02T15:30:00Z";
    val date = ZonedDateTime.parse(currentTime);
    val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    val configDir = Files.createTempDirectory("monitors.config");
    String l =
        configDir
            + "/"
            + date.format(formatter)
            + "/"
            + conf.getOrgId()
            + "/"
            + conf.getDatasetId();
    new File(l).mkdirs();

    // write json monitor config where it can be read by WhylogDeltalakeWriterJob

    val jsonFile = new File(l, "/config.json");
    val bw = new BufferedWriter(new FileWriter(jsonFile));
    bw.write(monitorConfigJson);
    bw.close();

    val profilesDestination = Files.createTempDirectory("profiles");

    val job = new WhylogDeltalakeWriterJob();
    job.setSpark(spark);
    val args =
        ImmutableList.of(
                // spotless:off
                            "-sparkMaster", "local[*]",
                            "-source", "/does/not/exist",
                            "-destination", profilesDestination.toString(),
                            "-monitorConfigChanges", configDir.toString(),
                            "-monitorConfigV3", monitorConfigPath.toString(),
                            "-currentTime", currentTime
                            // spotless:on

                )
            .toArray(new String[0]);

    job.run(args);
  }

  @SneakyThrows
  @Test
  public void testClassificationModelMetricMonitor() {
    val monitorConfigPath = Files.createTempDirectory("monitors.deltalake");
    val eventsDeltalake = Files.createTempDirectory("events");

    val baseline = TrailingWindowBaseline.builder().size(14).build();
    List<Analyzer> analyzers = new ArrayList<>();
    for (val metric :
        Arrays.asList(
            "classification.recall",
            "classification.fpr",
            "classification.precision",
            "classification.accuracy",
            "classification.f1",
            "classification.auroc")) {
      analyzers.add(
          Analyzer.builder()
              .id(metric + "_analyzer")
              .disabled(false)
              .config(
                  StddevConfig.builder()
                      .version(1)
                      .metric(metric)
                      .baseline(baseline)
                      .minBatchSize(14)
                      .factor(2.0)
                      .build())
              .targetMatrix(DatasetMatrix.builder().build())
              .schedule(CronSchedule.builder().cron("0 * * * *").build())
              .build());
    }

    monitorConfigV3 =
        MonitorConfigV3.builder()
            .id(UUID.randomUUID().toString())
            .updatedTs(System.currentTimeMillis())
            .orgId("org-0")
            .datasetId("model-303")
            .analyzers(analyzers)
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .build();

    String monitorConfigJson = MonitorConfigV3JsonSerde.toString(monitorConfigV3);

    try {
      createMonitorConfigs(spark, monitorConfigJson, monitorConfigPath);

      String inputProfilesPath =
          Objects.requireNonNull(getClass().getResource("/classification/profiletable-v1ified"))
              .getPath();

      EventsJobV3 eventsJob = new EventsJobV3();
      eventsJob.setSpark(spark);
      val args =
          ImmutableList.of(
                  // spotless:off
                              "-sparkMaster", "local[*]",
                              "-profilesDatalakeV2", inputProfilesPath,
                              "-currentTime", "2021-09-17T00:00:00Z",
                              "-monitorsConfigV3", monitorConfigPath.toString(),
                              "-analyzerResultsPath", eventsDeltalake.toString(),
                              "-duration", Granularity.P1D.name(),
                              "-overwriteEvents",
                              "-appendMode",
                              "true"
                              // spotless:on
                  )
              .toArray(new String[0]);

      ConfigAwsSdk.defaults();
      DateTimeZone.setDefault(DateTimeZone.UTC);

      eventsJob.apply(args);

      eventsJob.runBefore();
      val result =
          eventsJob
              .calculate()
              // Backfill grace period is now managed by monitor config rather than job level,
              // assert only on the most recent datapoint
              .filter(col(Fields.datasetTimestamp).equalTo(lit(1631750400000l)));
      val events = result.as(Encoders.bean(AnalyzerResult.class)).cache();

      assertEquals(events.count(), 6);
      events.foreach(
          (ForeachFunction<AnalyzerResult>)
              (event) -> {
                assertNotNull(event);
                assertNotNull(event.getThreshold_calculatedUpper());
                assertNotNull(event.getThreshold_calculatedLower());
                assertThat(
                    event.getThreshold_calculatedUpper(),
                    greaterThanOrEqualTo(event.getThreshold_calculatedLower()));
                assertNull(event.getFailureType());
                assertNull(event.getFailureExplanation());
                assertThat(event.getTargetLevel(), is(TargetLevel.dataset));
                assertThat(event.getAnomalyCount(), is(0L));
              });
    } finally {
      FileUtils.deleteDirectory(monitorConfigPath.toFile());
      FileUtils.deleteDirectory(eventsDeltalake.toFile());
    }
  }

  @SneakyThrows
  @Test
  public void testRegressionModelMetricMonitor() throws JsonProcessingException {
    val monitorConfigPath = Files.createTempDirectory("monitors.deltalake");
    val eventsDeltalake = Files.createTempDirectory("events");

    val baseline = TrailingWindowBaseline.builder().size(14).build();
    List<Analyzer> analyzers = new ArrayList<>();
    for (val metric : Arrays.asList("regression_mse", "regression_mae", "regression_rmse")) {
      analyzers.add(
          Analyzer.builder()
              .id(metric + "_analyzer")
              .disabled(false)
              .config(
                  StddevConfig.builder()
                      .version(1)
                      .metric(metric)
                      .baseline(baseline)
                      .minBatchSize(6)
                      .factor(2.0)
                      .build())
              .targetMatrix(DatasetMatrix.builder().build())
              .schedule(CronSchedule.builder().cron("0 * * * *").build())
              .build());
    }

    monitorConfigV3 =
        MonitorConfigV3.builder()
            .id(UUID.randomUUID().toString())
            .updatedTs(System.currentTimeMillis())
            .orgId("org-0")
            .datasetId("regression")
            .analyzers(analyzers)
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .build();

    String monitorConfigJson = MonitorConfigV3JsonSerde.toString(monitorConfigV3);

    try {
      createMonitorConfigs(spark, monitorConfigJson, monitorConfigPath);

      String inputProfilesPath =
          Objects.requireNonNull(getClass().getResource("/regression/profiletable-v1ified"))
              .getPath();

      EventsJobV3 eventsJob = new EventsJobV3();
      eventsJob.setSpark(spark);
      val args =
          ImmutableList.of(
                  // spotless:off
                              "-sparkMaster", "local[*]",
                              "-profilesDatalakeV2", inputProfilesPath,
                              "-currentTime", "2022-03-16T00:00:00Z",
                              "-monitorsConfigV3", monitorConfigPath.toString(),
                              "-analyzerResultsPath", eventsDeltalake.toString(),
                              "-duration", Granularity.P1D.name(),
                              "-overwriteEvents",
                              "-appendMode",
                              "true"
                              // spotless:on
                  )
              .toArray(new String[0]);

      ConfigAwsSdk.defaults();
      DateTimeZone.setDefault(DateTimeZone.UTC);

      eventsJob.apply(args);

      eventsJob.runBefore();
      val result =
          eventsJob.calculate().filter(col(Fields.datasetTimestamp).equalTo(lit(1647302400000l)));
      val events = result.as(Encoders.bean(AnalyzerResult.class)).cache();
      // events.show();
      assertEquals(events.count(), 3);
      events.foreach(
          (ForeachFunction<AnalyzerResult>)
              (event) -> {
                assertNotNull(event);
                assertNotNull(event.getThreshold_calculatedUpper());
                assertNotNull(event.getThreshold_calculatedLower());
                assertThat(
                    event.getThreshold_calculatedUpper(),
                    greaterThanOrEqualTo(event.getThreshold_calculatedLower()));
                assertNull(event.getFailureType());
                assertNull(event.getFailureExplanation());
                assertThat(event.getTargetLevel(), is(TargetLevel.dataset));
                assertThat(event.getAnomalyCount(), is(0L));
              });
    } finally {
      FileUtils.deleteDirectory(monitorConfigPath.toFile());
      FileUtils.deleteDirectory(eventsDeltalake.toFile());
    }
  }

  @SneakyThrows
  @Test
  public void testSchemaChangeMonitor() {
    val monitorConfigPath = Files.createTempDirectory("monitors.deltalake");
    val eventsDeltalake = Files.createTempDirectory("events");

    val baseline = TrailingWindowBaseline.builder().size(14).build();
    List<Analyzer> analyzers = new ArrayList<>();
    analyzers.add(
        Analyzer.builder()
            .id("schema_analyzer")
            .disabled(false)
            .config(
                ColumnListChangeConfig.builder()
                    .mode(ColumnListChangeMode.ON_ADD_AND_REMOVE)
                    .metric(AnalysisMetric.field_list.name())
                    .baseline(baseline)
                    .version(1)
                    .build())
            .targetMatrix(DatasetMatrix.builder().build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    monitorConfigV3 =
        MonitorConfigV3.builder()
            .id(UUID.randomUUID().toString())
            .updatedTs(System.currentTimeMillis())
            .orgId("org-0")
            .datasetId("regression")
            .analyzers(analyzers)
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .build();

    String monitorConfigJson = MonitorConfigV3JsonSerde.toString(monitorConfigV3);

    try {
      createMonitorConfigs(spark, monitorConfigJson, monitorConfigPath);

      String inputProfilesPath =
          Objects.requireNonNull(getClass().getResource("/regression/profiletable-v1ified"))
              .getPath();

      EventsJobV3 eventsJob = new EventsJobV3();
      eventsJob.setSpark(spark);
      val args =
          ImmutableList.of(
                  // spotless:off
                              "-sparkMaster", "local[*]",
                              "-profilesDatalakeV2", inputProfilesPath,
                              "-currentTime", "2022-03-16T00:00:00Z",
                              "-monitorsConfigV3", monitorConfigPath.toString(),
                              "-analyzerResultsPath", eventsDeltalake.toString(),
                              "-duration", Granularity.P1D.name(),
                              "-overwriteEvents",
                              "-appendMode",
                              "true"
                              // spotless:on
                  )
              .toArray(new String[0]);

      ConfigAwsSdk.defaults();
      DateTimeZone.setDefault(DateTimeZone.UTC);

      eventsJob.apply(args);

      eventsJob.runBefore();
      val result =
          eventsJob.calculate().filter(col(Fields.datasetTimestamp).equalTo(lit(1647302400000l)));
      val events = result.as(Encoders.bean(AnalyzerResult.class)).cache();
      // events.show(true);
      assertEquals(events.count(), 1);
      events.foreach(
          (ForeachFunction<AnalyzerResult>)
              (event) -> {
                assertNotNull(event);
                assertNull(event.getFailureType());
                assertNull(event.getFailureExplanation());
                assertThat(event.getTargetLevel(), is(TargetLevel.dataset));
                assertThat(event.getAnomalyCount(), is(0L));
                assertThat(event.getAnalyzerId(), is("schema_analyzer"));
              });
    } finally {
      FileUtils.deleteDirectory(monitorConfigPath.toFile());
      FileUtils.deleteDirectory(eventsDeltalake.toFile());
    }
  }

  @Test
  public void printMonitorEventSchema() throws JsonProcessingException {
    ObjectMapper mapper = new ObjectMapper();
    SchemaFactoryWrapper wrapper = new SchemaFactoryWrapper();
    mapper.acceptJsonFormatVisitor(AnalyzerResult.class, wrapper);
    JsonSchema jsonSchema = wrapper.finalSchema();

    System.out.println(mapper.writeValueAsString(jsonSchema));
  }

  @Test
  public void testComputeJobGranularitiesLargestDuration() {
    val a1 = Analyzer.builder().backfillGracePeriodDuration(Duration.ofHours(1)).build();
    val a2 = Analyzer.builder().backfillGracePeriodDuration(Duration.ofDays(1)).build();

    val conf = MonitorConfigV3.builder().analyzers(Arrays.asList(a1, a2)).build();
    assertEquals(
        a2.getBackfillGracePeriodDuration(), ComputeJobGranularities.getLargestDuration(conf));
    assertNull(
        ComputeJobGranularities.getLargestDuration(
            MonitorConfigV3.builder().analyzers(new ArrayList<>()).build()));
  }

  @Test
  public void testEveryAnomalyFilter() throws Exception {
    val conf1 =
        MonitorConfigV3.builder()
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .monitors(
                Arrays.asList(
                    Monitor.builder()
                        .mode(EveryAnamolyMode.builder().build())
                        .id("z")
                        .analyzerIds(Arrays.asList("b", "a"))
                        .build()))
            .build();
    val filter = new EveryAnomalyModeFilter("");
    val notification =
        AnalyzerResult.builder().analyzerId("a").monitorIds(Arrays.asList("z")).build();
    assertTrue(
        filter
            .call(Tuple2.apply(notification, MonitorConfigV3JsonSerde.toMonitorConfigV3Row(conf1)))
            .hasNext());

    // No notification mode specified
    val conf2 =
        MonitorConfigV3.builder()
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .monitors(Arrays.asList(Monitor.builder().id("a").build()))
            .build();
    assertFalse(
        filter
            .call(Tuple2.apply(notification, MonitorConfigV3JsonSerde.toMonitorConfigV3Row(conf2)))
            .hasNext());
  }

  @Test
  public void testMissingGranularityValidation() {
    assertFalse(new RequiredTopLevelFieldsCheck().test(MonitorConfigV3.builder().build()));
  }

  /*
   * test monitors used for V2 compatability. Uniqueness ratio, missing values ratio, inferred type
   */
  @SneakyThrows
  @Test
  public void testLegacyMonitors() throws JsonProcessingException {
    val monitorConfigPath = Files.createTempDirectory("monitors.deltalake");
    val eventsDeltalake = Files.createTempDirectory("events");

    val baseline = TrailingWindowBaseline.builder().size(14).build();
    List<Analyzer> analyzers = new ArrayList<>();
    analyzers.add(
        Analyzer.builder()
            .id("uniqueness_analyzer")
            .disabled(false)
            .config(
                StddevConfig.builder()
                    .version(1)
                    .metric(AnalysisMetric.unique_est_ratio.name())
                    .baseline(baseline)
                    .minBatchSize(14)
                    .factor(1.0)
                    .build())
            .targetMatrix(ColumnMatrix.builder().include(Arrays.asList("group:discrete")).build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());
    analyzers.add(
        Analyzer.builder()
            .id("inferred_type_analyzer")
            .disabled(false)
            .config(
                ComparisonConfig.builder()
                    .version(1)
                    .metric(AnalysisMetric.inferred_data_type.name())
                    .operator("eq")
                    .expected(ExpectedValue.builder().stringValue("INTEGRAL").build())
                    .baseline(baseline)
                    .build())
            .targetMatrix(ColumnMatrix.builder().include(Arrays.asList("group:discrete")).build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    monitorConfigV3 =
        MonitorConfigV3.builder()
            .id(UUID.randomUUID().toString())
            .updatedTs(System.currentTimeMillis())
            .orgId("org-0")
            .datasetId("model-303")
            .analyzers(analyzers)
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .build();

    String monitorConfigJson = MonitorConfigV3JsonSerde.toString(monitorConfigV3);

    try {
      createMonitorConfigs(spark, monitorConfigJson, monitorConfigPath);

      String inputProfilesPath =
          Objects.requireNonNull(getClass().getResource("/classification/profiletable-v1ified"))
              .getPath();

      EventsJobV3 eventsJob = new EventsJobV3();
      eventsJob.setSpark(spark);
      val args =
          ImmutableList.of(
                  // spotless:off
                              "-sparkMaster", "local[*]",
                              "-profilesDatalakeV2", inputProfilesPath,
                              "-currentTime", "2021-09-17T00:00:00Z",
                              "-monitorsConfigV3", monitorConfigPath.toString(),
                              "-analyzerResultsPath", eventsDeltalake.toString(),
                              "-duration", Granularity.P1D.name(),
                              //"-overwriteEvents",
                              "-appendMode",
                              "true"
                              // spotless:on
                  )
              .toArray(new String[0]);

      ConfigAwsSdk.defaults();
      DateTimeZone.setDefault(DateTimeZone.UTC);

      eventsJob.apply(args);

      eventsJob.runBefore();
      val result = eventsJob.calculate();
      val events = result.as(Encoders.bean(AnalyzerResult.class)).cache();

      assertEquals(events.filter(col("anomalyCount").notEqual(lit(0L))).count(), 652);
    } finally {
      FileUtils.deleteDirectory(monitorConfigPath.toFile());
      FileUtils.deleteDirectory(eventsDeltalake.toFile());
    }
  }

  @Test
  public void testParsingEntitySchema() {
    String json =
        "{\"id\":\"f6aebc44-3c05-45c4-9cd4-6483487d67ba\",\"schemaVersion\":1,\"orgId\":\"org-4817\",\"datasetId\":\"model-6\",\"granularity\":\"daily\",\"metadata\":{\"schemaVersion\":1,\"author\":\"WhyLabs System\",\"updatedTimestamp\":1661300191456,\"version\":1},\"analyzers\":[{\"id\":\"missing-data-analyzer\",\"schedule\":{\"type\":\"fixed\",\"cadence\":\"daily\"},\"disabled\":false,\"targetMatrix\":{\"type\":\"dataset\"},\"backfillGracePeriodDuration\":\"P30D\",\"config\":{\"metric\":\"missingDatapoint\",\"type\":\"fixed\",\"upper\":0}},{\"id\":\"continuous-distribution-ec3bf841\",\"schedule\":{\"type\":\"fixed\",\"cadence\":\"daily\"},\"disabled\":false,\"targetMatrix\":{\"type\":\"column\",\"include\":[\"group:continuous\"]},\"backfillGracePeriodDuration\":\"P30D\",\"config\":{\"metric\":\"histogram\",\"type\":\"drift\",\"algorithm\":\"hellinger\",\"threshold\":0.7,\"minBatchSize\":1,\"baseline\":{\"type\":\"TrailingWindow\",\"size\":28}}},{\"id\":\"discrete-distribution-499ccc20\",\"schedule\":{\"type\":\"fixed\",\"cadence\":\"daily\"},\"disabled\":false,\"targetMatrix\":{\"type\":\"column\",\"include\":[\"group:discrete\"]},\"backfillGracePeriodDuration\":\"P30D\",\"config\":{\"metric\":\"frequent_items\",\"type\":\"drift\",\"algorithm\":\"hellinger\",\"threshold\":0.7,\"minBatchSize\":1,\"baseline\":{\"type\":\"TrailingWindow\",\"size\":28}}},{\"id\":\"missing-values-ratio-ecfadfc3\",\"schedule\":{\"type\":\"fixed\",\"cadence\":\"daily\"},\"disabled\":false,\"targetMatrix\":{\"type\":\"column\",\"include\":[\"*\"]},\"backfillGracePeriodDuration\":\"P30D\",\"config\":{\"metric\":\"count_null_ratio\",\"type\":\"stddev\",\"factor\":2,\"minBatchSize\":1,\"baseline\":{\"type\":\"TrailingWindow\",\"size\":28}}},{\"id\":\"unique-ratio-2af4b3cf\",\"schedule\":{\"type\":\"fixed\",\"cadence\":\"daily\"},\"disabled\":false,\"targetMatrix\":{\"type\":\"column\",\"include\":[\"*\"]},\"backfillGracePeriodDuration\":\"P30D\",\"config\":{\"metric\":\"unique_est_ratio\",\"type\":\"stddev\",\"factor\":2,\"minBatchSize\":1,\"baseline\":{\"type\":\"TrailingWindow\",\"size\":28}}},{\"id\":\"inferred-data-type-ad37934a\",\"schedule\":{\"type\":\"fixed\",\"cadence\":\"daily\"},\"disabled\":false,\"targetMatrix\":{\"type\":\"column\",\"include\":[\"*\"]},\"backfillGracePeriodDuration\":\"P30D\",\"config\":{\"metric\":\"inferred_data_type\",\"type\":\"comparison\",\"operator\":\"eq\",\"baseline\":{\"type\":\"TrailingWindow\",\"size\":28}}}],\"monitors\":[{\"id\":\"missing-data-analyzer-monitor\",\"analyzerIds\":[\"missing-data-analyzer\"],\"schedule\":{\"type\":\"immediate\"},\"severity\":3,\"mode\":{\"type\":\"DIGEST\",\"creationTimeOffset\":\"PT2H\",\"datasetTimestampOffset\":\"PT26H\"},\"actions\":[]},{\"id\":\"continuous-distribution-ec3bf841-monitor\",\"analyzerIds\":[\"continuous-distribution-ec3bf841\"],\"schedule\":{\"type\":\"immediate\"},\"severity\":3,\"mode\":{\"type\":\"DIGEST\",\"creationTimeOffset\":\"PT2H\",\"datasetTimestampOffset\":\"PT26H\"},\"actions\":[]},{\"id\":\"discrete-distribution-499ccc20-monitor\",\"analyzerIds\":[\"discrete-distribution-499ccc20\"],\"schedule\":{\"type\":\"immediate\"},\"severity\":3,\"mode\":{\"type\":\"DIGEST\",\"creationTimeOffset\":\"PT2H\",\"datasetTimestampOffset\":\"PT26H\"},\"actions\":[]},{\"id\":\"missing-values-ratio-ecfadfc3-monitor\",\"analyzerIds\":[\"missing-values-ratio-ecfadfc3\"],\"schedule\":{\"type\":\"immediate\"},\"severity\":3,\"mode\":{\"type\":\"DIGEST\",\"creationTimeOffset\":\"PT2H\",\"datasetTimestampOffset\":\"PT26H\"},\"actions\":[]},{\"id\":\"unique-ratio-2af4b3cf-monitor\",\"analyzerIds\":[\"unique-ratio-2af4b3cf\"],\"schedule\":{\"type\":\"immediate\"},\"severity\":3,\"mode\":{\"type\":\"DIGEST\",\"creationTimeOffset\":\"PT2H\",\"datasetTimestampOffset\":\"PT26H\"},\"actions\":[]},{\"id\":\"inferred-data-type-ad37934a-monitor\",\"analyzerIds\":[\"inferred-data-type-ad37934a\"],\"schedule\":{\"type\":\"immediate\"},\"severity\":3,\"mode\":{\"type\":\"DIGEST\",\"creationTimeOffset\":\"PT2H\",\"datasetTimestampOffset\":\"PT26H\"},\"actions\":[]}],\"entitySchema\":{\"metadata\":{\"author\":\"WhyLabs System\",\"version\":2,\"updatedTimestamp\":1661300191492},\"columns\":{\"start_state_abr\":{\"discreteness\":\"continuous\",\"dataType\":\"string\",\"classifier\":\"input\"},\"end_zip\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"routing_type\":{\"discreteness\":\"continuous\",\"dataType\":\"string\",\"classifier\":\"input\"},\"pickup_hour_of_day\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"total_weight_lbs\":{\"discreteness\":\"continuous\",\"dataType\":\"fractional\",\"classifier\":\"input\"},\"miles\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"should_hold_at_airlines\":{\"discreteness\":\"continuous\",\"dataType\":\"boolean\",\"classifier\":\"input\"},\"end_state_abr\":{\"discreteness\":\"continuous\",\"dataType\":\"string\",\"classifier\":\"input\"},\"start_city\":{\"discreteness\":\"continuous\",\"dataType\":\"string\",\"classifier\":\"input\"},\"has_dangerous_goods\":{\"discreteness\":\"continuous\",\"dataType\":\"boolean\",\"classifier\":\"input\"},\"international\":{\"discreteness\":\"continuous\",\"dataType\":\"boolean\",\"classifier\":\"input\"},\"required_vehicle_type\":{\"discreteness\":\"continuous\",\"dataType\":\"string\",\"classifier\":\"input\"},\"end_city\":{\"discreteness\":\"continuous\",\"dataType\":\"string\",\"classifier\":\"input\"},\"pickup_zip\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"start_zip\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"end_country_abr\":{\"discreteness\":\"continuous\",\"dataType\":\"string\",\"classifier\":\"input\"},\"driver_workflow_type_id\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"hours\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"company_id\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"minutes\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"pickup_day_of_week\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"total_distance_miles\":{\"discreteness\":\"continuous\",\"dataType\":\"fractional\",\"classifier\":\"input\"},\"start_country_abr\":{\"discreteness\":\"continuous\",\"dataType\":\"string\",\"classifier\":\"input\"},\"driver_workflow_id\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"response\":{\"discreteness\":\"continuous\",\"dataType\":\"fractional\",\"classifier\":\"input\"},\"repeating_order_schedule_id\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"has_organs\":{\"discreteness\":\"continuous\",\"dataType\":\"boolean\",\"classifier\":\"input\"},\"delivery_zip\":{\"discreteness\":\"continuous\",\"dataType\":\"integral\",\"classifier\":\"input\"},\"end_iata_code\":{\"discreteness\":\"discrete\",\"dataType\":\"null\",\"classifier\":\"input\"},\"start_iata_code\":{\"discreteness\":\"discrete\",\"dataType\":\"null\",\"classifier\":\"input\"}}}}";
    val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    assertEquals(30, conf.getEntitySchema().getColumns().size());
  }

  @SneakyThrows
  @Test
  public void testClassificationModelMonthly() throws JsonProcessingException {
    val monitorConfigPath = Files.createTempDirectory("monitors.deltalake");
    val eventsDeltalake = Files.createTempDirectory("events");

    val baseline = TrailingWindowBaseline.builder().size(14).build();
    List<Analyzer> analyzers = new ArrayList<>();
    for (val metric :
        Arrays.asList(
            "classification.recall",
            "classification.fpr",
            "classification.precision",
            "classification.accuracy",
            "classification.f1")) {
      analyzers.add(
          Analyzer.builder()
              .id(metric + "_analyzer")
              .disabled(false)
              .config(
                  StddevConfig.builder()
                      .version(1)
                      .metric(metric)
                      .baseline(baseline)
                      .minBatchSize(14)
                      .factor(2.0)
                      .build())
              .targetMatrix(DatasetMatrix.builder().build())
              .schedule(CronSchedule.builder().cron("0 * * * *").build())
              .build());
    }

    monitorConfigV3 =
        MonitorConfigV3.builder()
            .id(UUID.randomUUID().toString())
            .updatedTs(System.currentTimeMillis())
            .orgId("org-0")
            .datasetId("model-303")
            .analyzers(analyzers)
            // Notable for this unit test
            .allowPartialTargetBatches(true)
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.monthly)
            .build();

    String monitorConfigJson = MonitorConfigV3JsonSerde.toString(monitorConfigV3);

    try {
      createMonitorConfigs(spark, monitorConfigJson, monitorConfigPath);

      String inputProfilesPath =
          Objects.requireNonNull(getClass().getResource("/classification/profiletable-v1ified"))
              .getPath();

      EventsJobV3 eventsJob = new EventsJobV3();
      eventsJob.setSpark(spark);
      val args =
          ImmutableList.of(
                  // spotless:off
                              "-sparkMaster", "local[*]",
                              "-profilesDatalakeV2", inputProfilesPath,
                              /**
                               * Most recent datapoint in the data is Thu Oct 14 2021 00:00:00 GMT+0000 so
                               * it should be eligable for monthly monitoring Oct 1st because
                               * allowPartialTargetBatches is set to true
                               */
                              "-currentTime", "2021-10-01T00:00:00Z",
                              "-monitorsConfigV3", monitorConfigPath.toString(),
                              "-analyzerResultsPath", eventsDeltalake.toString(),
                              "-duration", Granularity.P1D.name(),
                              "-overwriteEvents",
                              "-appendMode",
                              "true"
                              // spotless:on
                  )
              .toArray(new String[0]);

      ConfigAwsSdk.defaults();
      DateTimeZone.setDefault(DateTimeZone.UTC);
      eventsJob.apply(args);
      eventsJob.runBefore();
      val result =
          FillMissingColumns.fillMissingColumnsWitNulls(
              eventsJob.calculate(), AnalyzerResult.class.getDeclaredFields());

      val events =
          result
              .as(Encoders.bean(AnalyzerResult.class))
              .select(functions.max(Fields.datasetTimestamp).as(Fields.datasetTimestamp))
              .collectAsList();
      // Oct 1st datapoint should have been calculated b/c partial targets are allowed
      assertEquals(
          Optional.of(1633046400000l), Optional.of(events.get(0).getAs(Fields.datasetTimestamp)));
    } finally {
      FileUtils.deleteDirectory(monitorConfigPath.toFile());
      FileUtils.deleteDirectory(eventsDeltalake.toFile());
    }
  }

  // One-off utility for converting deltalakes in unit tests
  /*
  @Test
  public void runProfilesDatalakeV0ToV1Migration() {
    Dataset<Org> orgs = spark.createDataset(new ArrayList<Org>(), Encoders.bean(Org.class));

    val df =
        FillMissingColumns.fillMissingColumnsWitNulls(
                DeltaTable.forPath(
                        spark,
                        "/Users/drew/whylabs/whylabs-processing-core5/murmuration/src/test/resources/regression/profiletable")
                    .toDF(),
                DatalakeRow.class.getDeclaredFields())
            .as(Encoders.bean(DatalakeRow.class));
    df.joinWith(orgs, df.col(DatalakeRow.Fields.orgId).equalTo(orgs.col(Org.Fields.orgId)), "left")
        .flatMap(new ProfilesDatalakeV0ToV1Row(), Encoders.bean(DatalakeRowV1.class))
        .write()
    .format("delta")
    .partitionBy(DatalakeRowV1.Fields.yyyymmdd)
    .mode(SaveMode.Overwrite)
    .save("/Users/drew/whylabs/whylabs-processing-core5/murmuration/src/test/resources/regression/profiletable-v1");
  }*/

}
