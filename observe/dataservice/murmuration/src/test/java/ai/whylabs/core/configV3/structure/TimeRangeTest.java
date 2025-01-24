package ai.whylabs.core.configV3.structure;

import static ai.whylabs.core.serde.MonitorConfigV3JsonSerde.MAPPER;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.testng.AssertJUnit.assertFalse;
import static org.testng.AssertJUnit.assertTrue;

import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import lombok.SneakyThrows;
import lombok.val;
import org.testng.Assert;
import org.testng.annotations.Test;

public class TimeRangeTest {
  @SneakyThrows
  @Test(expectedExceptions = {MismatchedInputException.class})
  public void testStartOnlyJson() {
    // timeRange JSON must specify both start and end fields
    TimeRange foo =
        MAPPER.get().readValue("{\"start\":\"2021-11-14T00:00:00.000Z\"}", TimeRange.class);
    Assert.fail("test should have thrown exception");
  }

  @SneakyThrows
  @Test(expectedExceptions = {MismatchedInputException.class})
  public void testEndOnlyJson() {
    // timeRange JSON must specify both start and end fields
    TimeRange foo =
        MAPPER.get().readValue("{\"end\":\"2021-11-14T00:00:00.000Z\"}", TimeRange.class);
    Assert.fail("test should have thrown exception");
  }

  @SneakyThrows
  @Test()
  public void testHappyPathJson() {
    // Two time format that are acceptable.
    TimeRange foo =
        MAPPER
            .get()
            .readValue(
                "{\"start\":\"2021-11-14T00:00:00.000Z\", \"end\":\"2021-11-15T00:00:00.000Z\"}",
                TimeRange.class);
    assertThat(foo.getStart(), is("2021-11-14T00:00:00.000Z"));
    assertThat(foo.getEnd(), is("2021-11-15T00:00:00.000Z"));
    assertThat(foo.getGte(), is(1636848000000L));
    assertThat(foo.getLt(), is(1636934400000L));
  }

  @SneakyThrows
  @Test()
  public void testIncludes() {
    val t = new TimeRange("2021-11-14T00:00:00.000Z", "2021-11-15T00:00:00.000Z");

    assertFalse(t.contains(t.getLt()));
    assertTrue(t.contains(t.getLt() - 1));
    assertTrue(t.contains(t.getGte()));
    assertFalse(t.contains(t.getGte() - 1));

    val before =
        ZonedDateTime.parse("2021-11-13T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            .toInstant()
            .toEpochMilli();

    val during =
        ZonedDateTime.parse("2021-11-14T00:10:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            .toInstant()
            .toEpochMilli();

    val after =
        ZonedDateTime.parse("2021-11-16T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            .toInstant()
            .toEpochMilli();
    assertFalse(t.contains(before));
    assertTrue(t.contains(during));
    assertFalse(t.contains(after));
  }
}
