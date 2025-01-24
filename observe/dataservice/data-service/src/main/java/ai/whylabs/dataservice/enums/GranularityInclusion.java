package ai.whylabs.dataservice.enums;

/**
 * Analyzers can be configured to disable target rollup for customers like LLM based projects where
 * analysis might be desired on individual profiles rather than the batch. Well, in addition to the
 * batch.
 *
 * <p>Analysis can't be rolled up, doesn't work. When looking at rolled up profile data one should
 * look at analysis based on rolled up targets. Vice versa, when looking at individual profiles you
 * don't want analysis against the batch included in the view.
 *
 * <p>Thus we have this very specific enum to indicate the context so we can filter on the
 * disable_target_rollup field.
 */
public enum GranularityInclusion {
  INDIVIDUAL_ONLY,
  ROLLUP_ONLY,
  BOTH
}
