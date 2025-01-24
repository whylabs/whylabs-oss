import {
  PRESET_SEPARATOR,
  RELATIVE_PRESET_TOKEN,
  getDefaultPresetWindowSize,
  getPresetGranularity,
  mapPresetGranularityToTimePeriod,
  useDynamicTrailingRangePresets,
} from '~/hooks/useDynamicTrailingRangePresets';
import { useSearchAndHashParams } from '~/hooks/useSearchAndHashParams';
import { parseDateWithFallback } from '~/utils/dateUtils';
import { DATE_END_QUERY_NAME, DATE_START_QUERY_NAME, PRESET_RANGE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { useCallback, useEffect, useMemo } from 'react';

import {
  CUSTOM_RANGE,
  CustomRangeSearchParams,
  WhyLabsSuperDatePickerProps,
  convertReadableParamToDate,
  handleURLSearchParamUpdate,
  isInvalidDateRange,
} from '../utils';

type GlobalDateRangeProps = {
  timePeriod?: TimePeriod;
  loading?: boolean;
} & CustomRangeSearchParams &
  Pick<WhyLabsSuperDatePickerProps, 'externalStateManager'>;

export type RangeSetterProps = {
  start?: string | null;
  end?: string | null;
  dynamicPreset?: string | null;
};

type DateRangeParamsReturnType = {
  startTimestamp?: number;
  endTimestamp?: number;
  rawStartTimestamp?: number;
  rawEndTimestamp?: number;
  appliedPreset: string;
  setRangeParams: (props: RangeSetterProps) => void;
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
  dynamicPresetSearchParamKey = PRESET_RANGE_QUERY_NAME,
  timePeriod = TimePeriod.P1D,
  externalStateManager,
  loading,
}: GlobalDateRangeProps = {}): DateRangeParamsReturnType => {
  const [searchParams, setSearchParams] = useSearchAndHashParams();
  const rawStartSearchParam = searchParams.get(startDateSearchParamKey);
  const rawEndSearchParam = searchParams.get(endDateSearchParamKey);
  const startDateFromISOSearchParam = useMemo(
    () => externalStateManager?.value?.start ?? convertReadableParamToDate(rawStartSearchParam, 'start'),
    [externalStateManager?.value?.start, rawStartSearchParam],
  );
  const endDateFromISOSearchParam = useMemo(
    () => externalStateManager?.value?.end ?? convertReadableParamToDate(rawEndSearchParam, 'end'),
    [externalStateManager?.value?.end, rawEndSearchParam],
  );
  const rawPresetSearchParam = externalStateManager?.value?.preset ?? searchParams.get(dynamicPresetSearchParamKey);
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
  const fallbackWindowSize = getDefaultPresetWindowSize(timePeriod);
  const [startFallback, endFallback] = getTrailingWindow(relativePresetWindowSize ?? fallbackWindowSize);

  const hasStaticDateParams = !!(startDateFromISOSearchParam && endDateFromISOSearchParam);

  const isInvalidRange = (() =>
    hasStaticDateParams
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

  const setRangeParams: DateRangeParamsReturnType['setRangeParams'] = useCallback(
    ({ start, end, dynamicPreset = null }) => {
      setSearchParams((params) => {
        const isRelativePreset = dynamicPreset?.includes(RELATIVE_PRESET_TOKEN);
        handleURLSearchParamUpdate(params, startDateSearchParamKey, isRelativePreset ? null : start);
        handleURLSearchParamUpdate(params, endDateSearchParamKey, isRelativePreset ? null : end);
        handleURLSearchParamUpdate(params, dynamicPresetSearchParamKey, dynamicPreset);
        return params;
      });
    },
    [endDateSearchParamKey, dynamicPresetSearchParamKey, setSearchParams, startDateSearchParamKey],
  );

  /*
   * Guardrails to fix the preset param if we get out of sync somehow
   * */
  useEffect(() => {
    const isRelativePreset = rawPresetSearchParam?.includes(RELATIVE_PRESET_TOKEN);
    if (hasStaticDateParams && isRelativePreset && !externalStateManager) {
      setRangeParams({ dynamicPreset: CUSTOM_RANGE });
    }
  }, [hasStaticDateParams, rawPresetSearchParam, setRangeParams, externalStateManager]);

  const appliedPreset = useMemo(() => {
    if (rawPresetSearchParam) return rawPresetSearchParam;
    if (hasStaticDateParams) return CUSTOM_RANGE;
    const defaultRelativeWindow = fallbackWindowSize?.toString();
    const defaultPresetGranularityToken = getPresetGranularity(timePeriod);
    return `${defaultPresetGranularityToken}${RELATIVE_PRESET_TOKEN}${defaultRelativeWindow}`;
  }, [fallbackWindowSize, hasStaticDateParams, rawPresetSearchParam, timePeriod]);

  const isUsingFallbackRange = !hasStaticDateParams && !rawPresetSearchParam && !externalStateManager?.value;

  return {
    startTimestamp: parsedStart?.getTime(),
    endTimestamp: parsedEnd?.getTime(),
    isUsingFallbackRange,
    setRangeParams,
    loading,
    appliedPreset,
  };
};
