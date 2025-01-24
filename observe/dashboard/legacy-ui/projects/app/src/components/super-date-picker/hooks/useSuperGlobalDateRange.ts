import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { ensureDateRangeIsAtLeastOneDay } from 'utils/queryUtils';
import { useCallback, useEffect, useMemo } from 'react';
import { GLOBAL_PICKER_ID } from 'constants/hardcoded';
import { useSearchParams } from 'react-router-dom';
import { NEW_GLOBAL_END_RANGE, NEW_GLOBAL_RANGE_PRESET, NEW_GLOBAL_START_RANGE } from 'types/navTags';
import { isNumber } from 'utils/typeGuards';
import { TimePeriod } from 'generated/graphql';
import { getFunctionsForTimePeriod, setEndOfUTCMinute } from 'utils/batchProfileUtils';
import { getPresetGranularity, RELATIVE_PRESET_TOKEN } from 'hooks/useDynamicTrailingRangePresets';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useDateRangeParams } from './useDateRangeParams';
import { CustomRangeSearchParams, dateConstructorToReadableISOString, handleEndTimestampRounding } from '../utils';
import { getUsableRangeAndTooltip } from '../../profiles-range-link/rangeLimitHelper';

const DATE_TRUNCATION_KEY = 'dateRangeTruncate';

export type SuperGlobalDateRange = {
  dateRange: SimpleDateRange;
  loading: boolean;
  setDatePickerRange: (d: SimpleDateRange, preset?: string) => void;
  appliedPreset: string;
  dateRangeWithOneDayMinimumInterval: SimpleDateRange;
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
  startDateSearchParamKey = NEW_GLOBAL_START_RANGE,
  endDateSearchParamKey = NEW_GLOBAL_END_RANGE,
  dynamicPresetSearchParamKey = NEW_GLOBAL_RANGE_PRESET,
  timePeriod,
  loading,
  autoAdjustTimestampsByTimePeriod = true,
}: SuperGlobalHookProps = {}): SuperGlobalDateRange => {
  const {
    resourceState: { resource },
    loading: resourceLoading,
  } = useResourceContext();
  const usedLoading = timePeriod || loading ? loading : resourceLoading;
  const usedTimePeriod = timePeriod ?? resource?.batchFrequency ?? TimePeriod.P1D;
  const { startTimestamp, endTimestamp, setRangeParams, appliedPreset, isUsingFallbackRange } = useDateRangeParams({
    loading: usedLoading,
    timePeriod: usedTimePeriod,
    startDateSearchParamKey,
    endDateSearchParamKey,
    dynamicPresetSearchParamKey,
  });
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useWhyLabsSnackbar();

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
  }, [appliedPreset, endDateSearchParamKey, dynamicPresetSearchParamKey, searchParams, startDateSearchParamKey]);

  const setDatePickerRange = useCallback(
    (newRange: SimpleDateRange, preset?: string) => {
      const { from, to } = newRange;
      const startString = dateConstructorToReadableISOString(from);
      const endString = dateConstructorToReadableISOString(to);
      setRangeParams({ start: startString, end: endString, dynamicPreset: preset });
    },
    [setRangeParams],
  );

  const dateRange = useMemo((): SimpleDateRange => {
    const range: SimpleDateRange = (() => {
      if (!isNumber(startTimestamp) || !isNumber(endTimestamp)) return { from: 0, to: 0 };
      const { setStartOfProfile, setEndOfProfile } = getFunctionsForTimePeriod.get(usedTimePeriod) ?? {};
      if (autoAdjustTimestampsByTimePeriod && setStartOfProfile && setEndOfProfile) {
        const { range: truncated } = getUsableRangeAndTooltip(
          usedTimePeriod,
          [startTimestamp, endTimestamp],
          null,
          true,
        );
        return {
          from: setStartOfProfile(truncated?.[0] ?? startTimestamp).getTime(),
          to: setEndOfProfile(truncated?.[1] ?? endTimestamp).getTime(),
        };
      }
      return { from: startTimestamp, to: setEndOfUTCMinute(endTimestamp).getTime() };
    })();
    // add one millisecond to the end timestamp only because backend uses exclusive operator '<' to match end timestamp
    return { ...range, to: handleEndTimestampRounding(range.to) };
  }, [autoAdjustTimestampsByTimePeriod, endTimestamp, startTimestamp, usedTimePeriod]);

  useEffect(() => {
    if (!isNumber(startTimestamp) || !isNumber(endTimestamp)) return;
    const { truncatedRange } = getUsableRangeAndTooltip(usedTimePeriod, [startTimestamp, endTimestamp], null, true);
    if (truncatedRange) {
      const sessionTruncatedId = sessionStorage.getItem(DATE_TRUNCATION_KEY);
      const truncationId = `${resource?.id ?? ''}--${usedTimePeriod}`;
      if (sessionTruncatedId !== truncationId) {
        sessionStorage.setItem(DATE_TRUNCATION_KEY, truncationId);
        enqueueSnackbar({
          title: `The selected date range exceeds the limits for the current page. We have updated the date range to the last ${truncatedRange[0]} ${truncatedRange[1]} within the previous selection.`,
          variant: 'warning',
        });
      }
    } else {
      sessionStorage.removeItem(DATE_TRUNCATION_KEY);
    }
  }, [endTimestamp, enqueueSnackbar, resource?.id, startTimestamp, usedTimePeriod]);

  const dateRangeWithOneDayMinimumInterval = useMemo((): SimpleDateRange => {
    return ensureDateRangeIsAtLeastOneDay(dateRange);
  }, [dateRange]);

  const applyTrailingWindowRange = (size: number, overrideTimePeriod?: TimePeriod) => {
    const presetGranularityToken = getPresetGranularity(overrideTimePeriod ?? usedTimePeriod);
    setRangeParams({
      dynamicPreset: `${presetGranularityToken}${RELATIVE_PRESET_TOKEN}${size}`,
    });
  };

  const totalLoading = usedLoading || !isNumber(startTimestamp) || !isNumber(endTimestamp);

  return {
    dateRange,
    loading: totalLoading,
    setDatePickerRange,
    appliedPreset,
    dateRangeWithOneDayMinimumInterval,
    openDatePicker,
    datePickerSearchString,
    isUsingFallbackRange,
    applyTrailingWindowRange,
  };
};
