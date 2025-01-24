package ai.whylabs.core.configV3.structure.Analyzers;

import com.fasterxml.jackson.annotation.JsonAlias;

public enum ConditionalLimitType {
  @JsonAlias("and")
  conjunction,
  @JsonAlias("or")
  disjunction
}
