import { SortCondition } from '@whylabs/data-service-node-client';

import { NearestNeighborData } from '../utils/llmTraceUtils';

export type TraceContent = {
  title: string;
  content: Record<string, unknown> | Array<Record<string, unknown> | string | unknown> | null;
};

export interface ParsedSecureTag {
  name: string;
  label: string;
  action?: string | null;
}

export type TraceItem = {
  applicationId?: string | null;
  contents: TraceContent[];
  endTime: number;
  id: string;
  inputAndCompletionTokens?: string | null;
  latency?: string | null;
  latencyAsMillis?: number;
  name: string;
  parentId?: string | null;
  release?: string | null;
  startTime: number;
  totalPolicyIssues: number;
  traceId: string;
  type: string;
  version?: string | null;
  violationTags?: string[];
  parsedTags?: ParsedSecureTag[];
  hasPcaCoords?: boolean;
  nearestNeighborsData?: NearestNeighborData[];
};

export { SortCondition as TracesSortBy };
