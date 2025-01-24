/* eslint-disable max-lines */

import { z } from 'zod';

import { getLogger } from '../../../providers/logger';
import { getIntervalFromResource } from '../../../services/data/data-service/api-wrappers/model-metrics';
import { DefaultTracesService } from '../../../services/data/data-service/api-wrappers/traces/traces';
import { getInterval } from '../../../services/data/data-service/data-service-utils';
import { Granularity, SortDirection } from '../../../types/api';
import { createLatencyText } from '../../../util/latency-utils';
import { router, TrpcContext, viewResourceDataProcedure, viewResourceDataProcedureWithDateInterval } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { commonDateRangeInputSchema } from '../../util/schemas';
import { TraceItem } from './types/llmTraceTypes';
import { getParsedTagSummary } from './utils/llmTraceSummaryUtils';

import { TracesSortBy } from '../../../types/api';
import {
  createCompletionTokenUsageText,
  getParsedAttributes,
  getParsedParentTrace,
  getStringValueFromObject,
  GetTracesProps,
  GetTracesReturnType,
  ListTracesProps,
  mountTraceListHeaderFilters,
  parseParentTraceTags,
  parseTags,
  parseTraceEntry,
  tracesListCommonSchema,
} from './utils/llmTraceUtils';

const logger = getLogger('llm-trace');
const tracesService = new DefaultTracesService();

const getTraces = async (
  { includeContents, resourceId, sortDirection = SortDirection.Desc, ...rest }: GetTracesProps,
  ctx: TrpcContext,
): Promise<GetTracesReturnType> => {
  const callOptions = callOptionsFromTrpcContext(ctx);
  // TODO: #hadron interval string calculation
  const interval = 'foo bar';

  const response = await tracesService.queryTraces(
    {
      ...rest,
      asc: sortDirection === SortDirection.Asc,
      interval,
      resourceId,
    },
    callOptions,
  );

  const totalCount = response.total ?? 0;

  if (!response.entries.length) {
    return {
      list: [],
      totalCount,
    };
  }

  const list: TraceItem[] = [];
  response.entries.forEach((entryString) => {
    const parsedTrace = parseTraceEntry({ ctx, includeContents, entryString });

    if (parsedTrace) list.push(parsedTrace);
  });

  return {
    list,
    totalCount,
  };
};

const getParentTraces = async (
  {
    composedFilters,
    customInterval,
    includeContents = true,
    resourceId,
    sortBy = TracesSortBy.Timestamp,
    sortDirection = SortDirection.Desc,
    fromTimestamp,
    toTimestamp,
    ...rest
  }: ListTracesProps,
  ctx: TrpcContext,
): Promise<GetTracesReturnType> => {
  const callOptions = callOptionsFromTrpcContext(ctx);
  const interval = customInterval ?? (await getIntervalFromResource({ resourceId, fromTimestamp, toTimestamp }));

  const filter = mountTraceListHeaderFilters(composedFilters);

  const response = await tracesService.listTraces(
    {
      ...rest,
      asc: sortDirection === SortDirection.Asc,
      interval,
      sortCondition: sortBy,
      resourceId,
      filter,
    },
    callOptions,
  );
  logger.info('Done with trace listing');

  const totalCount = response.total ?? 0;

  if (!response.entries.length) {
    return {
      list: [],
      totalCount: 0,
    };
  }

  const list: TraceItem[] = [];

  response.entries.forEach((e) => {
    const parsedTrace = getParsedParentTrace(JSON.parse(e), ctx);

    if (parsedTrace) {
      const { CompletionTokens, PromptTokens, ResourceAttributes, TotalTokens, HasCoords } = parsedTrace;

      const parsedTags = parseParentTraceTags(parsedTrace);
      const tags = parsedTags.map(({ label }) => label);
      const [totalTags, violationTags] = parseTags(tags);

      const endTime = new Date(parsedTrace.EndTime).getTime();
      const startTime = new Date(parsedTrace.StartTime).getTime();

      list.push({
        applicationId: parsedTrace.ApplicationId,
        contents: includeContents ? [{ title: 'Raw attributes', content: ResourceAttributes }] : [],
        endTime,
        id: parsedTrace.TraceId,
        inputAndCompletionTokens: createCompletionTokenUsageText({
          completion: CompletionTokens,
          prompt: PromptTokens,
          total: TotalTokens,
        }),
        latency: createLatencyText(parsedTrace.Latency),
        name: parsedTrace.TraceId,
        startTime,
        totalPolicyIssues: totalTags,
        traceId: parsedTrace.TraceId,
        version: getStringValueFromObject('version', parsedTrace.ResourceAttributes),
        violationTags,
        parsedTags,
        type: 'TRACE',
        hasPcaCoords: !!HasCoords,
      });
    }
  });

  logger.info("Done parsing parent traces' tags");
  return {
    list,
    totalCount,
  };
};

export const llmTrace = router({
  getLineage: viewResourceDataProcedure.query(async ({ ctx, input: { resourceId } }) => {
    const { minStartTime, maxStartTime } = await tracesService.getTracesDataRange(
      { resourceId },
      callOptionsFromTrpcContext(ctx),
    );

    return {
      start: minStartTime,
      end: maxStartTime,
    };
  }),
  getViolationTags: viewResourceDataProcedure
    .input(commonDateRangeInputSchema)
    .query(async ({ ctx, input: { fromTimestamp, resourceId, toTimestamp } }) => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      const interval = getInterval(fromTimestamp, toTimestamp);
      // TODO: #hadron
      const granularity = Granularity.Hourly;
      const response = await tracesService.getTracesTagSummary(
        {
          granularity,
          interval,
          resourceId,
        },
        callOptions,
      );

      const tags = new Set<string>();
      response.entries.forEach((entry) => {
        const parsedEntry = getParsedTagSummary(entry, ctx);
        if (parsedEntry?.tags) tags.add(parsedEntry.tags);
      });

      return Array.from(tags).sort();
    }),
  describe: viewResourceDataProcedure
    .input(z.object({ traceId: z.string().min(1) }))
    .query(async ({ ctx, input: { resourceId, traceId } }) => {
      const traceDetail = await tracesService.getTraceDetail({
        asc: true,
        resourceId,
        traceId,
      });
      const { resourceAttributes, latency, tags } = traceDetail;
      const endTime = new Date(traceDetail.endTime).getTime();
      const startTime = new Date(traceDetail.startTime).getTime();

      // We create a summary trace item to represent the trace itself on the Tree View visualization
      const summaryTraceItem: TraceItem = {
        contents: [{ title: 'Raw attributes', content: getParsedAttributes(resourceAttributes, ctx) }],
        endTime,
        id: traceId,
        inputAndCompletionTokens: createCompletionTokenUsageText({
          completion: traceDetail.completionTokens,
          prompt: traceDetail.promptTokens,
          total: traceDetail.totalTokens,
        }),
        latency: createLatencyText(latency),
        name: traceId,
        startTime,
        traceId,
        totalPolicyIssues: tags.length,
        type: 'TRACE',
        // We don't want to display the violation tags on the summary item
        violationTags: [],
      };

      const children: TraceItem[] = [];
      traceDetail.entries.forEach((entryString) => {
        const parsedTrace = parseTraceEntry({ ctx, entryString });

        if (parsedTrace) {
          // We don't want it to have an undefined or empty string parentId, but the traceId instead
          if (!parsedTrace.parentId) {
            parsedTrace.parentId = traceId;
          }
          children.push(parsedTrace);
        }
      });

      // We want to make sure all children have an existing parent, if not, set it to be child of the summary trace
      const validParentIds = new Set<string>([traceId]);
      children.forEach((child) => {
        if (!child.parentId) return;

        if (!validParentIds.has(child.parentId) && !children.find((c) => c.id === child.parentId)) {
          child.parentId = traceId;
        } else {
          validParentIds.add(child.parentId);
        }
      });

      // Add the summary trace item to the children list
      children.push(summaryTraceItem);

      return {
        summary: summaryTraceItem,
        children,
      };
    }),
  describeItem: viewResourceDataProcedure
    .input(z.object({ itemId: z.string().min(1), traceId: z.string().min(1) }))
    .query(async ({ ctx, input: { itemId, resourceId, traceId } }) => {
      // for this query we don't want to worry about interval, so we set it to a large inclusive range
      const customInterval = '1970-01-01T00:00:00.000Z/P99Y';

      const traces = await getTraces(
        {
          customInterval,
          filter: {
            spanId: itemId,
            traceId,
          },
          includeContents: true,
          resourceId,
          limit: 1,
          offset: 0,
          // Since we are using customInterval, we don't need to worry about fromTimestamp and toTimestamp
          fromTimestamp: 0,
          toTimestamp: 0,
        },
        ctx,
      );
      return traces.list[0] ?? null;
    }),
  list: viewResourceDataProcedureWithDateInterval
    .input(
      z
        .object({
          sortBy: z.nativeEnum(TracesSortBy).optional(),
          sortDirection: z.nativeEnum(SortDirection).optional(),
        })
        .merge(tracesListCommonSchema),
    )
    .query(async ({ ctx, input }): Promise<GetTracesReturnType> => {
      return getParentTraces(input, ctx);
    }),
});
