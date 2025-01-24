import { TraceItem } from '../../types/llmTraceTypes';

export function createMockedTraceItem(custom: Partial<TraceItem> = {}): TraceItem {
  return {
    applicationId: 'DGM@-c352d74f',
    contents: [],
    endTime: 1700249275024,
    id: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7',
    inputAndCompletionTokens: '328 → 207 (535)',
    name: 'Trace',
    latency: '8.35 sec',
    release: '4e2fade8c5ab4f52cc2da9c8f1b73624d952abc1',
    startTime: 1700249273024,
    totalPolicyIssues: 6,
    version: 'chatgpt-3.5-turbo',
    violationTags: [],
    traceId: 'a1b2c33e-12d4-4e5f-8af1-22b9fcb3e4d7',
    type: 'TRACE',
    ...custom,
  };
}
