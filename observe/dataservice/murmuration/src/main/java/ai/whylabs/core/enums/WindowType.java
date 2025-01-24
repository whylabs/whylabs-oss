package ai.whylabs.core.enums;

import lombok.Getter;

@Getter
public enum WindowType {
  TARGET("target"), // Interval covered by startOfTargetBatch<->endOfTargetBatch
  BASELINE("baseline"); // If granularity P1D over 7 days, rolls up to 7 records

  String prefix;

  WindowType(String prefix) {
    this.prefix = prefix;
  }
}
