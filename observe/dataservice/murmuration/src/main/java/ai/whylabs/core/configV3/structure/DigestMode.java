package ai.whylabs.core.configV3.structure;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Duration;
import java.time.format.DateTimeParseException;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Slf4j
public class DigestMode implements MonitorMode {
  // The earliest creation timestamp that we will filter by to build
  //          the digest. ISO 8601 format for timedelta.
  private String creationTimeOffset;

  // The earliest dataset timestamp that we will filter by in the digest
  private String datasetTimestampOffset;

  private AnomalyFilter filter;

  @JsonIgnore
  public Duration getCreationTimeOffsetParsed() {
    Duration duration = Duration.ZERO;
    try {
      if (!StringUtils.isEmpty(creationTimeOffset)) {
        duration = Duration.parse(creationTimeOffset);
      }
    } catch (DateTimeParseException e) {
      log.warn("Invalid duration for digest mode {}", creationTimeOffset);
    }
    return duration;
  }

  @JsonIgnore
  public Duration getDatasetTimestampOffsetParsed() {
    Duration duration = Duration.ZERO;
    try {
      if (!StringUtils.isEmpty(datasetTimestampOffset)) {
        duration = Duration.parse(datasetTimestampOffset);
      }
    } catch (DateTimeParseException e) {
      log.warn("Invalid duration for digest mode {}", datasetTimestampOffset);
    }
    return duration;
  }

  @Override
  public AnomalyFilter getAnomalyFilter() {
    return filter;
  }
}
