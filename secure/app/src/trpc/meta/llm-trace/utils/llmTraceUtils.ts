/* eslint-disable max-lines */

import path from 'path';

import { z } from 'zod';

import { getLogger } from '../../../../providers/logger';
import { TracesService } from '../../../../services/data/data-service/api-wrappers/traces/traces-service';
import { Condition, SortDirection, TraceListFilter, TracesSortBy } from '../../../../types/api';
import { createLatencyText } from '../../../../util/latency-utils';
import { isObject, isString } from '../../../../util/type-guards';
import { TrpcContext } from '../../../trpc';
import { formatTrpcContext } from '../../../trpc-error';
import { ReadyToQueryFilter, readyToQueryFiltersSchema } from '../../../util/composedFilterSchema';
import { commonDateRangeInputSchema, paginatedSchema, recordStringUnknownSchema } from '../../../util/schemas';
import {
  dataServiceListTraceSchema,
  dataServiceTraceSchema,
  ParsedDataServiceListTraceSchema,
  ParsedDataServiceTraceSchema,
  tokenUsageSchema,
} from '../schemas/llmTraceSchemas';
import { ParsedSecureTag, TraceContent, TraceItem } from '../types/llmTraceTypes';

const logger = getLogger(path.parse(__filename).base);

export const tracesListCommonSchema = paginatedSchema
  .merge(commonDateRangeInputSchema)
  .merge(readyToQueryFiltersSchema);

export type QueryTracesParams = Parameters<TracesService['queryTraces']>;
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
};

export const getParsedTrace = (traceString: string, ctx: TrpcContext): ParsedDataServiceTraceSchema => {
  try {
    return dataServiceTraceSchema.parse(JSON.parse(traceString));
  } catch (error) {
    logger.error({ traceString, error }, `getParsedTrace error ${formatTrpcContext(ctx)}`);
    return null;
  }
};

export const getParsedAttributes = (attributes: string, ctx: TrpcContext): Record<string, unknown> | null => {
  try {
    return recordStringUnknownSchema.parse(JSON.parse(attributes));
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

const readableTraceTagNameConverter = (tag: string) => {
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

export const parseParentTraceTags = (
  traceEntry: Exclude<ParsedDataServiceListTraceSchema, null>,
): ParsedSecureTag[] => {
  const { Tags } = traceEntry;
  if (!Tags?.length) return [];
  const [, violationTags] = parseTags(Tags);
  return violationTags.map((name) => {
    const label = readableTraceTagNameConverter(name);
    return {
      name,
      label,
      // todo - look up on children to get action type
    };
  });
};

export const parseTraceTags = (traceEntry: Exclude<ParsedDataServiceTraceSchema, null>): ParsedSecureTag[] => {
  const { Events, Tags, TraceAttributes } = traceEntry;
  const usedTags: string[] = (() => {
    if (Tags?.length) return Tags;
    const langkitTags = TraceAttributes['langkit.insights.tags'];
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

export const parseTraceEntry = ({
  ctx,
  entryString,
  includeContents = false,
}: {
  ctx: TrpcContext;
  entryString: string;
  includeContents?: boolean;
}): TraceItem | null => {
  const parsedTrace = getParsedTrace(entryString, ctx);
  if (!parsedTrace) return null;

  const { Events, ParentId, SpanId, SpanName, TraceId, TraceAttributes } = parsedTrace;

  const spanType = getStringValueFromObject('span.type', TraceAttributes);

  const parsedTags = parseTraceTags(parsedTrace);
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

  const latency = (() => {
    if (parsedTrace.Latency) return createLatencyText(parsedTrace.Latency);

    return createLatencyText(endTime - startTime);
  })();

  return {
    applicationId: parsedTrace.ApplicationId,
    contents,
    endTime,
    id: SpanId,
    inputAndCompletionTokens: getCompletionTokenUsage(TraceAttributes),
    latency,
    name: SpanName,
    parentId: ParentId,
    startTime,
    totalPolicyIssues: totalTags,
    traceId: TraceId,
    type: spanType?.toUpperCase() || 'SPAN',
    version: parsedTrace.Version,
    violationTags,
    parsedTags,
  };
};

const convertQueryFilterToTraceListFilter = ({ condition, dimension, value }: ReadyToQueryFilter): TraceListFilter => {
  // If it's a number and a valid condition, we can use it as a filter
  if (condition && ['<', '>'].includes(condition)) {
    const filterValue = Number(value);

    if (dimension === 'latency') {
      const milliseconds = filterValue * 1000;
      if (condition === '<') {
        // The server uses less than or equal to, so we subtract 1
        return { maxLatencyMillis: milliseconds - 1 };
      }
      // The server uses greater than or equal to, so we add 1
      return { minLatencyMillis: milliseconds + 1 };
    }

    if (dimension === 'policyIssues') {
      if (condition === '<') {
        // The server uses less than or equal to, so we subtract 1
        return { maxPolicyIssues: filterValue - 1 };
      }
      // The server uses greater than or equal to, so we add 1
      return { minPolicyIssues: filterValue + 1 };
    }

    if (dimension === 'tokenUsage') {
      if (condition === '<') {
        // The server uses less than or equal to, so we subtract 1
        return { maxTotalTokens: filterValue - 1 };
      }
      // The server uses greater than or equal to, so we add 1
      return { minTotalTokens: filterValue + 1 };
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
    // Replace commas and spaces with semicolons to split the tags
    const tags = value.replace(/(,| )+/g, ';').split(';');

    if (condition === 'includes') {
      return { tags, tagCondition: Condition.Or };
    } else if (condition === 'excludes') {
      return { excludeTags: tags };
    }
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
