/* eslint-disable max-lines */

import { z } from 'zod';

import { SortDirection } from '../../../graphql/generated/graphql';
import {
  getGranularityFromResource,
  getIntervalFromResource,
} from '../../../services/data/data-service/api-wrappers/model-metrics';
import {
  getTraceDetail,
  getTracesDataRange,
  getTracesTagSummary,
  listTraces,
  queryTraces,
} from '../../../services/data/data-service/api-wrappers/traces';
import { getInterval } from '../../../services/data/data-service/data-service-utils';
import { createLatencyText } from '../../../util/latency-utils';
import { TrpcContext, router, viewResourceDataProcedure, viewResourceDataProcedureWithDateInterval } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { readyToQueryFiltersSchema } from '../../util/composedFilterSchema';
import {
  commonDateRangeInputSchema,
  createSortBySchema,
  searchTermSchema,
  sortDirectionSchema,
} from '../../util/schemas';
import { TraceItem, TracesSortBy } from './types/llmTraceTypes';
import { getParsedTagSummary } from './utils/llmTraceSummaryUtils';
import {
  GetTracesProps,
  GetTracesReturnType,
  ListTracesProps,
  createCompletionTokenUsageText,
  getParsedAttributes,
  getParsedParentTrace,
  getStringValueFromObject,
  mountTraceListHeaderFilters,
  parseTags,
  parseTraceEntry,
  parseTraceTags,
  tracesListCommonSchema,
} from './utils/llmTraceUtils';
import { filterTraceDetail } from './utils/traceDetailUtils';

const getTraces = async (
  {
    customInterval,
    includeContents,
    orgId,
    resourceId,
    sortDirection = SortDirection.Desc,
    fromTimestamp,
    toTimestamp,
    ...rest
  }: GetTracesProps,
  ctx: TrpcContext,
): Promise<GetTracesReturnType> => {
  const callOptions = callOptionsFromTrpcContext(ctx);
  const interval =
    customInterval ?? (await getIntervalFromResource({ orgId, resourceId, fromTimestamp, toTimestamp }, callOptions));

  const response = await queryTraces(
    {
      ...rest,
      asc: sortDirection === SortDirection.Asc,
      interval,
      orgId,
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
    const [parsedTrace] = parseTraceEntry({ ctx, includeContents, entryString });

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
    orgId,
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
  const interval =
    customInterval ?? (await getIntervalFromResource({ orgId, resourceId, fromTimestamp, toTimestamp }, callOptions));

  const filter = mountTraceListHeaderFilters(composedFilters);

  const response = await listTraces(
    {
      ...rest,
      asc: sortDirection === SortDirection.Asc,
      interval,
      orgId,
      sortCondition: sortBy,
      resourceId,
      filter,
    },
    callOptions,
  );

  const totalCount = response.total ?? 0;
  const totalCountWithCoords = response.totalWithCoords ?? 0;

  if (!response.entries.length) {
    return {
      list: [],
      totalCount: 0,
      totalCountWithCoords: 0,
    };
  }

  const list: TraceItem[] = [];

  response.entries.forEach((e) => {
    const parsedTrace = getParsedParentTrace(e, ctx);

    if (parsedTrace) {
      const {
        CompletionTokens,
        PromptTokens,
        ResourceAttributes,
        TotalTokens,
        HasCoords,
        EventsList: Events,
        Tags,
      } = parsedTrace;

      const parsedTags = parseTraceTags({ Events, Tags });
      const tags = parsedTags.map(({ label }) => label);
      const [totalTags, violationTags] = parseTags(tags);

      const endTime = new Date(parsedTrace.EndTime).getTime();
      const startTime = new Date(parsedTrace.StartTime).getTime();

      list.push({
        applicationId: getStringValueFromObject('name', parsedTrace.ResourceAttributes),
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

  return {
    list,
    totalCount,
    totalCountWithCoords,
  };
};

export const llmTrace = router({
  getLineage: viewResourceDataProcedure.query(async ({ ctx, input: { orgId, resourceId } }) => {
    const { minStartTime, maxStartTime } = await getTracesDataRange(
      {
        orgId,
        resourceId,
      },
      callOptionsFromTrpcContext(ctx),
    );

    return {
      start: minStartTime,
      end: maxStartTime,
    };
  }),
  getViolationTags: viewResourceDataProcedure
    .input(commonDateRangeInputSchema)
    .query(async ({ ctx, input: { fromTimestamp, orgId, resourceId, toTimestamp } }) => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      const interval = getInterval(fromTimestamp, toTimestamp);

      const granularity = await getGranularityFromResource({ orgId, resourceId }, callOptions);

      const response = await getTracesTagSummary(
        {
          granularity,
          interval,
          orgId,
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
    .input(z.object({ traceId: z.string().min(1) }).merge(readyToQueryFiltersSchema))
    .query(async ({ ctx, input: { composedFilters, orgId, resourceId, traceId } }) => {
      const traceDetail = await getTraceDetail({
        asc: true,
        orgId,
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

      const violationTagsOptionsSet = new Set<string>();

      const children: TraceItem[] = [];
      traceDetail.entries.forEach((entryString) => {
        const [parsedTrace, rawParsedTrace] = parseTraceEntry({ ctx, entryString });

        if (parsedTrace) {
          if (!parsedTrace.parentId) {
            // We don't want it to have an undefined or empty string parentId, but the traceId instead
            parsedTrace.parentId = traceId;
          }

          // We want to keep track of all displayed violation tags before applying filters to display them on the filter options
          parsedTrace.parsedTags?.forEach(({ label }) => violationTagsOptionsSet.add(label));

          const shouldInclude = filterTraceDetail([parsedTrace, rawParsedTrace], composedFilters ?? []);
          if (shouldInclude) children.push(parsedTrace);
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
        children,
        summary: summaryTraceItem,
        violationTagsOptions: Array.from(violationTagsOptionsSet).sort(),
      };
    }),
  describeItem: viewResourceDataProcedure
    .input(z.object({ itemId: z.string().min(1), traceId: z.string().min(1) }))
    .query(async ({ ctx, input: { itemId, orgId, resourceId, traceId } }) => {
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
          orgId,
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
          sortBy: createSortBySchema(TracesSortBy, 'Timestamp'),
        })
        .merge(sortDirectionSchema)
        .merge(tracesListCommonSchema)
        .merge(searchTermSchema),
    )
    .query(async ({ ctx, input }): Promise<GetTracesReturnType> => {
      return getParentTraces(input, ctx);
    }),
});
