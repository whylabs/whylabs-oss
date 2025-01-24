package ai.whylabs.core.configV3.structure;

import static ai.whylabs.core.serde.MonitorConfigV3JsonSerde.MAPPER;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.testng.Assert.assertNotNull;
import static org.testng.AssertJUnit.*;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import lombok.SneakyThrows;
import lombok.val;
import org.testng.annotations.Test;

public class CronScheduleTest {
  @SneakyThrows
  @Test()
  public void testHappyPathJson() {
    String json =
        "{\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 19 * * *\",\n"
            + "        \"exclusionRanges\": [\n"
            + "          {\n"
            + "            \"start\": \"1970-01-01T00:00:00.000Z\",\n"
            + "            \"end\":   \"2021-11-21T00:00:00.000Z\"\n"
            + "          },\n"
            + "          {\n"
            + "            \"start\": \"2022-01-02T00:00:00.000Z\",\n"
            + "            \"end\": \"3000-01-02T00:00:00.000Z\"\n"
            + "          }\n"
            + "        ]\n"
            + "      }";

    CronSchedule sched = MAPPER.get().readValue(json, CronSchedule.class);
    assertThat(sched.getExclusionRanges().size(), is(2));

    ZonedDateTime date =
        ZonedDateTime.parse("2021-11-13T19:00:21.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    assertFalse(sched.isMatch(date)); // rejected - in first exclusion range

    date = ZonedDateTime.parse("2021-12-01T19:00:21.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    assertTrue(sched.isMatch(date)); // not excluded

    date = ZonedDateTime.parse("2021-12-01T17:00:21.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    assertFalse(sched.isMatch(date)); // time too early

    date = ZonedDateTime.parse("2021-12-01T21:00:21.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    assertFalse(sched.isMatch(date)); // time too late

    date = ZonedDateTime.parse("2023-12-01T19:00:21.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    assertFalse(sched.isMatch(date)); // rejected - date in second exclusion range

    val initialBucket = sched.getInitialTargetBucket(date, Granularity.hourly);
    assertEquals(
        initialBucket,
        ZonedDateTime.parse("2023-12-02T19:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME));

    assertEquals(
        sched.getNextFire(initialBucket, null, Granularity.hourly),
        ZonedDateTime.parse("2023-12-02T20:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME));
  }

  @SneakyThrows
  @Test()
  public void testOptionalJson() {
    // it is OK to leave `exclusionRanges` unspecified.
    String json =
        "{\n" + "        \"type\": \"cron\",\n" + "        \"cron\": \"0 19 * * *\"\n" + "      }";

    CronSchedule sched = MAPPER.get().readValue(json, CronSchedule.class);
    // even though exclusionRanges is unspecified, it should not be NULL.
    assertNotNull(sched.getExclusionRanges());
    assertThat(sched.getExclusionRanges().size(), is(0));

    // test empty `exclusionRanges`
    json =
        "{\n"
            + "        \"type\": \"cron\",\n"
            + "        \"cron\": \"0 19 * * *\",\n"
            + "        \"exclusionRanges\": []\n"
            + "      }";

    sched = MAPPER.get().readValue(json, CronSchedule.class);
    assertNotNull(sched.getExclusionRanges());
    assertThat(sched.getExclusionRanges().size(), is(0));
  }
}
