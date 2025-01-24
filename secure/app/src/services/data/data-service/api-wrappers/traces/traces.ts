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
import { PostgresTracesService } from './postgres-traces-service';
import { TracesService } from './traces-service';

export class DefaultTracesService implements TracesService {
  service: TracesService;

  constructor() {
    this.service = new PostgresTracesService();
  }

  async getTraceDetail(props: TraceDetailRequest, options?: CallOptions | undefined): Promise<TraceDetailResponse> {
    return this.service.getTraceDetail(props, options);
  }

  async queryTraces(props: TraceQueryRequest, options?: CallOptions | undefined): Promise<TraceQueryResponse> {
    return this.service.queryTraces(props, options);
  }

  async listTraces(props: TraceListRequest, options?: CallOptions | undefined): Promise<TraceQueryResponse> {
    return this.service.listTraces(props, options);
  }

  async getTracesDataRange(
    props: TraceDataRangeRequest,
    options?: CallOptions | undefined,
  ): Promise<TraceDataRangeResponse> {
    return this.service.getTracesDataRange(props, options);
  }

  async getTracesSummary(props: TraceSummaryRequest, options?: CallOptions | undefined): Promise<TraceSummaryResponse> {
    return this.service.getTracesSummary(props, options);
  }

  async getTracesTagSummary(
    props: TraceSummaryRequest,
    options?: CallOptions | undefined,
  ): Promise<TraceSummaryResponse> {
    return this.service.getTracesTagSummary(props, options);
  }

  parseTraceEntryCounts(
    entry: string,
    formattedContext: string,
  ): { violationsCount: number; blockedInteractionsCount: number; total: number } | null {
    return this.service.parseTraceEntryCounts(entry, formattedContext);
  }
}
