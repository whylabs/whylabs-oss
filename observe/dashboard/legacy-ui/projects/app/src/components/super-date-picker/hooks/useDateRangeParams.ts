import {
  convertReadableParamToDate,
  CUSTOM_RANGE,
  handleURLSearchParamUpdate,
  isInvalidDateRange,
  WhyLabsPickerCommonProps,
} from 'components/super-date-picker/utils';
import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getDefaultPresetWindowSize,
  getPresetGranularity,
  mapPresetGranularityToTimePeriod,
  PRESET_SEPARATOR,
  RELATIVE_PRESET_TOKEN,
  useDynamicTrailingRangePresets,
} from 'hooks/useDynamicTrailingRangePresets';
import { parseDateWithFallback } from 'utils/dateUtils';
import { TimePeriod } from 'generated/graphql';
import { NEW_GLOBAL_END_RANGE, NEW_GLOBAL_START_RANGE, NEW_GLOBAL_RANGE_PRESET } from 'types/navTags';
import { getUsableRangeAndTooltip } from '../../profiles-range-link/rangeLimitHelper';

export type DateRangeParamsReturnType = {
  startTimestamp?: number;
  endTimestamp?: number;
  rawStartTimestamp?: number;
  rawEndTimestamp?: number;
  appliedPreset: string;
  setRangeParams: ({
    start,
    end,
    dynamicPreset,
  }: {
    start?: string | null;
    end?: string | null;
    dynamicPreset?: string | null;
  }) => void;
  loading?: boolean;
  isUsingFallbackRange: boolean;
};
/**
 * This hook should be used only inside the date picker component.
 * To get and manipulate the picker externally use useSuperGlobalDateRange.
 */
export const useDateRangeParams = ({
  startDateSearchParamKey = NEW_GLOBAL_START_RANGE,
  endDateSearchParamKey = NEW_GLOBAL_END_RANGE,
  dynamicPresetSearchParamKey = NEW_GLOBAL_RANGE_PRESET,
  timePeriod = TimePeriod.P1D,
  loading,
  shouldTruncateRangeIfNeeded,
}: WhyLabsPickerCommonProps = {}): DateRangeParamsReturnType => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const rawPresetSearchParam = searchParams.get(dynamicPresetSearchParamKey);
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
      ? isInvalidDateRange(startDateFromISOSearchParam!.getTime(), endDateFromISOSearchParam!.getTime())
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

  const usedDatePickerRange = useMemo(() => {
    if (!shouldTruncateRangeIfNeeded || !parsedStart || !parsedEnd) return { from: parsedStart, to: parsedEnd };
    const { range } = getUsableRangeAndTooltip(timePeriod, [parsedStart.getTime(), parsedEnd.getTime()], null, true);
    return range ? { from: new Date(range[0]), to: new Date(range[1]) } : { from: parsedStart, to: parsedEnd };
  }, [parsedEnd, parsedStart, shouldTruncateRangeIfNeeded, timePeriod]);

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
    if (hasStaticDateParams && isRelativePreset) {
      setRangeParams({ dynamicPreset: CUSTOM_RANGE });
    }
  }, [hasStaticDateParams, rawPresetSearchParam, setRangeParams]);

  const appliedPreset = useMemo(() => {
    if (rawPresetSearchParam) return rawPresetSearchParam;
    if (hasStaticDateParams) return CUSTOM_RANGE;
    const defaultRelativeWindow = fallbackWindowSize?.toString();
    const defaultPresetGranularityToken = getPresetGranularity(timePeriod);
    return `${defaultPresetGranularityToken}${RELATIVE_PRESET_TOKEN}${defaultRelativeWindow}`;
  }, [fallbackWindowSize, hasStaticDateParams, rawPresetSearchParam, timePeriod]);

  const isUsingFallbackRange = !hasStaticDateParams && !rawPresetSearchParam;

  return {
    startTimestamp: usedDatePickerRange.from?.getTime(),
    endTimestamp: usedDatePickerRange.to?.getTime(),
    isUsingFallbackRange,
    setRangeParams,
    loading,
    appliedPreset,
  };
};
