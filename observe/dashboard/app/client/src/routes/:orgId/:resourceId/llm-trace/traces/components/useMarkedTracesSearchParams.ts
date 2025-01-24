import {
  FILTERED_TRACES,
  OFFSET_QUERY_NAME,
  SELECTED_ALL_TRACES,
  SPAN_ID_QUERY_NAME,
  TRACE_ID_QUERY_NAME,
} from '~/utils/searchParamsConstants';
import { isObject } from '~/utils/typeGuards';
import LogRocket from 'logrocket';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const parseParam = (value: string | null): Set<string> => {
  if (!value) return new Set();
  try {
    const parsed = JSON.parse(value);
    if (isObject(parsed) && Array.isArray(parsed)) {
      return new Set<string>(parsed);
    }
    return new Set();
  } catch (e) {
    LogRocket.error(e, 'Failed to parse marked traces param');
    return new Set();
  }
};

/*
 * This hook wraps some logic to handle the checkboxes on the traces table, used to manage the embeddings visualizer
 * */
export const useMarkedTracesSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectAllTracesMode = searchParams.get(SELECTED_ALL_TRACES) === 'true';

  const { includedTraces, excludedTraces } = useMemo(() => {
    const object = searchParams.get(FILTERED_TRACES);
    const traceIds = parseParam(object);
    return {
      // if all traces are selected, the request filter should be empty
      includedTraces: selectAllTracesMode ? new Set<string>() : traceIds,
      excludedTraces: selectAllTracesMode ? traceIds : new Set<string>(),
    };
  }, [searchParams, selectAllTracesMode]);

  const handleHeaderCheckboxChange = (checked: boolean) => {
    setSearchParams((nextParams) => {
      nextParams.delete(FILTERED_TRACES);
      if (checked) {
        nextParams.set(SELECTED_ALL_TRACES, 'true');
      } else {
        nextParams.delete(SELECTED_ALL_TRACES);
      }
      return nextParams;
    });
  };

  const handleRowCheckboxChange = (id: string | null, action: 'check' | 'uncheck') => {
    if (!id) return;
    setSearchParams((nextParams) => {
      const currentParam = nextParams.get(FILTERED_TRACES);
      const parsedValues = parseParam(currentParam);
      if ((action === 'check' && !selectAllTracesMode) || (action === 'uncheck' && selectAllTracesMode)) {
        parsedValues.add(id);
      } else {
        parsedValues.delete(id);
      }
      if (parsedValues.size > 0) {
        nextParams.set(FILTERED_TRACES, JSON.stringify([...parsedValues.values()]));
      } else {
        nextParams.delete(FILTERED_TRACES);
      }
      return nextParams;
    });
  };

  const clearMarkedTracesParams = useCallback((nextParams: URLSearchParams) => {
    nextParams.delete(FILTERED_TRACES);
    nextParams.delete(SELECTED_ALL_TRACES);

    // reset pagination offset when filters are applied
    nextParams.delete(OFFSET_QUERY_NAME);
  }, []);

  const hasPartialSelection = (() => {
    return Boolean((selectAllTracesMode && excludedTraces.size) || (!selectAllTracesMode && includedTraces.size));
  })();

  const isTraceChecked = (traceId: string) => {
    if (selectAllTracesMode && !hasPartialSelection) return true;
    if (selectAllTracesMode) return !excludedTraces.has(traceId);
    return includedTraces.has(traceId);
  };

  const requestFilter = useMemo(() => {
    const targetSpanIdFilter = searchParams.get(SPAN_ID_QUERY_NAME);
    const targetTraceIdFilter = searchParams.get(TRACE_ID_QUERY_NAME);
    if (targetSpanIdFilter && targetTraceIdFilter) {
      return { spanIds: [targetSpanIdFilter], includedTraces: [targetTraceIdFilter] };
    }
    if (!selectAllTracesMode && !includedTraces.size) return null;
    return { includedTraces: [...includedTraces.values()], excludedTraces: [...excludedTraces.values()] };
  }, [excludedTraces, includedTraces, selectAllTracesMode, searchParams]);

  const calculateSelectedTraces = (totalTracesWithCoordinates: number) => {
    if (selectAllTracesMode && !hasPartialSelection) return totalTracesWithCoordinates;
    if (selectAllTracesMode) return Math.max(totalTracesWithCoordinates - excludedTraces.size, 0);
    return Math.min(includedTraces.size, totalTracesWithCoordinates);
  };

  return {
    includedTraces,
    excludedTraces,
    handleHeaderCheckboxChange,
    hasPartialSelection,
    handleRowCheckboxChange,
    selectAllTracesMode,
    isTraceChecked,
    requestFilter,
    calculateSelectedTraces,
    clearMarkedTracesParams,
  };
};
