package ai.whylabs.core.configV3.structure;

import static ai.whylabs.core.serde.MonitorConfigV3JsonSerde.MAPPER;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.testng.Assert.*;
import static org.testng.AssertJUnit.assertFalse;
import static org.testng.AssertJUnit.assertTrue;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import lombok.SneakyThrows;
import org.testng.annotations.Test;

public class FixedCadenceScheduleTest {

  @SneakyThrows
  @Test()
  public void testHappyPathJson() {
    String json =
        "{\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n"
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

    FixedCadenceSchedule sched = MAPPER.get().readValue(json, FixedCadenceSchedule.class);
    assertThat(sched.getExclusionRanges().size(), is(2));

    ZonedDateTime date =
        ZonedDateTime.parse("2021-11-13T19:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    assertFalse(sched.isMatch(date)); // rejected - in first exclusion range

    date = ZonedDateTime.parse("2021-12-01T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    assertTrue(sched.isMatch(date)); // Allowed

    date = ZonedDateTime.parse("2023-12-01T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    assertFalse(sched.isMatch(date)); // rejected - date in second exclusion range
  }

  @SneakyThrows
  @Test()
  public void testOptionalJson() {
    // it is OK to leave `exclusionRanges` unspecified.
    String json =
        "{\n" + "        \"type\": \"fixed\",\n" + "        \"cadence\": \"daily\"\n" + "      }";

    FixedCadenceSchedule sched = MAPPER.get().readValue(json, FixedCadenceSchedule.class);
    // even though exclusionRanges is unspecified, it should not be NULL.
    assertNotNull(sched.getExclusionRanges());
    assertThat(sched.getExclusionRanges().size(), is(0));

    // test empty `exclusionRanges`
    json =
        "{\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\",\n"
            + "        \"exclusionRanges\": []\n"
            + "      }";

    sched = MAPPER.get().readValue(json, FixedCadenceSchedule.class);
    assertNotNull(sched.getExclusionRanges());
    assertThat(sched.getExclusionRanges().size(), is(0));
  }
}
