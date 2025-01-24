export const AppRoutePaths = {
  login: 'login',
  root: '/',
  rootIndex: undefined,
  resourcesSummary: 'resources',
  resourceId: ':resourceId',
  resourceIdIndex: undefined,
  resourceIdLlmTrace: 'llm-secure',
  resourceIdLlmTraceIndex: undefined,
  resourceIdLlmTraceSummary: 'summary',
  resourceIdLlmTracePolicy: 'policy',
  resourceIdLlmTracePolicyIndex: undefined,
  resourceIdLlmTracePolicyCallbackSettings: 'callback-settings',
  resourceIdLlmTracePolicyAdvancedSettings: 'advanced-settings',
  resourceIdLlmTracePolicyChangeHistory: 'change-history',
  resourceIdLlmTraceTab: ':tabId',
  traceId: ':traceId',
  traceIdItemId: ':itemId',
} as const;

export type AppRoutePathIds = keyof typeof AppRoutePaths;
