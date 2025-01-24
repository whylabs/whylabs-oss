import { useDateRangeParams } from '~/components/super-date-picker/hooks/useDateRangeParams';
import { CustomRangeSearchParams, dateConstructorToReadableISOString } from '~/components/super-date-picker/utils';
import { GLOBAL_PICKER_ID } from '~/constants/hardcoded';
import { RELATIVE_PRESET_TOKEN, getPresetGranularity } from '~/hooks/useDynamicTrailingRangePresets';
import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import { SimpleDateRange } from '~/types/dateTypes';
import { rangeTranslatorByTimePeriod, setEndOfUTCMinute } from '~/utils/dateRangeUtils';
import { DATE_END_QUERY_NAME, DATE_START_QUERY_NAME, PRESET_RANGE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { isNumber } from '~/utils/typeGuards';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export type SuperGlobalDateRange = {
  dateRange: SimpleDateRange;
  rawDateRange: { startTimestamp?: number; endTimestamp?: number };
  loading: boolean;
  setDatePickerRange: (d: SimpleDateRange, preset?: string) => void;
  clearDatePickerParams: () => void;
  appliedPreset: string;
  openDatePicker: (id?: string) => void;
  datePickerSearchString: string;
  isUsingFallbackRange: boolean;
  applyTrailingWindowRange: (size: number, overrideTimePeriod?: TimePeriod) => void;
};

type SuperGlobalHookProps = {
  timePeriod?: TimePeriod;
  loading?: boolean;
  // The parameter will auto adjust the timestamps to match the start and end bounds of the bucket by TimePeriod.
  // We might want to disable it in some cases like the individual profiles' dashboard or when we want to allow fetch
  // data within a grain minor than hourly.
  autoAdjustTimestampsByTimePeriod?: boolean;
} & CustomRangeSearchParams;
export const useSuperGlobalDateRange = ({
  startDateSearchParamKey = DATE_START_QUERY_NAME,
  endDateSearchParamKey = DATE_END_QUERY_NAME,
  dynamicPresetSearchParamKey = PRESET_RANGE_QUERY_NAME,
  timePeriod,
  loading,
  autoAdjustTimestampsByTimePeriod = true,
}: SuperGlobalHookProps = {}): SuperGlobalDateRange => {
  const { orgId, resourceId } = useParams<{ orgId: string; resourceId: string }>();
  const { loading: loadingBatchFrequency, batchFrequency } = useResourceBatchFrequency({
    orgId,
    resourceId,
    overrideBatchFrequency: timePeriod,
  });
  const usedLoading = timePeriod || loading ? loading : loadingBatchFrequency;
  const usedTimePeriod = timePeriod ?? batchFrequency ?? TimePeriod.P1D;
  const { startTimestamp, endTimestamp, setRangeParams, appliedPreset, isUsingFallbackRange } = useDateRangeParams({
    loading: usedLoading,
    timePeriod: usedTimePeriod,
    startDateSearchParamKey,
    endDateSearchParamKey,
    dynamicPresetSearchParamKey,
  });
  const [searchParams] = useSearchParams();

  const openDatePicker = (pickerId = GLOBAL_PICKER_ID) => {
    (document.querySelector(`[data-pickerid="${pickerId}--input"]`) as HTMLElement)?.click();
  };

  const datePickerSearchString = useMemo(() => {
    const start = searchParams.get(startDateSearchParamKey);
    const end = searchParams.get(endDateSearchParamKey);
    const globalDatePickerParams = new URLSearchParams();
    if (start && end) {
      globalDatePickerParams.set(startDateSearchParamKey, start);
      globalDatePickerParams.set(endDateSearchParamKey, end);
    }
    if (appliedPreset) {
      globalDatePickerParams.set(dynamicPresetSearchParamKey, appliedPreset);
    }
    return globalDatePickerParams.toString();
  }, [searchParams, startDateSearchParamKey, endDateSearchParamKey, appliedPreset, dynamicPresetSearchParamKey]);

  const setDatePickerRange = useCallback(
    (newRange: SimpleDateRange, preset?: string) => {
      const { from, to } = newRange;
      const startString = dateConstructorToReadableISOString(from);
      const endString = dateConstructorToReadableISOString(to);
      setRangeParams({ start: startString, end: endString, dynamicPreset: preset });
    },
    [setRangeParams],
  );

  const clearDatePickerParams = useCallback(() => {
    setRangeParams({ start: null, end: null, dynamicPreset: null });
  }, [setRangeParams]);

  const dateRange = useMemo((): SimpleDateRange => {
    const range: SimpleDateRange = (() => {
      if (!isNumber(startTimestamp) || !isNumber(endTimestamp)) return { from: 0, to: 0 };
      const { startFn, endFn } = rangeTranslatorByTimePeriod.get(usedTimePeriod) ?? {};
      if (autoAdjustTimestampsByTimePeriod && startFn && endFn) {
        return { from: startFn(startTimestamp).getTime(), to: endFn(endTimestamp).getTime() };
      }
      return { from: startTimestamp, to: setEndOfUTCMinute(endTimestamp).getTime() };
    })();
    // add one millisecond to the end timestamp only because backend uses exclusive operator '<' to match end timestamp
    return { ...range, to: range.to + 1 };
  }, [autoAdjustTimestampsByTimePeriod, endTimestamp, startTimestamp, usedTimePeriod]);

  // exact timestamp from url params, without rounding to cover buckets
  const rawDateRange = useMemo(() => ({ startTimestamp, endTimestamp }), [endTimestamp, startTimestamp]);

  const applyTrailingWindowRange = (size: number, overrideTimePeriod?: TimePeriod) => {
    const presetGranularityToken = getPresetGranularity(overrideTimePeriod ?? usedTimePeriod);
    setRangeParams({
      start: null,
      end: null,
      dynamicPreset: `${presetGranularityToken}${RELATIVE_PRESET_TOKEN}${size}`,
    });
  };

  const totalLoading = usedLoading || !isNumber(startTimestamp) || !isNumber(endTimestamp);

  return {
    dateRange,
    rawDateRange,
    loading: totalLoading,
    setDatePickerRange,
    clearDatePickerParams,
    appliedPreset,
    openDatePicker,
    datePickerSearchString,
    isUsingFallbackRange,
    applyTrailingWindowRange,
  };
};
