package ai.whylabs.dataservice.util;

import static ai.whylabs.core.configV3.structure.Analyzers.DriftConfig.Algorithm.hellinger;
import static org.junit.jupiter.api.Assertions.assertEquals;

import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.core.configV3.structure.Analyzers.DriftConfig;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.UUID;
import lombok.val;
import org.junit.jupiter.api.Test;

public class MonitorConfigUtilTest {
  @Test
  public void test() {

    val cronAnalyzer1 =
        Analyzer.builder()
            .id("missing_data_analyzer_1")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .version(1)
                    .build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build();

    val cronAnalyzer2 =
        Analyzer.builder()
            .id("missing_data_analyzer_2")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .version(1)
                    .build())
            // Diff schedule
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build();
    val hourlyAnalyzer =
        Analyzer.builder()
            .id("missing_data_analyzer_3")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .version(1)
                    .build())
            .schedule(FixedCadenceSchedule.builder().cadence(Granularity.hourly).build())
            .build();

    val dailyAnalyzer =
        Analyzer.builder()
            .id("missing_data_analyzer_4")
            .disabled(false)
            .config(
                DriftConfig.builder()
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .version(1)
                    .build())
            .schedule(FixedCadenceSchedule.builder().cadence(Granularity.daily).build())
            .build();

    val monitorConfigV3 =
        MonitorConfigV3.builder()
            .orgId("org-11")
            .id(UUID.randomUUID().toString())
            .datasetId("model-0")
            .granularity(Granularity.hourly)
            .analyzers(Arrays.asList(cronAnalyzer1))
            .build();

    val currentTime =
        ZonedDateTime.parse("2023-12-01T19:00:21.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    val schedules = MonitorConfigUtil.convertToSchedules(monitorConfigV3, currentTime);
    assertEquals(schedules.size(), 1);
    assertEquals(
        ZonedDateTime.parse("2023-12-01T20:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        schedules.get(0).getTargetBucket());
    assertEquals(
        ZonedDateTime.parse("2023-12-01T21:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        schedules.get(0).getEligableToRun());

    val monitorConfigV3TwoIdenticalCron =
        MonitorConfigV3.builder()
            .orgId("org-11")
            .id(UUID.randomUUID().toString())
            .datasetId("model-0")
            .granularity(Granularity.daily)
            .analyzers(Arrays.asList(cronAnalyzer1, cronAnalyzer2))
            .build();
    val schedules2 =
        MonitorConfigUtil.convertToSchedules(monitorConfigV3TwoIdenticalCron, currentTime);
    assertEquals(2, schedules2.size());

    val monitorConfigV3AllFour =
        MonitorConfigV3.builder()
            .orgId("org-11")
            .id(UUID.randomUUID().toString())
            .datasetId("model-0")
            .granularity(Granularity.hourly)
            .analyzers(Arrays.asList(cronAnalyzer1, cronAnalyzer2, hourlyAnalyzer, dailyAnalyzer))
            .build();

    val schedules4 = MonitorConfigUtil.convertToSchedules(monitorConfigV3AllFour, currentTime);
    assertEquals(schedules4.size(), 4);
    for (val schedule : schedules4) {
      if (schedule.getAnalyzerId().equals("missing_data_analyzer_4")) {
        assertEquals(
            ZonedDateTime.parse("2023-12-01T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME),
            schedule.getTargetBucket());
        // hourly dataset with daily analyzer only needs to close up the hour to be eligable
        assertEquals(
            ZonedDateTime.parse("2023-12-01T01:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME),
            schedule.getEligableToRun());
      } else if (schedule.getAnalyzerId().equals("missing_data_analyzer_3")) {
        assertEquals(
            ZonedDateTime.parse("2023-12-01T19:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME),
            schedule.getTargetBucket());
        assertEquals(
            ZonedDateTime.parse("2023-12-01T20:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME),
            schedule.getEligableToRun());
      }
    }
  }

  @Test
  public void testDataReadinessDuration() {
    val dailyAnalyzer =
        Analyzer.builder()
            .id("missing_data_analyzer_4")
            .disabled(false)
            .dataReadinessDuration(Duration.of(25, ChronoUnit.HOURS))
            .config(
                DriftConfig.builder()
                    .metric(AnalysisMetric.histogram.name())
                    .algorithm(hellinger)
                    .version(1)
                    .build())
            .schedule(FixedCadenceSchedule.builder().cadence(Granularity.daily).build())
            .build();

    val monitorConfigV3 =
        MonitorConfigV3.builder()
            .orgId("org-11")
            .id(UUID.randomUUID().toString())
            .granularity(Granularity.daily)
            .datasetId("model-0")
            .analyzers(Arrays.asList(dailyAnalyzer))
            .build();

    val currentTime =
        ZonedDateTime.parse("2023-12-01T19:00:21.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    val schedules1 = MonitorConfigUtil.convertToSchedules(monitorConfigV3, currentTime);
    assertEquals(
        ZonedDateTime.parse("2023-12-01T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        schedules1.get(0).getTargetBucket());
    assertEquals(
        ZonedDateTime.parse("2023-12-03T01:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        schedules1.get(0).getEligableToRun());
  }
}
