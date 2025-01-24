import { CUSTOM_RANGE, CustomRangeSearchParams, LINEAGE_RANGE } from '~/components/super-date-picker/utils';
import { RELATIVE_PRESET_TOKEN, mapPresetGranularityToTimePeriod } from '~/hooks/useDynamicTrailingRangePresets';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { CustomDashboardSchema, DashboardDateRangeType } from '~server/trpc/dashboard/types/dashboards';
import { isNumber } from 'lodash';
import { useCallback } from 'react';

export const useDashboardMutationRangePreset = (
  pickerSearchParams?: CustomRangeSearchParams,
  timePeriod?: TimePeriod,
) => {
  const usedTimePeriod = timePeriod ?? TimePeriod.Pt1H;
  const {
    dateRange: { from: startTimestamp, to: endTimestamp },
    appliedPreset,
    rawDateRange,
    applyTrailingWindowRange,
    setDatePickerRange,
  } = useSuperGlobalDateRange({
    // Default to hourly date range on custom dashboards
    timePeriod: usedTimePeriod,
    // The timestamps will be used to store the date picker state, so we don't want to adjust it.
    autoAdjustTimestampsByTimePeriod: false,
    ...(pickerSearchParams ?? {}),
  });

  const getRangeConfig = useCallback(
    (): CustomDashboardSchema['dateRange'] =>
      getDashboardRangeConfig({
        startTimestamp,
        endTimestamp,
        preset: appliedPreset,
        fallbackTimePeriod: usedTimePeriod,
      }),

    [appliedPreset, endTimestamp, startTimestamp, usedTimePeriod],
  );

  return {
    appliedPreset,
    applyTrailingWindowRange,
    getRangeConfig,
    setDatePickerRange,
    startTimestamp,
    endTimestamp,
    rawDateRange,
  };
};

export const getDashboardRangeConfig = ({
  preset = CUSTOM_RANGE,
  startTimestamp,
  endTimestamp,
  fallbackTimePeriod,
}: {
  preset?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  fallbackTimePeriod: TimePeriod;
}): CustomDashboardSchema['dateRange'] => {
  if ([CUSTOM_RANGE, LINEAGE_RANGE].includes(preset) && isNumber(startTimestamp) && isNumber(endTimestamp)) {
    return {
      type: DashboardDateRangeType.fixed,
      startDate: new Date(startTimestamp).toISOString(),
      endDate: new Date(endTimestamp).toISOString(),
    };
  }
  const relativeTokenIndex = preset?.indexOf(RELATIVE_PRESET_TOKEN);
  if (preset && isNumber(relativeTokenIndex) && relativeTokenIndex !== -1) {
    const presetTimePeriod = mapPresetGranularityToTimePeriod.get(preset.substring(0, relativeTokenIndex));
    const size = Number(preset.substring(relativeTokenIndex + RELATIVE_PRESET_TOKEN.length));
    return {
      type: DashboardDateRangeType.relative,
      timePeriod: presetTimePeriod ?? fallbackTimePeriod,
      size,
    };
  }
  return undefined;
};
