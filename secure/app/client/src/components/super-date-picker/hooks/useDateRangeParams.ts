import { useCallback, useMemo } from 'react';
import {
  PRESET_SEPARATOR,
  RELATIVE_PRESET_TOKEN,
  defaultWindowSize,
  mapPresetGranularityToTimePeriod,
  mapTimePeriodToPresetGranularity,
  useDynamicTrailingRangePresets,
} from '~/hooks/useDynamicTrailingRangePresets';
import { useSearchAndHashParams } from '~/hooks/useSearchAndHashParams';
import { parseDateWithFallback } from '~/utils/dateUtils';
import { DATE_END_QUERY_NAME, DATE_START_QUERY_NAME, PRESET_RANGE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { TimePeriod } from '~server/types/api';

import {
  CUSTOM_RANGE,
  CustomRangeSearchParams,
  convertReadableParamToDate,
  handleURLSearchParamUpdate,
  isInvalidDateRange,
} from '../utils';

type GlobalDateRangeProps = {
  timePeriod?: TimePeriod;
  loading?: boolean;
} & CustomRangeSearchParams;

type DateRangeParamsReturnType = {
  startTimestamp?: number;
  endTimestamp?: number;
  rawStartTimestamp?: number;
  rawEndTimestamp?: number;
  appliedPreset: string;
  setRangeParams: ({
    start,
    end,
    presetWindow,
  }: {
    start?: string | null;
    end?: string | null;
    presetWindow?: string | null;
  }) => void;
  loading?: boolean;
  isUsingFallbackRange: boolean;
};
/**
 * This hook should be used only inside the date picker component.
 * To get and manipulate the picker externally use useSuperGlobalDateRange.
 */
export const useDateRangeParams = ({
  startDateSearchParamKey = DATE_START_QUERY_NAME,
  endDateSearchParamKey = DATE_END_QUERY_NAME,
  presetSizeSearchParamKey = PRESET_RANGE_QUERY_NAME,
  timePeriod = TimePeriod.P1D,
  loading,
}: GlobalDateRangeProps = {}): DateRangeParamsReturnType => {
  const [searchParams, setSearchParams] = useSearchAndHashParams();
  const rawStartSearchParam = searchParams.get(startDateSearchParamKey);
  const rawEndSearchParam = searchParams.get(endDateSearchParamKey);
  const startDateFromISOSearchParam = useMemo(
    () => convertReadableParamToDate(rawStartSearchParam, 'start'),
    [rawStartSearchParam],
  );
  const endDateFromISOSearchParam = useMemo(
    () => convertReadableParamToDate(rawEndSearchParam, 'end'),
    [rawEndSearchParam],
  );
  const rawPresetSearchParam = searchParams.get(presetSizeSearchParamKey);
  const relativePresetWindowSize = (() => {
    const separatorIndex = rawPresetSearchParam?.lastIndexOf(PRESET_SEPARATOR) ?? -1;
    const possibleWindowSize = rawPresetSearchParam?.substring(separatorIndex + 1);
    if (Number(possibleWindowSize) > 0) return Number(possibleWindowSize);
    return undefined;
  })();
  const relativePresetBatchFrequency = (() => {
    // to handle cases when we navigate from different date picker granularity with relative presets
    if (!relativePresetWindowSize || !rawPresetSearchParam) return undefined;
    const separator = rawPresetSearchParam.indexOf(PRESET_SEPARATOR);
    const granularityToken = rawPresetSearchParam.substring(0, separator);
    return mapPresetGranularityToTimePeriod.get(granularityToken);
  })();
  const { getTrailingWindow } = useDynamicTrailingRangePresets(relativePresetBatchFrequency ?? timePeriod);
  const fallbackWindowSize = defaultWindowSize.get(timePeriod);
  const [startFallback, endFallback] = getTrailingWindow(relativePresetWindowSize ?? fallbackWindowSize);

  const isInvalidRange = (() =>
    startDateFromISOSearchParam && endDateFromISOSearchParam
      ? isInvalidDateRange(startDateFromISOSearchParam.getTime(), endDateFromISOSearchParam.getTime())
      : false)();

  const parsedEnd = useMemo(() => {
    if (loading) return undefined;
    if (isInvalidRange) {
      return endFallback;
    }
    return parseDateWithFallback(endDateFromISOSearchParam?.toISOString() ?? null, endFallback);
  }, [endDateFromISOSearchParam, endFallback, isInvalidRange, loading]);

  const parsedStart = useMemo(() => {
    if (loading) return undefined;
    if (isInvalidRange) {
      return startFallback;
    }
    return parseDateWithFallback(startDateFromISOSearchParam?.toISOString() ?? null, startFallback);
  }, [isInvalidRange, loading, startDateFromISOSearchParam, startFallback]);

  const setRangeParams = useCallback(
    ({ start, end, presetWindow }: { start?: string | null; end?: string | null; presetWindow?: string | null }) => {
      setSearchParams((params) => {
        handleURLSearchParamUpdate(params, startDateSearchParamKey, start);
        handleURLSearchParamUpdate(params, endDateSearchParamKey, end);
        handleURLSearchParamUpdate(
          params,
          presetSizeSearchParamKey,
          presetWindow === undefined ? CUSTOM_RANGE : presetWindow,
        );
        return params;
      });
    },
    [endDateSearchParamKey, presetSizeSearchParamKey, setSearchParams, startDateSearchParamKey],
  );

  const appliedPreset = useMemo(() => {
    if (rawPresetSearchParam) return rawPresetSearchParam;
    const defaultRelativeWindow = fallbackWindowSize?.toString();
    const defaultPresetGranularityToken = mapTimePeriodToPresetGranularity.get(timePeriod);
    if ((!rawStartSearchParam || !rawEndSearchParam) && defaultRelativeWindow && defaultPresetGranularityToken)
      return `${defaultPresetGranularityToken}${RELATIVE_PRESET_TOKEN}${defaultRelativeWindow}`;
    return CUSTOM_RANGE;
  }, [fallbackWindowSize, rawEndSearchParam, rawPresetSearchParam, rawStartSearchParam, timePeriod]);

  const isUsingFallbackRange = !(rawStartSearchParam || rawEndSearchParam) && !rawPresetSearchParam;

  return {
    startTimestamp: parsedStart?.getTime(),
    endTimestamp: parsedEnd?.getTime(),
    isUsingFallbackRange,
    setRangeParams,
    loading,
    appliedPreset,
  };
};
