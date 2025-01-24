/* eslint-disable max-lines */

import { isNumber } from 'lodash';
import {
  TraceDataRangeEntry,
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

import {
  listTraceSummaries,
  listTraceTotal,
  traceDetail,
  traceQuery,
  traceSummary,
  traceSummaryTag,
  traceTotal,
} from '../../../../../generated/client/sql';
import { prisma } from '../../../../../orm/config/client';
import { getLogger } from '../../../../../providers/logger';
import {
  DataServiceTraceDetailSchema,
  DataServiceTraceSummarySchema,
  DataServiceTraceSummaryTagSchema,
  ParsedDataServiceListTraceSchema,
} from '../../../../../trpc/meta/llm-trace/schemas/llmTraceSchemas';
import { intervalToDateRange } from '../../data-service-utils';
import { TraceEntryCounts, TracesService } from './traces-service';

const logger = getLogger('postgres-traces-service');

export class PostgresTracesService implements TracesService {
  async getTraceDetail(props: TraceDetailRequest): Promise<TraceDetailResponse> {
    const { resourceId, traceId } = props;
    const typedSql = traceDetail(resourceId ?? '', traceId ?? '');
    const result = await prisma.$queryRawTyped(typedSql);

    let totalLatencyMillis = 0;
    let totalTokens = 0;
    let totalCompletionTokens = 0;
    let totalPromptTokens = 0;
    let resourceAttributes = '';
    let tags: string[] = [];
    result.forEach((entry) => {
      if (entry.parent_id === null) {
        totalLatencyMillis += Number(entry.latency) ?? 0;
      }
      totalTokens += entry.total_tokens ?? 0;
      totalCompletionTokens += entry.completion_tokens ?? 0;
      totalPromptTokens += entry.prompt_tokens ?? 0;
      resourceAttributes = JSON.stringify(entry.resource_attributes);
      tags = tags.concat(entry.tags ?? []);
    });
    const entries = result.map((entry) => {
      const res: DataServiceTraceDetailSchema = {
        ResourceId: entry.resource_id?.toString() ?? '',
        TraceId: entry.trace_id?.toString() ?? '',
        SpanId: entry.span_id?.toString() ?? '',
        ParentId: entry.parent_id?.toString() ?? '',
        StartTime: entry.start_timestamp?.toISOString() ?? '',
        EndTime: entry.end_timestamp?.toISOString() ?? '',
        SpanName: entry.span_name?.toString() ?? '',
        SpanStatus: entry.span_status?.toString() ?? '',
        SpanStatusMessage: '',
        SpanKind: '',
        Events: JSON.parse(JSON.stringify(entry.events)),
        Tags: entry.tags ?? [],
        Links: [],
        TraceAttributes: JSON.parse(JSON.stringify(entry.attributes)),
        ResourceAttributes: JSON.parse(JSON.stringify(entry.resource_attributes)),
      };
      return JSON.stringify(res);
    });

    return {
      id: traceId ?? '',
      resourceAttributes: resourceAttributes,
      startTime: '',
      endTime: '',
      latency: totalLatencyMillis,
      totalTokens: totalTokens,
      completionTokens: totalCompletionTokens,
      promptTokens: totalPromptTokens,
      tags: tags,
      entries: entries,
    };
  }

  async queryTraces(props: TraceQueryRequest): Promise<TraceQueryResponse> {
    const { resourceId } = props;

    const { traceId, spanId } = props.filter;
    const typedSql = traceQuery(resourceId ?? '', traceId ?? '', spanId ?? '');
    const result = await prisma.$queryRawTyped(typedSql);
    const entries = result.map((entry) => {
      const res: DataServiceTraceDetailSchema = {
        ResourceId: entry.resource_id?.toString() ?? '',
        TraceId: entry.trace_id?.toString() ?? '',
        SpanId: entry.span_id?.toString() ?? '',
        ParentId: entry.parent_id?.toString() ?? '',
        StartTime: entry.start_timestamp?.toISOString() ?? '',
        EndTime: entry.end_timestamp?.toISOString() ?? '',
        SpanName: entry.span_name?.toString() ?? '',
        SpanStatus: entry.span_status?.toString() ?? '',
        SpanStatusMessage: '',
        SpanKind: '',
        Events: JSON.parse(JSON.stringify(entry.events)),
        Links: [],
        Tags: entry.tags ?? [],
        TraceAttributes: JSON.parse(JSON.stringify(entry.attributes)),
        ResourceAttributes: JSON.parse(JSON.stringify(entry.resource_attributes)),
      };
      return JSON.stringify(res);
    });

    return {
      entries: entries,
      nextOffset: 0,
      partial: false,
      total: result.length,
    };
  }

  async listTraces(props: TraceListRequest): Promise<TraceQueryResponse> {
    const { resourceId, interval, offset, limit, filter } = props;
    const { fromTimestamp, toTimestamp } = intervalToDateRange(interval) ?? {
      fromTimestamp: 0,
      toTimestamp: 0,
    };

    const traceTotalTypedSql = listTraceTotal(
      resourceId ?? '',
      new Date(fromTimestamp - 60 * 60 * 1000), // expand span search window to get all spans in the trace
      new Date(toTimestamp + 60 * 60 * 1000),
      filter.traceIdSubstring ?? '',
      filter.minPolicyIssues ?? -1,
      filter.maxPolicyIssues ?? -1,
      filter.minLatencyMillis ?? -1,
      filter.maxLatencyMillis ?? -1,
      filter.minTotalTokens ?? -1,
      filter.maxTotalTokens ?? -1,
      filter.tags ?? [],
      filter.excludeTags ?? [],
      new Date(fromTimestamp),
      new Date(toTimestamp),
    );
    const traceTotalResult = await prisma.$queryRawTyped(traceTotalTypedSql);
    const totalTraces = traceTotalResult[0].total_traces;

    const typedSql = listTraceSummaries(
      resourceId ?? '',
      new Date(fromTimestamp - 60 * 60 * 1000), // expand span search window to get all spans in the trace
      new Date(toTimestamp + 60 * 60 * 1000),
      filter.traceIdSubstring ?? '',
      filter.minPolicyIssues ?? -1,
      filter.maxPolicyIssues ?? -1,
      filter.minLatencyMillis ?? -1,
      filter.maxLatencyMillis ?? -1,
      filter.minTotalTokens ?? -1,
      filter.maxTotalTokens ?? -1,
      filter.tags ?? [],
      filter.excludeTags ?? [],
      new Date(fromTimestamp),
      new Date(toTimestamp),
      limit,
      offset,
    );
    logger.debug(`Executing sql query: ${typedSql.sql}, ${typedSql.values}`);
    const result = await prisma.$queryRawTyped(typedSql);

    const entries = result.map((entry) => {
      const res: ParsedDataServiceListTraceSchema = {
        ApplicationId: entry.application_id,
        Version: entry.version,
        Events: 0,
        Latency: entry.duration ?? 0,
        ResourceAttributes: { version: entry.version },
        StartTime: entry.trace_start_time?.toString() ?? '',
        Tags: entry.unique_tags ?? [],
        TraceId: entry.trace_id,
        EndTime: entry.trace_end_time?.toString() ?? '',
        PromptTokens: Number(entry.prompt_tokens) ?? 0,
        CompletionTokens: Number(entry.completion_tokens) ?? 0,
        TotalTokens: Number(entry.total_tokens) ?? 0,
      };
      return JSON.stringify(res);
    });

    return {
      entries: entries,
      nextOffset: offset + limit,
      total: Number(totalTraces),
      partial: ((totalTraces ?? 0) > offset + limit) as boolean,
    };
  }

  async getTracesDataRange(props: TraceDataRangeRequest): Promise<TraceDataRangeResponse> {
    const { resourceId } = props;

    const traceTotalTypedSql = traceTotal(resourceId ?? '', new Date(0), new Date(2524636800000));
    const traceTotalResult = await prisma.$queryRawTyped(traceTotalTypedSql);
    const result = traceTotalResult[0];

    return {
      resourceId: resourceId ?? '',
      hasTraceData: (result.total_traces ?? 0) > 0,
      minStartTime: Number(result.min_starttime_millis ?? 0),
      maxStartTime: Number(result.max_endtime_millis ?? 0),
    };
  }

  async batchableGetTracesDateRange(): Promise<TraceDataRangeEntry[]> {
    return [];
  }

  filterResourcesWithTraces(params: { resourceId: string }): TraceDataRangeResponse {
    return {
      ...params,
      hasTraceData: true,
      minStartTime: 0,
      maxStartTime: 0,
    };
  }

  async getTracesSummary(props: TraceSummaryRequest): Promise<TraceSummaryResponse> {
    const { resourceId, interval } = props;
    const { fromTimestamp, toTimestamp } = intervalToDateRange(interval) ?? {
      fromTimestamp: 0,
      toTimestamp: 0,
    };
    const typedSql = traceSummary(
      resourceId ?? '',
      new Date(fromTimestamp - 60 * 60 * 1000), // expand span search window to get all spans in the trace
      new Date(toTimestamp + 60 * 60 * 1000),
      new Date(fromTimestamp), // remove search window entries that are not in the interval
      new Date(toTimestamp),
    );
    logger.debug(`Executing sql query: ${typedSql.sql}, ${typedSql.values}`);
    const result = await prisma.$queryRawTyped(typedSql);
    const entries = result.map((entry) => {
      const res: DataServiceTraceSummarySchema = {
        dateTime: Number(entry.datetime) ?? 0,
        total: Number(entry.total) ?? 0,
        totalWithPolicyIssues: Number(entry.totalwithpolicyissues) ?? 0,
        totalBlocked: Number(entry.totalblocked) ?? 0,
        totalLatencyMillis: Number(entry.totallatencymillis) ?? 0,
        totalTokens: Number(entry.totaltokens) ?? 0,
      };
      return JSON.stringify(res);
    });
    return {
      entries: entries,
    };
  }

  async getTracesTagSummary(props: TraceSummaryRequest): Promise<TraceSummaryResponse> {
    const { resourceId, interval } = props;
    const { fromTimestamp, toTimestamp } = intervalToDateRange(interval) ?? {
      fromTimestamp: 0,
      toTimestamp: 0,
    };
    const typedSql = traceSummaryTag(
      resourceId ?? '',
      new Date(fromTimestamp - 60 * 60 * 24 * 1000 * 1000), // 2 day search window for all spans in the trace
      new Date(toTimestamp + 60 * 60 * 24 * 1000 * 1000),
    );
    logger.debug(`Executing sql query: ${typedSql.sql}, ${typedSql.values}`);
    const result = await prisma.$queryRawTyped(typedSql);
    const entries = result.map((entry) => {
      const res: DataServiceTraceSummaryTagSchema = {
        dateTime: Number(entry.datetime) ?? 0,
        tags: entry.tag ?? '',
        count: Number(entry.occurrence_count) ?? 0,
      };
      return JSON.stringify(res);
    });
    return {
      entries: entries,
    };
  }

  parseTraceEntryCounts(
    entry: string,
  ): { violationsCount: number; blockedInteractionsCount: number; total: number } | null {
    try {
      // OpenAPI client says that response it's a string, but in fact it is an Object
      const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
      const issues: TraceEntryCounts = { violationsCount: 0, blockedInteractionsCount: 0, total: 0 };
      if ('totalWithPolicyIssues' in parsed && isNumber(parsed.totalWithPolicyIssues)) {
        issues.violationsCount = parsed.totalWithPolicyIssues;
      }
      if ('totalBlocked' in parsed && isNumber(parsed.totalBlocked)) {
        issues.blockedInteractionsCount = parsed.totalBlocked;
      }
      if ('total' in parsed && isNumber(parsed.totalBlocked)) {
        issues.total = parsed.total;
      }
      return issues;
    } catch (_) {
      return null;
    }
  }
}
