/* eslint-disable max-lines */

import path from 'path';

import { Condition, EmbeddingType, TraceListFilter } from '@whylabs/data-service-node-client';
import { z } from 'zod';

import { SortDirection } from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { queryTraces } from '../../../../services/data/data-service/api-wrappers/traces';
import { createNumberFilter, stringIsNumberFilterCondition } from '../../../../util/composed-filters-utils';
import { createLatencyText } from '../../../../util/latency-utils';
import { isObject, isString } from '../../../../util/type-guards';
import { TrpcContext } from '../../../trpc';
import { formatTrpcContext } from '../../../trpc-error';
import { ReadyToQueryFilter, readyToQueryFiltersSchema } from '../../../util/composedFilterSchema';
import { commonDateRangeInputSchema, paginatedSchema, recordStringUnknownSchema } from '../../../util/schemas';
import {
  ParsedDataServiceListTraceSchema,
  ParsedDataServiceTraceSchema,
  dataServiceListTraceSchema,
  dataServiceTraceSchema,
  tokenUsageSchema,
} from '../schemas/llmTraceSchemas';
import { ParsedSecureTag, TraceContent, TraceItem, TracesSortBy } from '../types/llmTraceTypes';

const logger = getLogger(path.parse(__filename).base);

export const tracesListCommonSchema = paginatedSchema
  .merge(commonDateRangeInputSchema)
  .merge(readyToQueryFiltersSchema);

export type QueryTracesParams = Parameters<typeof queryTraces>;
export type GetTracesProps = Pick<QueryTracesParams[0], 'attributeFilters' | 'filter'> &
  z.infer<typeof tracesListCommonSchema> & {
    customInterval?: string;
    includeContents?: boolean;
    sortBy?: TracesSortBy;
    sortDirection?: SortDirection;
  };

export type ListTracesProps = z.infer<typeof tracesListCommonSchema> & {
  customInterval?: string;
  includeContents?: boolean;
  sortBy?: TracesSortBy;
  sortDirection?: SortDirection;
};

export type GetTracesReturnType = {
  list: TraceItem[];
  totalCount: number;
  totalCountWithCoords?: number;
};

export const getParsedTrace = (traceString: string, ctx: TrpcContext): ParsedDataServiceTraceSchema => {
  try {
    return dataServiceTraceSchema.parse(traceString);
  } catch (error) {
    logger.error({ traceString, error }, `getParsedTrace error ${formatTrpcContext(ctx)}`);
    return null;
  }
};

export const getParsedAttributes = (attributes: string, ctx: TrpcContext): Record<string, unknown> | null => {
  try {
    return recordStringUnknownSchema.parse(attributes);
  } catch (error) {
    logger.error({ attributes, error }, `Couldn't parse trace attributes ${formatTrpcContext(ctx)}`);
    return null;
  }
};

export const getParsedParentTrace = (traceString: string, ctx: TrpcContext): ParsedDataServiceListTraceSchema => {
  try {
    return dataServiceListTraceSchema.parse(traceString);
  } catch (error) {
    logger.error({ traceString, error }, `getParsedParentTrace error ${formatTrpcContext(ctx)}`);
    return null;
  }
};

const parseTokenUsageFromTraceAttributes = (attributes: Record<string, unknown>) => {
  return tokenUsageSchema.safeParse(attributes);
};

export const createCompletionTokenUsageText = ({
  completion,
  prompt,
  total,
}: {
  completion?: number | null;
  prompt?: number | null;
  total?: number | null;
}): string => {
  if (!completion || !prompt || !total) return '';
  return `${prompt} → ${completion} (${total})`;
};

export const getCompletionTokenUsage = (attributes: Record<string, unknown>): string | undefined => {
  const tokenUsage = parseTokenUsageFromTraceAttributes(attributes);
  if (!tokenUsage.success) return undefined;

  return createCompletionTokenUsageText({
    completion: tokenUsage.data['llm.usage.completion_tokens'],
    prompt: tokenUsage.data['llm.usage.prompt_tokens'],
    total: tokenUsage.data['llm.usage.total_tokens'],
  });
};

const getValueFromObject = <T = string>(keyToSearch: string, obj: Record<string, T>): T | null => {
  const nameProp = Object.keys(obj).find((key) => key.toLowerCase().includes(keyToSearch));
  if (!nameProp) return null;

  const value: T = obj[nameProp];
  return value ?? null;
};

export const getStringValueFromObject = (keyToSearch: string, obj: Record<string, unknown>): string | null => {
  const value = getValueFromObject(keyToSearch, obj);
  return value ? String(value) : null;
};

export const parseTags = (tags: string[]): [number, Array<string>] => {
  const tagsSet = new Set(tags);
  const uniqueTags = Array.from(tagsSet).sort();

  // return the total number of tags and the sorted unique tags list
  return [tags.length, uniqueTags];
};

const readableTraceTagNameConverter = (tag: string): string => {
  return tag.replace('.score.', ' ').replace(/[._]/gm, ' ');
};

const findTagActionOnEvents = (
  tag: string,
  events: Exclude<ParsedDataServiceTraceSchema, null>['Events'],
): string | null => {
  if (!events) return null;
  const usedEvents = Array.isArray(events) ? events : [events];
  for (const event of usedEvents) {
    const { EventName, EventAttributes } = event;
    if (EventName !== 'whylabs.secure.validation' || !isObject(EventAttributes)) continue;
    const usedEvent = Array.isArray(EventAttributes) ? EventAttributes[0] : EventAttributes;
    const { metric, failure_level } = usedEvent as Record<string, unknown>;
    if (metric === tag && isString(failure_level)) {
      return failure_level;
    }
  }
  return null;
};

type NonNullableParsedTrace = Exclude<ParsedDataServiceTraceSchema, null>;
type TraceParseTagsprops = {
  Events: NonNullableParsedTrace['Events'];
  Tags: NonNullableParsedTrace['Tags'];
  TraceAttributes?: NonNullableParsedTrace['TraceAttributes'];
};
export const parseTraceTags = (traceEntry: TraceParseTagsprops): ParsedSecureTag[] => {
  const { Events, Tags, TraceAttributes } = traceEntry;
  const usedTags: string[] = (() => {
    if (Tags?.length) return Tags;
    const langkitTags = TraceAttributes?.['langkit.insights.tags'];
    if (isObject(langkitTags) && Array.isArray(langkitTags)) {
      return langkitTags as string[];
    }
    return [];
  })();
  const [, violationTags] = parseTags(usedTags);
  if (!violationTags.length) return [];
  return violationTags.map((name) => {
    const label = readableTraceTagNameConverter(name);
    const action = findTagActionOnEvents(name, Events);
    return {
      name,
      label,
      action,
    };
  });
};

export type NearestNeighborData = {
  type: EmbeddingType;
  x: number[];
  y: number[];
  z: number[];
  id: string[];
  dataset: string;
};
export const mapPrefixToType = new Map<string, EmbeddingType>([
  ['prompt', EmbeddingType.Prompt],
  ['response', EmbeddingType.Response],
]);

const NEIGHBOR_TOKEN = '_neighbor';
export const parseTraceNearestNeighbors = (
  TraceAttributes: NonNullableParsedTrace['TraceAttributes'],
  type?: EmbeddingType,
): NearestNeighborData[] => {
  const traceMetrics = (TraceAttributes['whylabs.secure.metrics'] as Record<string, unknown>) ?? {};
  const result: NearestNeighborData[] = [];
  Object.entries(traceMetrics).forEach(([key, value]) => {
    const metricParts = key.split('.');
    const neighborMetricName = metricParts[metricParts.length - 1] ?? '';
    const embeddingType = mapPrefixToType.get(metricParts[0]);
    const isNeighborDatasetIds =
      neighborMetricName.includes(`${NEIGHBOR_TOKEN}_ids`) && (type ? embeddingType === type : true);
    if (!isNeighborDatasetIds || !embeddingType) return;
    const [dataset] = neighborMetricName.split(NEIGHBOR_TOKEN);
    try {
      const ids = isString(value) ? JSON.parse(value) : value;
      // Once we have the neighbors IDS we can look up on coordinates for the same dataset
      const coords = traceMetrics[key.replace(`${NEIGHBOR_TOKEN}_ids`, `${NEIGHBOR_TOKEN}_coordinates`)];
      const parsedCoords = isString(coords) ? JSON.parse(coords) : coords;
      if (!Array.isArray(ids) || !Array.isArray(parsedCoords) || ids.length !== parsedCoords.length) return;
      const processedCoordinates = parsedCoords.reduce(
        (acc, curr) => {
          return {
            x: acc.x.concat(curr[0]),
            y: acc.y.concat(curr[1]),
            z: acc.z.concat(curr[2]),
          };
        },
        { x: [], y: [], z: [] },
      );
      result.push({ dataset, type: embeddingType, ...processedCoordinates, id: ids });
    } catch (err) {
      logger.error({ traceMetrics, err }, 'Failed to parse neighbors data');
    }
  });

  return result;
};

export const parseTraceEntry = ({
  ctx,
  entryString,
  includeContents = false,
}: {
  ctx: TrpcContext;
  entryString: string;
  includeContents?: boolean;
}): [TraceItem | null, ParsedDataServiceTraceSchema] => {
  const parsedTrace = getParsedTrace(entryString, ctx);
  if (!parsedTrace) return [null, null];
  const raw = { ...parsedTrace };

  const { Events, ParentId, ResourceAttributes, SpanId, SpanName, TraceId, TraceAttributes, Tags, HasCoords } =
    parsedTrace;

  const spanType = getStringValueFromObject('span.type', TraceAttributes);

  const parsedTags = parseTraceTags({ Events, TraceAttributes, Tags });
  const tags = parsedTags.map(({ label }) => label);
  const [totalTags, violationTags] = parseTags(tags);

  const endTime = new Date(parsedTrace.EndTime).getTime();
  const startTime = new Date(parsedTrace.StartTime).getTime();

  const contents: TraceContent[] = (() => {
    if (!includeContents) return [];
    const list: TraceContent[] = [{ title: 'Raw attributes', content: TraceAttributes }];

    if (!Events) return list;

    const isEventsAnValidArray = Array.isArray(Events) && Events.length > 0;
    const isEventsAnValidObject = Object.keys(Events).length > 0;
    // Only include Events if it's not empty
    if (isEventsAnValidArray || isEventsAnValidObject) {
      list.push({ title: 'Events', content: Events });
    }

    return list;
  })();

  const nearestNeighborsData = includeContents ? parseTraceNearestNeighbors(TraceAttributes) : undefined;

  const latencyAsMillis = (() => {
    if (parsedTrace.Latency) return parsedTrace.Latency;

    return endTime - startTime;
  })();

  const latency = createLatencyText(latencyAsMillis);

  const parsedEntry = {
    applicationId: getStringValueFromObject('name', ResourceAttributes),
    contents,
    endTime,
    id: SpanId,
    inputAndCompletionTokens: getCompletionTokenUsage(TraceAttributes),
    latency,
    latencyAsMillis,
    name: SpanName,
    parentId: ParentId,
    startTime,
    totalPolicyIssues: totalTags,
    traceId: TraceId,
    type: spanType?.toUpperCase() || 'SPAN',
    version: getStringValueFromObject('version', ResourceAttributes),
    violationTags,
    parsedTags,
    nearestNeighborsData,
    hasPcaCoords: !!HasCoords,
  };

  return [parsedEntry, raw];
};

export const convertQueryFilterToTraceListFilter = ({
  condition,
  dimension,
  value,
}: ReadyToQueryFilter): TraceListFilter => {
  // If it's a number and a valid condition, we can use it as a filter
  if (stringIsNumberFilterCondition(condition)) {
    if (['latency', 'policyIssues', 'tokenUsage'].includes(dimension)) {
      const key = (() => {
        if (dimension === 'latency') return 'LatencyMillis';
        if (dimension === 'policyIssues') return 'PolicyIssues';
        return 'TotalTokens';
      })();

      return createNumberFilter({ condition, key, value: Number(value) });
    }
  }

  if (dimension === 'traceId') {
    if (value.includes(',')) {
      const traceIds = value.split(',').map((t) => t.trim());
      // list filter for multiple traces -- does not support partial id match
      return { traceIds };
    }
    // regex filter for partial strings
    return { traceIdSubstring: value };
  }

  if (dimension === 'violationTags') {
    const tags = value.split(',');

    if (condition === 'includes') {
      return { tags, tagCondition: Condition.Or };
    } else if (condition === 'excludes') {
      return { excludeTags: tags };
    }
  }

  if (dimension === 'applicationId') {
    return { serviceName: value };
  }

  logger.error({ dimension, condition, value }, 'Missing filter implementation to fetch traces');
  return {};
};

export const mountTraceListHeaderFilters = (composedFilters?: ReadyToQueryFilter[]): TraceListFilter => {
  if (!composedFilters?.length) return {};

  return composedFilters.reduce((acc, f) => {
    return { ...acc, ...convertQueryFilterToTraceListFilter(f) };
  }, {});
};
