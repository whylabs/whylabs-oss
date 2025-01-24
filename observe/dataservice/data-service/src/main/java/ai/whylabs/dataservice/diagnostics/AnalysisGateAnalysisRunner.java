package ai.whylabs.dataservice.diagnostics;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.dataservice.diagnostics.enums.AnalyzerGateObservation;
import ai.whylabs.dataservice.diagnostics.enums.GateType;
import ai.whylabs.dataservice.diagnostics.output.AnalyzerGateAnalysisOutput;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import lombok.val;

public class AnalysisGateAnalysisRunner {
  public static final Long wiggleRoomMinutes = 60l;
  public static final String SHORT_DESCRIPTION =
      "Gate setting is a bit short given your upload patterns and may lead to analyzing data before being fully uploaded";
  public static final String LONG_DESCRIPTION =
      "Gate setting is a bit long given your upload patterns. A shorter setting would enable analysis to run sooner";
  List<String> ignore = Arrays.asList("secondsSinceLastUpload", "missingDatapoint");

  public List<AnalyzerGateAnalysisOutput> analyzeDataReadinessDuration(
      MonitorConfigV3 conf, Long estimatedUploadLagMinutes) {
    List<AnalyzerGateAnalysisOutput> out = new ArrayList();

    val lag = Duration.ofMinutes(estimatedUploadLagMinutes);
    val lagPlusWiggleRoom = Duration.ofMinutes(estimatedUploadLagMinutes + wiggleRoomMinutes);
    if (conf != null) {
      for (val a : conf.getAnalyzers()) {
        val o = new AnalyzerGateAnalysisOutput();
        o.setAnalyzerId(a.getId());
        if (ignore.contains(a.getMetric())) {
          continue;
        }

        if (a.getDataReadinessDuration() != null) {
          o.setCurrent(a.getDataReadinessDuration().toString());
          o.setGateType(GateType.DATA_READINESS_DURATION);

          if (a.getDataReadinessDuration().compareTo(lag) < 0) {
            o.setObservation(AnalyzerGateObservation.SHORT);
            o.setDescription(SHORT_DESCRIPTION);
            o.setSuggested(
                Duration.ofMinutes(estimatedUploadLagMinutes + wiggleRoomMinutes).toString());
            out.add(o);

          } else if (a.getDataReadinessDuration().compareTo(lagPlusWiggleRoom) > 0) {
            o.setObservation(AnalyzerGateObservation.LONG);
            o.setSuggested(
                Duration.ofMinutes(estimatedUploadLagMinutes + wiggleRoomMinutes).toString());
            o.setDescription(LONG_DESCRIPTION);
            out.add(o);
          } else {
            o.setObservation(AnalyzerGateObservation.FINE);
            out.add(o);
          }
        }
      }
    }
    return out;
  }

  public List<AnalyzerGateAnalysisOutput> analyzeBatchCooldownDuration(
      MonitorConfigV3 conf, Long uploadWindowMinutes) {
    List<AnalyzerGateAnalysisOutput> out = new ArrayList();

    val lag = Duration.ofMinutes(uploadWindowMinutes);
    val lagPlusWiggleRoom = Duration.ofMinutes(uploadWindowMinutes + wiggleRoomMinutes);
    if (conf != null) {
      for (val a : conf.getAnalyzers()) {
        val o = new AnalyzerGateAnalysisOutput();
        o.setAnalyzerId(a.getId());

        if (a.getBatchCoolDownPeriod() != null) {
          o.setCurrent(a.getBatchCoolDownPeriod().toString());
          if (ignore.contains(a.getMetric())) {
            continue;
          }
          o.setGateType(GateType.BATCH_COOLDOWN_PERIOD);
          if (a.getBatchCoolDownPeriod().compareTo(lag) < 0) {
            o.setObservation(AnalyzerGateObservation.SHORT);
            o.setDescription(SHORT_DESCRIPTION);
            o.setSuggested(Duration.ofMinutes(uploadWindowMinutes + wiggleRoomMinutes).toString());
            out.add(o);

          } else if (a.getBatchCoolDownPeriod().compareTo(lagPlusWiggleRoom) > 0) {
            o.setObservation(AnalyzerGateObservation.LONG);
            o.setSuggested(Duration.ofMinutes(uploadWindowMinutes + wiggleRoomMinutes).toString());
            o.setDescription(LONG_DESCRIPTION);
            out.add(o);
          } else {
            o.setObservation(AnalyzerGateObservation.FINE);
            out.add(o);
          }
        }
      }
    }
    return out;
  }
}
