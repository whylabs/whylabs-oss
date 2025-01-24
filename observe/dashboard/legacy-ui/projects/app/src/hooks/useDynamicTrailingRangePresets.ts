import { useCallback, useMemo } from 'react';
import {
  calculateDailyTrailingWindow,
  calculateHourlyTrailingWindow,
  calculateMonthlyTrailingWindow,
  calculateWeeklyTrailingWindow,
} from 'utils/batchProfileUtils';
import { TimePeriod } from 'generated/graphql';

export const mapTrailingWindowHandler = new Map<TimePeriod, (size: number) => [Date, Date]>([
  [TimePeriod.Pt1H, calculateHourlyTrailingWindow],
  [TimePeriod.P1D, calculateDailyTrailingWindow],
  [TimePeriod.P1W, calculateWeeklyTrailingWindow],
  [TimePeriod.P1M, calculateMonthlyTrailingWindow],
]);

const defaultWindowSize = new Map<TimePeriod, number>([
  [TimePeriod.Pt1H, 24],
  [TimePeriod.P1D, 7],
  [TimePeriod.P1W, 4],
  [TimePeriod.P1M, 6],
]);

export const getDefaultPresetWindowSize = (batchFrequency: TimePeriod): number => {
  return defaultWindowSize.get(batchFrequency) ?? 7;
};

export type RangePreset = {
  value: string;
  description: string;
  bottomText?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  loading?: boolean;
  type: 'trailingWindow' | 'customRange' | 'extraPreset';
  rangeCalculator: () => [Date, Date] | null;
};

enum PresetGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}
export const PRESET_SEPARATOR = '-';

export const mapPresetGranularityToTimePeriod = new Map<PresetGranularity | string, TimePeriod>([
  [PresetGranularity.HOURLY, TimePeriod.Pt1H],
  [PresetGranularity.DAILY, TimePeriod.P1D],
  [PresetGranularity.WEEKLY, TimePeriod.P1W],
  [PresetGranularity.MONTHLY, TimePeriod.P1M],
]);

const mapTimePeriodToPresetGranularity = new Map<TimePeriod, PresetGranularity>([
  [TimePeriod.Pt1H, PresetGranularity.HOURLY],
  [TimePeriod.P1D, PresetGranularity.DAILY],
  [TimePeriod.P1W, PresetGranularity.WEEKLY],
  [TimePeriod.P1M, PresetGranularity.MONTHLY],
]);

export const getPresetGranularity = (batchFrequency: TimePeriod): PresetGranularity => {
  return mapTimePeriodToPresetGranularity.get(batchFrequency) ?? PresetGranularity.DAILY;
};

export const RELATIVE_PRESET_TOKEN = `${PRESET_SEPARATOR}relative${PRESET_SEPARATOR}`;

export const presetsByBatchFrequency = new Map<TimePeriod, RangePreset[]>([
  [
    TimePeriod.Pt1H,
    [4, 6, 12, 24, 48, 72].map((value) => ({
      value: `${PresetGranularity.HOURLY}${RELATIVE_PRESET_TOKEN}${value}`,
      description: `Last ${value} hours`,
      type: 'trailingWindow',
      rangeCalculator: () => calculateHourlyTrailingWindow(value),
    })),
  ],
  [
    TimePeriod.P1D,
    [7, 14, 30, 60, 90].map((value) => ({
      value: `${PresetGranularity.DAILY}${RELATIVE_PRESET_TOKEN}${value}`,
      description: `Last ${value} days`,
      type: 'trailingWindow',
      rangeCalculator: () => calculateDailyTrailingWindow(value),
    })),
  ],
  [
    TimePeriod.P1W,
    [4, 8, 12, 24].map((value) => ({
      value: `${PresetGranularity.WEEKLY}${RELATIVE_PRESET_TOKEN}${value}`,
      description: `Last ${value} weeks`,
      type: 'trailingWindow',
      rangeCalculator: () => calculateWeeklyTrailingWindow(value),
    })),
  ],
  [
    TimePeriod.P1M,
    [4, 6, 7, 9, 12].map((value) => ({
      value: `${PresetGranularity.MONTHLY}${RELATIVE_PRESET_TOKEN}${value}`,
      description: `Last ${value} months`,
      type: 'trailingWindow',
      rangeCalculator: () => calculateMonthlyTrailingWindow(value),
    })),
  ],
]);

type DynamicRangePresetsReturnType = {
  getTrailingWindow: (windowSize?: number) => [Date, Date];
  presetOptions: RangePreset[];
};
export const useDynamicTrailingRangePresets = (batchFrequency: TimePeriod): DynamicRangePresetsReturnType => {
  const trailingWindowFn = useMemo(() => mapTrailingWindowHandler.get(batchFrequency), [batchFrequency]);

  const getTrailingWindow = useCallback(
    (windowSize?: number): [Date, Date] => {
      const usedWindowSize = windowSize || getDefaultPresetWindowSize(batchFrequency);
      if (!trailingWindowFn) {
        console.log(
          `Not found a trailing window calculator function to ${batchFrequency} batch frequency, fallback to daily handler`,
        );
        return calculateDailyTrailingWindow(usedWindowSize);
      }
      return trailingWindowFn(usedWindowSize);
    },
    [batchFrequency, trailingWindowFn],
  );

  const presetOptions = presetsByBatchFrequency.get(batchFrequency) ?? [];

  return {
    getTrailingWindow,
    presetOptions,
  };
};
