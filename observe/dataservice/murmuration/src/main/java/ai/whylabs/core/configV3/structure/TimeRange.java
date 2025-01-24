package ai.whylabs.core.configV3.structure;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimeRange {
  // When parsing JSON, both `start` and `end` fields are required.
  // When using build() you can do whatever you want.
  @JsonProperty(value = "start", required = true)
  private String start;

  @JsonProperty(value = "end", required = true)
  private String end;

  @JsonIgnore private long gte;
  @JsonIgnore private long lt;

  // MV3 schema specifies that both start and end are required fields in a TimeRange
  public TimeRange(
      @JsonProperty(value = "start", required = true) String start,
      @JsonProperty(value = "end", required = true) String end) {
    this.setStart(start);
    this.setEnd(end);
  }

  public String getStart() {
    return start;
  }

  public void setStart(String start) {
    this.start = start;
    this.gte =
        ZonedDateTime.parse(start, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            .toInstant()
            .toEpochMilli();
  }

  public String getEnd() {
    return end;
  }

  public void setEnd(String end) {
    this.end = end;
    this.lt =
        ZonedDateTime.parse(end, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toInstant().toEpochMilli();
  }

  // return true if `epochTime` falls within this interval
  public boolean contains(long epochTime) {
    return epochTime >= this.gte && epochTime < this.lt;
  }

  // return true if `time` falls within this interval
  public boolean contains(ZonedDateTime time) {
    return contains(time.toInstant().toEpochMilli());
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    TimeRange timeRange = (TimeRange) o;
    return gte == timeRange.gte && lt == timeRange.lt;
  }

  @Override
  public int hashCode() {
    return Objects.hash(gte, lt);
  }
}
