import {
  TraceDataRangeRequest,
  TraceDataRangeResponse,
  TraceDetailRequest,
  TraceDetailResponse,
  TraceListRequest,
  TraceQueryRequest,
  TraceQueryResponse,
  TraceSummaryRequest,
  TraceSummaryResponse,
} from '../../../../../types/api';

import { CallOptions } from '../../../../../util/async-helpers';

export type TraceEntryCounts = {
  violationsCount: number;
  blockedInteractionsCount: number;
  total: number;
};

export interface TracesService {
  getTraceDetail: (props: TraceDetailRequest, options?: CallOptions) => Promise<TraceDetailResponse>;
  queryTraces: (props: TraceQueryRequest, options?: CallOptions) => Promise<TraceQueryResponse>;
  listTraces: (props: TraceListRequest, options?: CallOptions) => Promise<TraceQueryResponse>;
  getTracesDataRange: (props: TraceDataRangeRequest, options?: CallOptions) => Promise<TraceDataRangeResponse>;
  getTracesSummary: (props: TraceSummaryRequest, options?: CallOptions) => Promise<TraceSummaryResponse>;
  getTracesTagSummary: (props: TraceSummaryRequest, options?: CallOptions) => Promise<TraceSummaryResponse>;
  parseTraceEntryCounts: (entry: string, formattedContext: string) => TraceEntryCounts | null;
}
