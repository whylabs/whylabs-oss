package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;

public interface ParentAnalyzerConfig {
  boolean isChild(AnalyzerResult child);

  String getAnalyzerResultType();

  List<String> getAnalyzerIds();
}
