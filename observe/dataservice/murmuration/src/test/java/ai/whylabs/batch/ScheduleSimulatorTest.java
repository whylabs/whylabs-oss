package ai.whylabs.batch;

import static org.mockito.ArgumentMatchers.any;
import static org.testng.AssertJUnit.*;

import ai.whylabs.adhoc.BackfillExplanationRunner;
import ai.whylabs.batch.utils.MockCalculation;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.CronSchedule;
import ai.whylabs.core.configV3.structure.TimeRange;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.predicatesV3.baseline.TrailingWindowExclusionPredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.BackfillAnalyzerRequest;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.TreeMap;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.mockito.Mockito;
import org.testng.annotations.Test;

@Slf4j
public class ScheduleSimulatorTest {

  private BackfillExplanationRunner backfillExplanationRunner = new BackfillExplanationRunner();

  @Test
  public void testFixedCadenceDelayDuration() {
    String config =
        "{\n"
            + "  \"id\": \"12345678-1234-5678-1234-567812345678\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"columns\": {}\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            // + "      \"dataReadinessDuration\": \"P2D\",\n"
            + "      \"backfillGracePeriodDuration\": \"P14D\",\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"threshold\": \".7\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": []\n"
            + "}";

    ZonedDateTime start = ZonedDateTime.of(2021, 1, 1, 19, 0, 0, 0, ZoneOffset.UTC);

    /** With a user initiated backfill the gates open wide open * */
    val backfillRequest =
        BackfillAnalyzerRequest.builder()
            .orgId("org-0")
            .datasetId("model-0")
            .start(0l)
            .overwrite(true)
            .end(Long.MAX_VALUE)
            .analyzers(Arrays.asList("analyzer"))
            .build();

    val currentTimeBackfill = ZonedDateTime.of(2021, 9, 22, 21, 0, 0, 0, ZoneOffset.UTC);
    val backfillRunner =
        backfillExplanationRunner.getRunner(config, currentTimeBackfill, backfillRequest);

    /** Before delay (17h) * */
    val currentTimeTooEarly = ZonedDateTime.of(2021, 9, 22, 17, 0, 0, 0, ZoneOffset.UTC);
    val runnerTooEarly = backfillExplanationRunner.getRunner(config, currentTimeTooEarly, null);
    val resultsTooEarly =
        backfillExplanationRunner.fuzzData(runnerTooEarly, start, 365, null, TargetLevel.column);
    assertRange("2021-09-09T00:00Z", "2021-09-20T00:00Z", resultsTooEarly);

    /** Equals delay (19h) * */
    val currentTime19 = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner19 = backfillExplanationRunner.getRunner(config, currentTime19, null);
    val results19 =
        backfillExplanationRunner.fuzzData(runner19, start, 365, null, TargetLevel.column);
    assertRange("2021-09-09T00:00Z", "2021-09-21T00:00Z", results19);

    /** After delay (21hr) */
    val currentTime = ZonedDateTime.of(2021, 9, 22, 21, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.column);
    for (val r : results) {
      assertEquals(java.util.Optional.of(0l), Optional.of(r.getUserInitiatedBackfill()));
    }

    assertRange("2021-09-09T00:00Z", "2021-09-21T00:00Z", results);
    // 14d grace period on the backfill calculated backwards from current time, all data present
    assertEquals(13, results.size());
  }

  @Test
  public void testDataReadinessDuration() {
    String config =
        "{\n"
            + "  \"id\": \"12345678-1234-5678-1234-567812345678\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"columns\": {}\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"dataReadinessDuration\": \"P5D\",\n"
            + "      \"backfillGracePeriodDuration\": \"P14D\",\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"threshold\": \".7\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": []\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 1, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.column);

    // 14d backfill grace period - 5d data readiness duration
    // 2021-09-17T00:00Z - Data readiness at 5d requires target batches to be 5d old
    assertEquals(9, results.size());
    assertRange("2021-09-09T00:00Z", "2021-09-16T00:00Z", results);
  }

  @Test
  public void testFixedDurationNoDelay() {
    String config =
        "{\n"
            + "  \"id\": \"12345678-1234-5678-1234-567812345678\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"columns\": {}\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": \"P14D\",\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"threshold\": \".7\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": []\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 1, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.column);

    // 14d backfill grace period - 5d data readiness duration
    // 2021-09-17T00:00Z - Data readiness at 5d requires target batches to be 5d old
    assertRange("2021-09-09T00:00Z", "2021-09-21T00:00Z", results);
    assertEquals(13, results.size());
  }

  @Test
  public void testFeedbackLoopAccumulatesAsYouBackfill() {
    String config =
        "{\n"
            + "  \"id\": \"12345678-1234-5678-1234-567812345678\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"columns\": {}\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\"\n"
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": \"P14D\",\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"threshold\": \".7\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": []\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 1, 19, 0, 0, 0, ZoneOffset.UTC);
    val mockCalculationFactory = Mockito.mock(CalculationFactory.class);
    val runner =
        backfillExplanationRunner.getRunner(config, currentTime, null, mockCalculationFactory);
    val configv3 = MonitorConfigV3JsonSerde.parseMonitorConfigV3(config);

    val mockAnalyzer = new MockCalculation(configv3, configv3.getAnalyzers().get(0), false, null);

    Mockito.when(mockCalculationFactory.toCalculation(any(Analyzer.class), any(), any()))
        .thenReturn(mockAnalyzer);

    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.column);

    // 14d backfill grace period - 5d data readiness duration
    // 2021-09-17T00:00Z - Data readiness at 5d requires target batches to be 5d old
    assertRange("2021-09-09T00:00Z", "2021-09-21T00:00Z", results);
    assertEquals(13, results.size());
    assertEquals(13, mockAnalyzer.getInvocationPriorResults().size());
    assertNull(mockAnalyzer.getInvocationPriorResults().get(0));

    val priorResults = mockAnalyzer.getInvocationPriorResults();
    /**
     * As we roll 12d of backfill, each day going forward should have accumulated prior datapoints
     * in the feedback loop.
     */

    // day 1 (not zero)
    assertEquals(1l, priorResults.get(1l).size());

    // day 12
    assertEquals(12l, priorResults.get(12l).size());

    TreeMap<Long, CalculationResult> sorted = new TreeMap<>();
    // Lets dive deeper int day 12
    for (val p : priorResults.get(12l)) {
      sorted.put(p.getKey(), p.getValue());
    }

    // 12 days in the feedback loop should have 12d of feedback. Spot check the 1st, middle, last
    // datapoints in the feedback loop
    assertEquals(sorted.get(1631145600000l).getAlertCount(), 1l, 0.0);
    assertEquals(sorted.get(1631577600000l).getAlertCount(), 6l, 0.0);
    assertEquals(sorted.get(1632096000000l).getAlertCount(), 12l, 0.0);
  }

  @Test
  public void testHourlyModel() {
    String config =
        "{\n"
            + "  \"id\": \"12345678-1234-5678-1234-567812345678\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"hourly\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"columns\": {}\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"hourly\",\n" // Hourly analyzer on hourly dataset
            + "        \"delayDuration\": \"PT2H\"\n" // Not enough to cut anything off if its
            // running wednesday
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": \"P90D\",\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"threshold\": \".7\"\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"analyzerDaily\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n" // Daily analyzer on hourly model should only run
            // once per day
            + "        \"delayDuration\": \"PT2H\"\n" // Not enough to cut anything off if its
            // running wednesday
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": \"P90D\",\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"threshold\": \".7\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": []\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 1, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.column);

    assertRange("2021-06-28T00:00Z", "2021-09-13T00:00Z", results);
    assertEquals(results.size(), 2250);
  }

  @Test
  public void testWeeklyModel() {
    String config =
        "{\n"
            + "  \"id\": \"12345678-1234-5678-1234-567812345678\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"weekly\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"columns\": {}\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"weekly\",\n"
            + "        \"delayDuration\": \"PT2H\"\n" // Not enough to cut anything off if its
            // running wednesday
            + "      },\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": \"P90D\",\n"
            + "      \"config\": {\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"type\": \"drift\",\n"
            + "        \"algorithm\": \"hellinger\",\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"threshold\": \".7\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": []\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 1, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.column);

    assertRange("2021-06-28T00:00Z", "2021-09-13T00:00Z", results);
    assertEquals(results.size(), 12);
  }

  private void assertRange(String min, String max, List<AnalyzerResult> results) {
    boolean foundMin = false;
    boolean foundMax = false;
    for (val r : results) {
      String d =
          ZonedDateTime.ofInstant(Instant.ofEpochMilli(r.getDatasetTimestamp()), ZoneOffset.UTC)
              .toString();
      log.info("Result had timestamp {}", d.toString());
      if (d.equals(min)) {
        foundMin = true;
      }
      if (d.equals(max)) {
        foundMax = true;
      }
    }
    assertTrue(foundMin);
    assertTrue(foundMax);
  }

  @Test
  public void testMultiAnalyzerConfig() {
    String config =
        "{\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "    \"granularity\": \"daily\",\n"
            + "    \"metadata\": {\n"
            + "      \"schemaVersion\": 1,\n"
            + "      \"author\": \"WhyLabs System\",\n"
            + "      \"updatedTimestamp\": 1660067515796,\n"
            + "      \"version\": 18\n"
            + "    },\n"
            + "    \"analyzers\": [\n"
            + "      {\n"
            + "        \"config\": {\n"
            + "          \"algorithm\": \"hellinger\",\n"
            + "          \"baseline\": {\n"
            + "            \"size\": 7,\n"
            + "            \"type\": \"TrailingWindow\"\n"
            + "          },\n"
            + "          \"metric\": \"frequent_items\",\n"
            + "          \"minBatchSize\": 7,\n"
            + "          \"threshold\": 0.7,\n"
            + "          \"type\": \"drift\"\n"
            + "        },\n"
            + "        \"id\": \"frequent-items-drift-analyzer\",\n"
            + "        \"schedule\": {\n"
            + "          \"cadence\": \"daily\",\n"
            + "          \"type\": \"fixed\"\n"
            + "        },\n"
            + "        \"targetMatrix\": {\n"
            + "          \"include\": [\n"
            + "            \"group:discrete\"\n"
            + "          ],\n"
            + "          \"exclude\": [\n"
            + "            \"group:output\"\n"
            + "          ],\n"
            + "          \"segments\": [\n"
            + "            {\n"
            + "              \"tags\": []\n"
            + "            }\n"
            + "          ],\n"
            + "          \"type\": \"column\"\n"
            + "        },\n"
            + "        \"metadata\": {\n"
            + "          \"schemaVersion\": 1,\n"
            + "          \"author\": \"WhyLabs System\",\n"
            + "          \"updatedTimestamp\": 1660051862144,\n"
            + "          \"version\": 1\n"
            + "        }\n"
            + "      },\n"
            + "      {\n"
            + "        \"config\": {\n"
            + "          \"algorithm\": \"hellinger\",\n"
            + "          \"baseline\": {\n"
            + "            \"size\": 7,\n"
            + "            \"type\": \"TrailingWindow\"\n"
            + "          },\n"
            + "          \"metric\": \"histogram\",\n"
            + "          \"minBatchSize\": 7,\n"
            + "          \"threshold\": 0.7,\n"
            + "          \"type\": \"drift\"\n"
            + "        },\n"
            + "        \"id\": \"numerical-drift-analyzer\",\n"
            + "        \"schedule\": {\n"
            + "          \"cadence\": \"daily\",\n"
            + "          \"type\": \"fixed\"\n"
            + "        },\n"
            + "        \"targetMatrix\": {\n"
            + "          \"include\": [\n"
            + "            \"group:continuous\"\n"
            + "          ],\n"
            + "          \"exclude\": [\n"
            + "            \"group:output\"\n"
            + "          ],\n"
            + "          \"segments\": [\n"
            + "            {\n"
            + "              \"tags\": []\n"
            + "            }\n"
            + "          ],\n"
            + "          \"type\": \"column\"\n"
            + "        },\n"
            + "        \"metadata\": {\n"
            + "          \"schemaVersion\": 1,\n"
            + "          \"author\": \"WhyLabs System\",\n"
            + "          \"updatedTimestamp\": 1660051863918,\n"
            + "          \"version\": 1\n"
            + "        }\n"
            + "      },\n"
            + "      {\n"
            + "        \"id\": \"cute-bisque-dolphin-1421-analyzer\",\n"
            + "        \"schedule\": {\n"
            + "          \"type\": \"fixed\",\n"
            + "          \"cadence\": \"daily\"\n"
            + "        },\n"
            + "        \"targetMatrix\": {\n"
            + "          \"type\": \"column\",\n"
            + "          \"include\": [\n"
            + "            \"group:discrete\"\n"
            + "          ],\n"
            + "          \"exclude\": [\n"
            + "            \"group:output\"\n"
            + "          ],\n"
            + "          \"segments\": []\n"
            + "        },\n"
            + "        \"config\": {\n"
            + "          \"metric\": \"count_null_ratio\",\n"
            + "          \"type\": \"fixed\",\n"
            + "          \"upper\": 0.15,\n"
            + "          \"lower\": 0\n"
            + "        },\n"
            + "        \"metadata\": {\n"
            + "          \"schemaVersion\": 1,\n"
            + "          \"author\": \"WhyLabs System\",\n"
            + "          \"updatedTimestamp\": 1660067515049,\n"
            + "          \"version\": 1\n"
            + "        }\n"
            + "      }\n"
            + "    ],\n"
            + "    \"monitors\": [\n"
            + "      {\n"
            + "        \"id\": \"frequent-items-drift-monitor\",\n"
            + "        \"displayName\": \"Frequent Items Drift Preset Monitor\",\n"
            + "        \"analyzerIds\": [\n"
            + "          \"frequent-items-drift-analyzer\"\n"
            + "        ],\n"
            + "        \"schedule\": {\n"
            + "          \"cadence\": \"daily\",\n"
            + "          \"type\": \"fixed\"\n"
            + "        },\n"
            + "        \"mode\": {\n"
            + "          \"type\": \"EVERY_ANOMALY\"\n"
            + "        },\n"
            + "        \"disabled\": false,\n"
            + "        \"actions\": [],\n"
            + "        \"metadata\": {\n"
            + "          \"schemaVersion\": 1,\n"
            + "          \"author\": \"WhyLabs System\",\n"
            + "          \"updatedTimestamp\": 1660051862919,\n"
            + "          \"version\": 1\n"
            + "        }\n"
            + "      },\n"
            + "      {\n"
            + "        \"id\": \"numerical-drift-monitor\",\n"
            + "        \"displayName\": \"Numerical Drift Preset Monitor\",\n"
            + "        \"analyzerIds\": [\n"
            + "          \"numerical-drift-analyzer\"\n"
            + "        ],\n"
            + "        \"schedule\": {\n"
            + "          \"cadence\": \"daily\",\n"
            + "          \"type\": \"fixed\"\n"
            + "        },\n"
            + "        \"mode\": {\n"
            + "          \"type\": \"EVERY_ANOMALY\"\n"
            + "        },\n"
            + "        \"disabled\": false,\n"
            + "        \"actions\": [],\n"
            + "        \"metadata\": {\n"
            + "          \"schemaVersion\": 1,\n"
            + "          \"author\": \"WhyLabs System\",\n"
            + "          \"updatedTimestamp\": 1660051864655,\n"
            + "          \"version\": 1\n"
            + "        }\n"
            + "      },\n"
            + "      {\n"
            + "        \"id\": \"cute-bisque-dolphin-1421\",\n"
            + "        \"displayName\": \"cute-bisque-dolphin-1421\",\n"
            + "        \"analyzerIds\": [\n"
            + "          \"cute-bisque-dolphin-1421-analyzer\"\n"
            + "        ],\n"
            + "        \"schedule\": {\n"
            + "          \"type\": \"immediate\"\n"
            + "        },\n"
            + "        \"severity\": 3,\n"
            + "        \"mode\": {\n"
            + "          \"type\": \"DIGEST\",\n"
            + "          \"creationTimeOffset\": \"P1D\",\n"
            + "          \"datasetTimestampOffset\": \"P7D\"\n"
            + "        },\n"
            + "        \"actions\": [],\n"
            + "        \"metadata\": {\n"
            + "          \"schemaVersion\": 1,\n"
            + "          \"author\": \"WhyLabs System\",\n"
            + "          \"updatedTimestamp\": 1660067515786,\n"
            + "          \"version\": 1\n"
            + "        }\n"
            + "      }\n"
            + "    ],\n"
            + "    \"entitySchema\": {\n"
            + "      \"metadata\": {\n"
            + "        \"author\": \"WhyLabs System\",\n"
            + "        \"version\": 3,\n"
            + "        \"updatedTimestamp\": 1660066683792\n"
            + "      },\n"
            + "      \"columns\": {\n"
            + "        \"date\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"unknown\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"alldifffloat\": {\n"
            + "          \"discreteness\": \"continuous\",\n"
            + "          \"dataType\": \"fractional\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"negfloat\": {\n"
            + "          \"discreteness\": \"continuous\",\n"
            + "          \"dataType\": \"fractional\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"mainlynullwithint\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"contint\": {\n"
            + "          \"discreteness\": \"continuous\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"negint\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"float\": {\n"
            + "          \"discreteness\": \"continuous\",\n"
            + "          \"dataType\": \"fractional\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"contdate\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"unknown\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"inttofloat\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"int\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"str\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"string\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"alldiffint\": {\n"
            + "          \"discreteness\": \"continuous\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"null\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"unknown\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"strtoint\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"string\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"bigint\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"alldiffstr\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"string\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"doublingnull\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"doublingunique\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"doublingnull2\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        },\n"
            + "        \"doublingunique2\": {\n"
            + "          \"discreteness\": \"discrete\",\n"
            + "          \"dataType\": \"integral\",\n"
            + "          \"classifier\": \"input\"\n"
            + "        }\n"
            + "      }\n"
            + "    }\n"
            + "  }";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 1, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.column);
    // Not expecting any output per say, just that it doesn't blow up instantiating the calculations
    // per https://app.clickup.com/t/3r2h6kx
  }

  @Test
  public void testSecondsSinceLastUploadAnalyzer() {
    String config =
        "{\n"
            + "  \"id\": \"351bf3cb-705a-4cb8-a727-1839e5052a1a\",\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"metadata\": {\n"
            + "      \"version\": 1,\n"
            + "      \"updatedTimestamp\": 1662146426963,\n"
            + "      \"author\": \"system\"\n"
            + "    },\n"
            + "    \"columns\": {\n"
            + "      \"ORDER_LINE_AMOUNT\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"FRACTIONAL\"\n"
            + "      },\n"
            + "      \"ORDER_LINE_QUANTITY\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"INTEGRAL\"\n"
            + "      }\n"
            + "    }\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"seasonal-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n"
            + "        \"exclusionRanges\": []\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": [\n"
            + "              {\n"
            + "                \"key\": \"last_routed_node_type\",\n"
            + "                \"value\": \"*\"\n"
            + "              }\n"
            + "            ]\n"
            + "          },\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": 31536000,\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "      \"config\": {\n"
            + "        \"type\": \"seasonal\",\n"
            + "        \"params\": {\n"
            + "          \"enableAnomalyCharts\": \"True\"\n"
            + "        },\n"
            + "        \"metric\": \"median\",\n"
            + "        \"maxUpperThreshold\": \"Infinity\",\n"
            + "        \"minLowerThreshold\": \"-Infinity\",\n"
            + "        \"algorithm\": \"arima\",\n"
            + "        \"alpha\": 0.05,\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00+00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00+00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00+00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00+00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"stddevMaxBatchSize\": 30,\n"
            + "        \"stddevFactor\": 3,\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"analyzerType\": \"seasonal\"\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-profile-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n"
            + "        \"exclusionRanges\": []\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"dataset\",\n"
            + "        \"level\": \"dataset\"\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": 31536000,\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "      \"config\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"metric\": \"secondsSinceLastUpload\",\n"
            + "        \"upper\": 86400,\n"
            + "        \"analyzerType\": \"fixed\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": [\n"
            + "    {\n"
            + "      \"id\": \"seasonal-analyzer-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"seasonal-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 4,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"PT2H\",\n"
            + "        \"datasetTimestampOffset\": \"P2D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"pagerDuty\"\n"
            + "        }\n"
            + "      ]\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-profile-analyzer-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"missing-profile-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 4,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"PT2H\",\n"
            + "        \"datasetTimestampOffset\": \"P2D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"pagerDuty\"\n"
            + "        }\n"
            + "      ]\n"
            + "    }\n"
            + "  ],\n"
            + "  \"metadata\": {\n"
            + "    \"version\": 12,\n"
            + "    \"schemaVersion\": 1,\n"
            + "    \"updatedTimestamp\": 1662146426894,\n"
            + "    \"author\": \"system\"\n"
            + "  }\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 0, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 5, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.dataset);
    int c = 0;
    for (val r : results) {
      if (r.getAnalyzerId().equals("missing-profile-analyzer")) {
        c++;
        // Tue Sep 21 2021 00:00:00 GMT+0000
        assertEquals(Optional.of(1632268800000l), Optional.of(r.getDatasetTimestamp()));
      }
    }
    assertEquals(1, c);
    assertEquals(results.size(), 1);
  }

  @Test
  public void testMissingDatapointAnalyzer() {
    String config =
        "{\n"
            + "  \"id\": \"351bf3cb-705a-4cb8-a727-1839e5052a1a\",\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"metadata\": {\n"
            + "      \"version\": 1,\n"
            + "      \"updatedTimestamp\": 1662146426963,\n"
            + "      \"author\": \"system\"\n"
            + "    },\n"
            + "    \"columns\": {\n"
            + "      \"ORDER_LINE_AMOUNT\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"FRACTIONAL\"\n"
            + "      },\n"
            + "      \"ORDER_LINE_QUANTITY\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"INTEGRAL\"\n"
            + "      }\n"
            + "    }\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"seasonal-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n"
            + "        \"exclusionRanges\": []\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": [\n"
            + "              {\n"
            + "                \"key\": \"last_routed_node_type\",\n"
            + "                \"value\": \"*\"\n"
            + "              }\n"
            + "            ]\n"
            + "          },\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": 31536000,\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "      \"config\": {\n"
            + "        \"type\": \"seasonal\",\n"
            + "        \"params\": {\n"
            + "          \"enableAnomalyCharts\": \"True\"\n"
            + "        },\n"
            + "        \"metric\": \"median\",\n"
            + "        \"maxUpperThreshold\": \"Infinity\",\n"
            + "        \"minLowerThreshold\": \"-Infinity\",\n"
            + "        \"algorithm\": \"arima\",\n"
            + "        \"alpha\": 0.05,\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00+00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00+00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00+00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00+00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"stddevMaxBatchSize\": 30,\n"
            + "        \"stddevFactor\": 3,\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"analyzerType\": \"seasonal\"\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-datapoint-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n"
            + "        \"exclusionRanges\": []\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"dataset\",\n"
            + "        \"level\": \"dataset\"\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": 31536000,\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "      \"config\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"metric\": \"missingDatapoint\",\n"
            + "        \"upper\": 0.0,\n"
            + "        \"analyzerType\": \"fixed\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": [\n"
            + "    {\n"
            + "      \"id\": \"seasonal-analyzer-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"seasonal-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 4,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"PT2H\",\n"
            + "        \"datasetTimestampOffset\": \"P2D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"pagerDuty\"\n"
            + "        }\n"
            + "      ]\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-profile-analyzer-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"missing-profile-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 4,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"PT2H\",\n"
            + "        \"datasetTimestampOffset\": \"P2D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"pagerDuty\"\n"
            + "        }\n"
            + "      ]\n"
            + "    }\n"
            + "  ],\n"
            + "  \"metadata\": {\n"
            + "    \"version\": 12,\n"
            + "    \"schemaVersion\": 1,\n"
            + "    \"updatedTimestamp\": 1662146426894,\n"
            + "    \"author\": \"system\"\n"
            + "  }\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 5, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.dataset);
    for (val r : results) {
      assertEquals(
          Optional.ofNullable(r.getDatasetTimestamp()),
          Optional.of(
              ZonedDateTime.ofInstant(Instant.ofEpochMilli(r.getDatasetTimestamp()), ZoneOffset.UTC)
                  .truncatedTo(ChronoUnit.DAYS)
                  .toInstant()
                  .toEpochMilli()));
    }

    assertEquals(results.size(), 259);
  }

  /**
   * This test is nifty because it validates that daily analyzers don't affect the hourly cadence of
   * the missing data analyzer as its configured
   */
  @Test
  public void testMissingHourlyDatapointAnalyzer() {
    String config =
        "{\n"
            + "  \"id\": \"351bf3cb-705a-4cb8-a727-1839e5052a1a\",\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"hourly\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"metadata\": {\n"
            + "      \"version\": 1,\n"
            + "      \"updatedTimestamp\": 1662146426963,\n"
            + "      \"author\": \"system\"\n"
            + "    },\n"
            + "    \"columns\": {\n"
            + "      \"ORDER_LINE_AMOUNT\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"FRACTIONAL\"\n"
            + "      },\n"
            + "      \"ORDER_LINE_QUANTITY\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"INTEGRAL\"\n"
            + "      }\n"
            + "    }\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"seasonal-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n" // Note daily cadence
            + "        \"exclusionRanges\": []\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": [\n"
            + "              {\n"
            + "                \"key\": \"last_routed_node_type\",\n"
            + "                \"value\": \"*\"\n"
            + "              }\n"
            + "            ]\n"
            + "          },\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": 31536000,\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "      \"config\": {\n"
            + "        \"type\": \"seasonal\",\n"
            + "        \"params\": {\n"
            + "          \"enableAnomalyCharts\": \"True\"\n"
            + "        },\n"
            + "        \"metric\": \"median\",\n"
            + "        \"maxUpperThreshold\": \"Infinity\",\n"
            + "        \"minLowerThreshold\": \"-Infinity\",\n"
            + "        \"algorithm\": \"arima\",\n"
            + "        \"alpha\": 0.05,\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00+00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00+00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00+00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00+00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"stddevMaxBatchSize\": 30,\n"
            + "        \"stddevFactor\": 3,\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"analyzerType\": \"seasonal\"\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-datapoint-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"hourly\",\n" // Note Hourly cadence
            + "        \"exclusionRanges\": []\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"dataset\",\n"
            + "        \"level\": \"dataset\"\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": 31536000,\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "      \"config\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"metric\": \"missingDatapoint\",\n"
            + "        \"upper\": 0.0,\n"
            + "        \"analyzerType\": \"fixed\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": [\n"
            + "    {\n"
            + "      \"id\": \"seasonal-analyzer-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"seasonal-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 4,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"PT2H\",\n"
            + "        \"datasetTimestampOffset\": \"P2D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"pagerDuty\"\n"
            + "        }\n"
            + "      ]\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-profile-analyzer-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"missing-profile-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 4,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"PT2H\",\n"
            + "        \"datasetTimestampOffset\": \"P2D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"pagerDuty\"\n"
            + "        }\n"
            + "      ]\n"
            + "    }\n"
            + "  ],\n"
            + "  \"metadata\": {\n"
            + "    \"version\": 12,\n"
            + "    \"schemaVersion\": 1,\n"
            + "    \"updatedTimestamp\": 1662146426894,\n"
            + "    \"author\": \"system\"\n"
            + "  }\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 5, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.dataset);
    for (val r : results) {
      assertEquals(
          Optional.ofNullable(r.getDatasetTimestamp()),
          Optional.of(
              ZonedDateTime.ofInstant(Instant.ofEpochMilli(r.getDatasetTimestamp()), ZoneOffset.UTC)
                  .truncatedTo(ChronoUnit.HOURS)
                  .toInstant()
                  .toEpochMilli()));
    }

    assertEquals(6199, results.size());
  }

  /**
   * This test is nifty because it validates that a daily analyzer on hourly data only runs once per
   * day
   */
  @Test
  public void testMissingDailyDatapointAnalyzerOnHourlyDataset() {
    String config =
        "{\n"
            + "  \"id\": \"351bf3cb-705a-4cb8-a727-1839e5052a1a\",\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"hourly\",\n"
            + "  \"entitySchema\": {\n"
            + "    \"metadata\": {\n"
            + "      \"version\": 1,\n"
            + "      \"updatedTimestamp\": 1662146426963,\n"
            + "      \"author\": \"system\"\n"
            + "    },\n"
            + "    \"columns\": {\n"
            + "      \"ORDER_LINE_AMOUNT\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"FRACTIONAL\"\n"
            + "      },\n"
            + "      \"ORDER_LINE_QUANTITY\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"classifier\": \"input\",\n"
            + "        \"dataType\": \"INTEGRAL\"\n"
            + "      }\n"
            + "    }\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"seasonal-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n"
            + "        \"exclusionRanges\": []\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": [\n"
            + "              {\n"
            + "                \"key\": \"last_routed_node_type\",\n"
            + "                \"value\": \"*\"\n"
            + "              }\n"
            + "            ]\n"
            + "          },\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": 31536000,\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "      \"config\": {\n"
            + "        \"type\": \"seasonal\",\n"
            + "        \"params\": {\n"
            + "          \"enableAnomalyCharts\": \"True\"\n"
            + "        },\n"
            + "        \"metric\": \"median\",\n"
            + "        \"maxUpperThreshold\": \"Infinity\",\n"
            + "        \"minLowerThreshold\": \"-Infinity\",\n"
            + "        \"algorithm\": \"arima\",\n"
            + "        \"alpha\": 0.05,\n"
            + "        \"stddevTimeRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"2021-11-21T00:00:00+00:00\",\n"
            + "            \"end\": \"2022-01-02T00:00:00+00:00\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2021-07-06T00:00:00+00:00\",\n"
            + "            \"end\": \"2021-08-08T00:00:00+00:00\"\n"
            + "          }\n"
            + "        ],\n"
            + "        \"stddevMaxBatchSize\": 30,\n"
            + "        \"stddevFactor\": 3,\n"
            + "        \"minBatchSize\": 7,\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 90\n"
            + "        },\n"
            + "        \"analyzerType\": \"seasonal\"\n"
            + "      }\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-datapoint-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n" // Note daily schedule
            + "        \"exclusionRanges\": []\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"dataset\",\n"
            + "        \"level\": \"dataset\"\n"
            + "      },\n"
            + "      \"backfillGracePeriodDuration\": 31536000,\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "      \"config\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"metric\": \"missingDatapoint\",\n"
            + "        \"upper\": 0.0,\n"
            + "        \"analyzerType\": \"fixed\"\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": [\n"
            + "    {\n"
            + "      \"id\": \"seasonal-analyzer-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"seasonal-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 4,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"PT2H\",\n"
            + "        \"datasetTimestampOffset\": \"P2D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"pagerDuty\"\n"
            + "        }\n"
            + "      ]\n"
            + "    },\n"
            + "    {\n"
            + "      \"id\": \"missing-profile-analyzer-monitor\",\n"
            + "      \"analyzerIds\": [\n"
            + "        \"missing-profile-analyzer\"\n"
            + "      ],\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"immediate\"\n"
            + "      },\n"
            + "      \"severity\": 4,\n"
            + "      \"mode\": {\n"
            + "        \"type\": \"DIGEST\",\n"
            + "        \"creationTimeOffset\": \"PT2H\",\n"
            + "        \"datasetTimestampOffset\": \"P2D\"\n"
            + "      },\n"
            + "      \"actions\": [\n"
            + "        {\n"
            + "          \"type\": \"global\",\n"
            + "          \"target\": \"pagerDuty\"\n"
            + "        }\n"
            + "      ]\n"
            + "    }\n"
            + "  ],\n"
            + "  \"metadata\": {\n"
            + "    \"version\": 12,\n"
            + "    \"schemaVersion\": 1,\n"
            + "    \"updatedTimestamp\": 1662146426894,\n"
            + "    \"author\": \"system\"\n"
            + "  }\n"
            + "}";

    val currentTime = ZonedDateTime.of(2021, 9, 22, 19, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 5, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(config, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.dataset);
    for (val r : results) {
      assertEquals(
          Optional.ofNullable(r.getDatasetTimestamp()),
          Optional.of(
              ZonedDateTime.ofInstant(Instant.ofEpochMilli(r.getDatasetTimestamp()), ZoneOffset.UTC)
                  .truncatedTo(ChronoUnit.DAYS)
                  .toInstant()
                  .toEpochMilli()));
    }

    assertEquals(results.size(), 259);
  }

  @Test
  public void testOrgZero() {
    String json =
        "{\n"
            + "    \"id\": \"e463721d-91a6-476d-8529-d2843c293e06\",\n"
            + "    \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "    \"granularity\": \"daily\",\n"
            + "    \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"system\",\n"
            + "        \"updatedTimestamp\": 1662589892522,\n"
            + "        \"version\": 222\n"
            + "    },\n"
            + "    \"analyzers\": [\n"
            + "        {\n"
            + "            \"id\": \"continuous-distribution-d705bfd0\",\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"fixed\",\n"
            + "                \"cadence\": \"daily\"\n"
            + "            },\n"
            + "            \"disabled\": false,\n"
            + "            \"targetMatrix\": {\n"
            + "                \"type\": \"column\",\n"
            + "                \"include\": [\n"
            + "                    \"group:continuous\"\n"
            + "                ]\n"
            + "            },\n"
            + "            \"backfillGracePeriodDuration\": \"P30D\",\n"
            + "            \"config\": {\n"
            + "                \"metric\": \"histogram\",\n"
            + "                \"type\": \"drift\",\n"
            + "                \"algorithm\": \"hellinger\",\n"
            + "                \"threshold\": 0.7,\n"
            + "                \"minBatchSize\": 1,\n"
            + "                \"baseline\": {\n"
            + "                    \"type\": \"TrailingWindow\",\n"
            + "                    \"size\": 7\n"
            + "                }\n"
            + "            }\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"discrete-distribution-3ce15ae6\",\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"fixed\",\n"
            + "                \"cadence\": \"daily\"\n"
            + "            },\n"
            + "            \"disabled\": false,\n"
            + "            \"targetMatrix\": {\n"
            + "                \"type\": \"column\",\n"
            + "                \"include\": [\n"
            + "                    \"group:discrete\"\n"
            + "                ]\n"
            + "            },\n"
            + "            \"backfillGracePeriodDuration\": \"P30D\",\n"
            + "            \"config\": {\n"
            + "                \"metric\": \"frequent_items\",\n"
            + "                \"type\": \"drift\",\n"
            + "                \"algorithm\": \"hellinger\",\n"
            + "                \"threshold\": 0.7,\n"
            + "                \"minBatchSize\": 1,\n"
            + "                \"baseline\": {\n"
            + "                    \"type\": \"TrailingWindow\",\n"
            + "                    \"size\": 7\n"
            + "                }\n"
            + "            }\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"missing-values-ratio-6ae15922\",\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"fixed\",\n"
            + "                \"cadence\": \"daily\"\n"
            + "            },\n"
            + "            \"disabled\": false,\n"
            + "            \"targetMatrix\": {\n"
            + "                \"type\": \"column\",\n"
            + "                \"include\": [\n"
            + "                    \"*\"\n"
            + "                ]\n"
            + "            },\n"
            + "            \"backfillGracePeriodDuration\": \"P30D\",\n"
            + "            \"config\": {\n"
            + "                \"metric\": \"count_null_ratio\",\n"
            + "                \"type\": \"stddev\",\n"
            + "                \"factor\": 3,\n"
            + "                \"minBatchSize\": 1,\n"
            + "                \"baseline\": {\n"
            + "                    \"type\": \"TrailingWindow\",\n"
            + "                    \"size\": 7\n"
            + "                }\n"
            + "            }\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"unique-ratio-29f3ef1c\",\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"fixed\",\n"
            + "                \"cadence\": \"daily\"\n"
            + "            },\n"
            + "            \"disabled\": false,\n"
            + "            \"targetMatrix\": {\n"
            + "                \"type\": \"column\",\n"
            + "                \"include\": [\n"
            + "                    \"*\"\n"
            + "                ]\n"
            + "            },\n"
            + "            \"backfillGracePeriodDuration\": \"P30D\",\n"
            + "            \"config\": {\n"
            + "                \"metric\": \"unique_est_ratio\",\n"
            + "                \"type\": \"stddev\",\n"
            + "                \"factor\": 3,\n"
            + "                \"minBatchSize\": 1,\n"
            + "                \"baseline\": {\n"
            + "                    \"type\": \"TrailingWindow\",\n"
            + "                    \"size\": 7\n"
            + "                }\n"
            + "            }\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"missing-profile-analyzer\",\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"fixed\",\n"
            + "                \"cadence\": \"daily\"\n"
            + "            },\n"
            + "      \"dataReadinessDuration\": 151200,\n"
            + "            \"disabled\": false,\n"
            + "            \"targetMatrix\": {\n"
            + "                \"type\": \"dataset\"\n"
            + "            },\n"
            + "            \"config\": {\n"
            + "                \"metric\": \"secondsSinceLastUpload\",\n"
            + "                \"type\": \"fixed\",\n"
            + "                \"upper\": 100\n"
            + "            }\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"inferred-data-type-33ee413a\",\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"fixed\",\n"
            + "                \"cadence\": \"daily\"\n"
            + "            },\n"
            + "            \"targetMatrix\": {\n"
            + "                \"type\": \"column\",\n"
            + "                \"include\": [\n"
            + "                    \"group:discrete\"\n"
            + "                ],\n"
            + "                \"exclude\": [\n"
            + "                    \"group:output\"\n"
            + "                ],\n"
            + "                \"segments\": []\n"
            + "            },\n"
            + "            \"config\": {\n"
            + "                \"metric\": \"inferred_data_type\",\n"
            + "                \"baseline\": {\n"
            + "                    \"type\": \"TrailingWindow\",\n"
            + "                    \"size\": 7\n"
            + "                },\n"
            + "                \"type\": \"comparison\",\n"
            + "                \"operator\": \"eq\"\n"
            + "            },\n"
            + "            \"metadata\": {\n"
            + "                \"schemaVersion\": 1,\n"
            + "                \"author\": \"system\",\n"
            + "                \"updatedTimestamp\": 1662584945253,\n"
            + "                \"version\": 1\n"
            + "            }\n"
            + "        }\n"
            + "    ],\n"
            + "    \"monitors\": [\n"
            + "        {\n"
            + "            \"id\": \"continuous-distribution-d705bfd0-monitor\",\n"
            + "            \"analyzerIds\": [\n"
            + "                \"continuous-distribution-d705bfd0\"\n"
            + "            ],\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"immediate\"\n"
            + "            },\n"
            + "            \"severity\": 3,\n"
            + "            \"mode\": {\n"
            + "                \"type\": \"DIGEST\",\n"
            + "                \"creationTimeOffset\": \"PT2H\",\n"
            + "                \"datasetTimestampOffset\": \"PT26H\"\n"
            + "            },\n"
            + "            \"actions\": []\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"discrete-distribution-3ce15ae6-monitor\",\n"
            + "            \"analyzerIds\": [\n"
            + "                \"discrete-distribution-3ce15ae6\"\n"
            + "            ],\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"immediate\"\n"
            + "            },\n"
            + "            \"severity\": 3,\n"
            + "            \"mode\": {\n"
            + "                \"type\": \"DIGEST\",\n"
            + "                \"creationTimeOffset\": \"PT2H\",\n"
            + "                \"datasetTimestampOffset\": \"PT26H\"\n"
            + "            },\n"
            + "            \"actions\": []\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"missing-values-ratio-6ae15922-monitor\",\n"
            + "            \"analyzerIds\": [\n"
            + "                \"missing-values-ratio-6ae15922\"\n"
            + "            ],\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"immediate\"\n"
            + "            },\n"
            + "            \"severity\": 3,\n"
            + "            \"mode\": {\n"
            + "                \"type\": \"DIGEST\",\n"
            + "                \"creationTimeOffset\": \"PT2H\",\n"
            + "                \"datasetTimestampOffset\": \"PT26H\"\n"
            + "            },\n"
            + "            \"actions\": []\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"unique-ratio-29f3ef1c-monitor\",\n"
            + "            \"analyzerIds\": [\n"
            + "                \"unique-ratio-29f3ef1c\"\n"
            + "            ],\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"immediate\"\n"
            + "            },\n"
            + "            \"severity\": 3,\n"
            + "            \"mode\": {\n"
            + "                \"type\": \"DIGEST\",\n"
            + "                \"creationTimeOffset\": \"PT2H\",\n"
            + "                \"datasetTimestampOffset\": \"PT26H\"\n"
            + "            },\n"
            + "            \"actions\": []\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"missing-profile-analyzer-monitor\",\n"
            + "            \"analyzerIds\": [\n"
            + "                \"missing-profile-analyzer\"\n"
            + "            ],\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"immediate\"\n"
            + "            },\n"
            + "            \"severity\": 4,\n"
            + "            \"mode\": {\n"
            + "                \"type\": \"DIGEST\",\n"
            + "                \"creationTimeOffset\": \"PT2H\",\n"
            + "                \"datasetTimestampOffset\": \"P2D\"\n"
            + "            },\n"
            + "            \"actions\": [\n"
            + "                {\n"
            + "                    \"type\": \"global\",\n"
            + "                    \"target\": \"pagerDuty\"\n"
            + "                }\n"
            + "            ]\n"
            + "        },\n"
            + "        {\n"
            + "            \"id\": \"inferred-data-type-33ee413a-monitor\",\n"
            + "            \"displayName\": \"inferred-data-type-33ee413a-monitor\",\n"
            + "            \"analyzerIds\": [\n"
            + "                \"inferred-data-type-33ee413a\"\n"
            + "            ],\n"
            + "            \"schedule\": {\n"
            + "                \"type\": \"immediate\"\n"
            + "            },\n"
            + "            \"severity\": 2,\n"
            + "            \"mode\": {\n"
            + "                \"type\": \"DIGEST\",\n"
            + "                \"creationTimeOffset\": \"P1D\",\n"
            + "                \"datasetTimestampOffset\": \"P7D\"\n"
            + "            },\n"
            + "            \"actions\": [],\n"
            + "            \"metadata\": {\n"
            + "                \"schemaVersion\": 1,\n"
            + "                \"author\": \"system\",\n"
            + "                \"updatedTimestamp\": 1662584946023,\n"
            + "                \"version\": 1\n"
            + "            }\n"
            + "        }\n"
            + "    ]\n"
            + "}";

    val currentTime = ZonedDateTime.of(2022, 1, 6, 0, 0, 0, 0, ZoneOffset.UTC);
    val start = ZonedDateTime.of(2021, 1, 5, 19, 0, 0, 0, ZoneOffset.UTC);
    val runner = backfillExplanationRunner.getRunner(json, currentTime, null);
    val results = backfillExplanationRunner.fuzzData(runner, start, 365, null, TargetLevel.dataset);
    for (val r : results) {
      assertEquals(
          Optional.ofNullable(r.getDatasetTimestamp()),
          Optional.of(
              ZonedDateTime.ofInstant(Instant.ofEpochMilli(r.getDatasetTimestamp()), ZoneOffset.UTC)
                  .truncatedTo(ChronoUnit.DAYS)
                  .toInstant()
                  .toEpochMilli()));
    }

    assertEquals(results.size(), 1);
  }

  @Test
  public void testScheduleExclusion() {
    val p = new TrailingWindowExclusionPredicate();
    val baseline = TrailingWindowBaseline.builder().size(7).build();
    val currentTime = ZonedDateTime.of(2024, 9, 13, 0, 0, 0, 0, ZoneOffset.UTC);
    assertFalse(p.test(baseline, currentTime.toInstant().toEpochMilli()));
    baseline.setExclusionRanges(Arrays.asList(TimeRange.builder().gte(0).lt(10).build()));
    assertFalse(p.test(baseline, currentTime.toInstant().toEpochMilli()));
    baseline.setExclusionRanges(
        Arrays.asList(
            TimeRange.builder()
                .gte(currentTime.toInstant().toEpochMilli())
                .lt(currentTime.plusHours(1).toInstant().toEpochMilli())
                .build()));
    assertTrue(p.test(baseline, currentTime.toInstant().toEpochMilli()));
    baseline.setExclusionRanges(null);
    baseline.setExclusionSchedule(CronSchedule.builder().cron("0 0 * * 6,0").build());
    assertFalse(p.test(baseline, currentTime.toInstant().toEpochMilli()));

    val friday = ZonedDateTime.of(2024, 9, 13, 0, 0, 0, 0, ZoneOffset.UTC);
    val saturday = ZonedDateTime.of(2024, 9, 14, 0, 0, 0, 0, ZoneOffset.UTC);
    assertFalse(p.test(baseline, friday.toInstant().toEpochMilli()));
    assertTrue(p.test(baseline, saturday.toInstant().toEpochMilli()));
  }
}
