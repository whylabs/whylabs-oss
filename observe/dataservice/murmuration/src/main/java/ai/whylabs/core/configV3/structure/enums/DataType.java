package ai.whylabs.core.configV3.structure.enums;

import com.fasterxml.jackson.annotation.JsonAlias;

public enum DataType {
  @JsonAlias({"integer"})
  INTEGRAL,
  FRACTIONAL,
  @JsonAlias({"bool"})
  BOOLEAN,
  STRING,
  UNKNOWN,
  NULL,
  UNRECOGNIZED
}
