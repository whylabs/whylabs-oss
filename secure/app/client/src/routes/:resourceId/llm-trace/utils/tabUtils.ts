import { LLMSecureProps } from '~/hooks/useWhylabsNavigation';

export const LLM_TRACE_SUMMARY_TAB = 'summary';
export const LLM_TRACE_TRACES_TAB = 'traces';
export const LLM_TRACE_COMPLETIONS_TAB = 'completions';
export const LLM_TRACE_POLICY_TAB = 'policy';
export const LLM_SECURE_EMBEDDINGS_PROJECTOR = 'embeddings-projector';
export const LLM_TRACE_TABS_LIST = [
  LLM_TRACE_SUMMARY_TAB,
  LLM_TRACE_TRACES_TAB,
  LLM_TRACE_COMPLETIONS_TAB,
  LLM_TRACE_POLICY_TAB,
  LLM_SECURE_EMBEDDINGS_PROJECTOR,
];
export const stringToSecurePathMap = new Map<string, LLMSecureProps['path']>([
  [LLM_TRACE_SUMMARY_TAB, 'summary'],
  [LLM_TRACE_TRACES_TAB, 'traces'],
  [LLM_TRACE_COMPLETIONS_TAB, 'completions'],
  [LLM_TRACE_POLICY_TAB, 'policy'],
]);

export const TRACE_SUMMARY_NAME = 'Trace Summary';
export const TRACES_NAME = 'Traces';
export const TRACE_DETAILS_NAME = 'Trace Details';
export const POLICY_RULESETS_NAME = 'Policy';
export const EMBEDDINGS_PROJECTOR_NAME = 'Embeddings Projector';
export const getBreadcrumbPageTitle = new Map<string, string>([
  [LLM_TRACE_SUMMARY_TAB, TRACE_SUMMARY_NAME],
  [LLM_TRACE_TRACES_TAB, TRACES_NAME],
  [LLM_TRACE_POLICY_TAB, POLICY_RULESETS_NAME],
]);
