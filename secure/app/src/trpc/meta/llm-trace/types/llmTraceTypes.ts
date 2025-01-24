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
  name: string;
  parentId?: string | null;
  release?: string | null;
  startTime: number;
  totalPolicyIssues: number;
  traceId: string;
  type: string;
  version?: string | null;
  /* @deprecated Use parsedTags to be able to display icons for the action type */
  violationTags?: string[];
  parsedTags?: ParsedSecureTag[];
  hasPcaCoords?: boolean;
};
