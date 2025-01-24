import { TraceListFilter } from '@whylabs/data-service-node-client';

import { isNumber } from '../../../../util/type-guards';
import { ReadyToQueryFilter } from '../../../util/composedFilterSchema';
import { convertQueryFilterToTraceListFilter, parseTraceEntry } from './llmTraceUtils';

type TraceDetailFilter = TraceListFilter & {
  excludeTypes?: string[];
  types?: string[];
};

export const filterTraceDetail = (
  [trace, rawTrace]: ReturnType<typeof parseTraceEntry>,
  composedFilters: ReadyToQueryFilter[],
): boolean => {
  if (!composedFilters?.length) return true;
  if (!trace) return false;

  const parsedFilters: TraceDetailFilter = composedFilters.reduce((acc, f) => {
    const convertedFilter = (() => {
      if (f.dimension === 'type') {
        const valueAsList = f.value.split(',').map((t) => t.toLowerCase().trim());

        if (f.condition === 'includes') {
          return { types: valueAsList };
        }
        return { excludeTypes: valueAsList };
      }

      return convertQueryFilterToTraceListFilter(f);
    })();

    return { ...acc, ...convertedFilter };
  }, {});

  // Includes violation tags filter
  if (parsedFilters.tags && parsedFilters.tags.length) {
    const tags = parsedFilters.tags;
    return trace.parsedTags?.some(({ label }) => tags.includes(label.toLowerCase())) ?? false;
  }

  // Excludes violation tags filter
  if (parsedFilters.excludeTags && parsedFilters.excludeTags.length) {
    const tags = parsedFilters.excludeTags;
    return trace.parsedTags?.every(({ label }) => !tags.includes(label.toLowerCase())) ?? true;
  }

  // Includes type filter
  if (parsedFilters.types) {
    return parsedFilters.types.some((t) => trace.type.toLowerCase() === t) ?? false;
  }

  // Excludes type filter
  if (parsedFilters.excludeTypes) {
    return parsedFilters.excludeTypes.every((t) => !trace.type.toLowerCase().includes(t)) ?? true;
  }

  // Max Token usage filter
  if (parsedFilters.maxTotalTokens) {
    const totalTokens = rawTrace?.TraceAttributes['llm.usage.total_tokens'];
    if (!isNumber(totalTokens)) return false;
    return totalTokens <= parsedFilters.maxTotalTokens;
  }

  // Min Token usage filter
  if (parsedFilters.minTotalTokens) {
    const totalTokens = rawTrace?.TraceAttributes['llm.usage.total_tokens'];
    if (!isNumber(totalTokens)) return false;
    return totalTokens >= parsedFilters.minTotalTokens;
  }

  // Max Latency usage filter
  if (parsedFilters.minLatencyMillis) {
    if (!trace.latencyAsMillis) return false;
    return trace.latencyAsMillis >= parsedFilters.minLatencyMillis;
  }

  // Min Latency usage filter
  if (parsedFilters.maxLatencyMillis) {
    if (!trace.latencyAsMillis) return false;
    return trace.latencyAsMillis <= parsedFilters.maxLatencyMillis;
  }

  return true;
};
