package ai.whylabs.dataservice.diagnostics.checks;

import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.dataservice.diagnostics.DiagnosticContext;
import ai.whylabs.dataservice.diagnostics.enums.GeneralObservation;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.val;
import org.apache.commons.lang.StringUtils;

@RequiredArgsConstructor
public class CheckSegmentedDrift implements Check {

  @Override
  public void check(DiagnosticContext c, List<DiagnosticOutput> out) {
    if (c.getConfigAtTimeOfAnalysis() == null) {
      // need original config to check if it was using overall segment or not
      return;
    }
    if (!c.getAnalysis().getSegment().equals("")) {
      // only diagnose analyzer results for overall segment right now.
      return;
    }
    if (c.getAnalyzer(c.getConfigAtTimeOfAnalysis())
        .getBaseline()
        .getClass()
        .isAssignableFrom(ReferenceProfileId.class)) {
      // TODO: Ref profile resolver
      return;
    }
    List<String> missingTarget = new ArrayList<>();
    for (val s : c.getBaselineSegments()) {
      if (!c.getTargetSegments().contains(s)) {
        missingTarget.add(s);
      }
    }
    List<String> missingBaseline = new ArrayList<>();
    for (val s : c.getTargetSegments()) {
      if (!c.getBaselineSegments().contains(s)) {
        missingBaseline.add(s);
      }
    }

    if (c.getBaselineSegments().size() != c.getTargetSegments().size()) {
      StringBuilder sb = new StringBuilder();
      sb.append(
          "Baseline was calculated over "
              + c.getBaselineSegments().size()
              + " segments, target had "
              + c.getTargetSegments().size()
              + " segments. ");
      if (missingTarget.size() > 0) {
        sb.append("Missing from target [")
            .append(StringUtils.join(missingTarget, ","))
            .append("]. ");
      }
      if (missingBaseline.size() > 0) {
        sb.append("Missing from baseline [")
            .append(StringUtils.join(missingBaseline, ","))
            .append("]. ");
      }

      out.add(
          new DiagnosticOutput(
              GeneralObservation.SEGMENTS_CHANGE, sb.toString(), SuccessEnum.FAIL));
    } else {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.SEGMENTS_CHANGE,
              "Baseline and target were both calculated over the same number of segments: "
                  + c.getBaselineSegments().size(),
              SuccessEnum.PASS));
    }
  }
}
