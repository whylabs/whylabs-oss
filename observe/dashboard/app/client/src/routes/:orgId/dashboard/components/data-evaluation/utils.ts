import { CUSTOM_RANGE } from '~/components/super-date-picker/utils';
import {
  RELATIVE_PRESET_TOKEN,
  convertRelativePresetToRange,
  getPresetGranularity,
} from '~/hooks/useDynamicTrailingRangePresets';
import { getDashboardRangeConfig } from '~/routes/:orgId/dashboard/:dashboardId/layout/hooks/useDashboardMutationRangePreset';
import { DataEvaluationBuilderObject } from '~/routes/:orgId/dashboard/components/custom-dashboard/types';
import { calculateDailyTrailingWindow } from '~/utils/dateRangeUtils';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { CUSTOM_METRIC_VALUE_SEPARATOR } from '~server/graphql/resolvers/types/metrics';
import { CustomDashboardDateRange } from '~server/trpc/dashboard/types/dashboards';
import {
  DATASET_METRIC_COLUMN_VALUE,
  DataEvaluationParameters,
  EvaluationAggregationType,
  EvaluationColumnDefinitionType,
  ReferenceProfileColumnDefinition,
  SegmentColumnDefinition,
} from '~server/trpc/dashboard/types/data-evalutation-types';
import { ONE_DAY_IN_MILLIS } from '~server/util/time-period-utils';

export type SuperDatePickerState = { start?: Date; end?: Date; preset?: string };

export const translateWidgetRangeToState = (range?: CustomDashboardDateRange): SuperDatePickerState | undefined => {
  if (!range) return undefined;
  if (range.type === 'fixedRange') {
    return { preset: CUSTOM_RANGE, start: new Date(range.startDate), end: new Date(range.endDate) };
  }
  const { timePeriod, size } = range;
  const presetGranularityToken = getPresetGranularity(timePeriod);
  return { preset: `${presetGranularityToken}${RELATIVE_PRESET_TOKEN}${size}` };
};

export const TABLE_COLUMN_GROUP_BY_LIMIT = 5;

export const METRIC_SELECTION_LIMIT = 10;

export type TempWidgetParams = Partial<Omit<DataEvaluationBuilderObject['params'], 'dateRange'>>;

export const getSegmentColumnDefinition = <T extends TempWidgetParams>(
  params: T | undefined,
): SegmentColumnDefinition | undefined => {
  return params?.tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment
    ? params?.tableColumnsDefinition
    : undefined;
};

export const getRefProfileColumnDefinition = <T extends TempWidgetParams>(
  params: T | undefined,
): ReferenceProfileColumnDefinition | undefined => {
  return params?.tableColumnsDefinition?.type === EvaluationColumnDefinitionType.ReferenceProfile
    ? params?.tableColumnsDefinition
    : undefined;
};

export const SIDE_CONTROLS_MAX_WIDTH = 360;
export const SIDE_CONTROLS_WIDTH = 300;

export const getSideControlsWidth = (timePeriod: TimePeriod) => {
  if (timePeriod === TimePeriod.Pt1H) return SIDE_CONTROLS_MAX_WIDTH;
  return SIDE_CONTROLS_WIDTH;
};

export const MIN_VALUE_BG_COLOR = '#8ECEFE';
export const MAX_VALUE_BG_COLOR = '#FFBB94';

export type HighlightValuesType = 'min' | 'max';

export const metricObjectToSelectFormat = ({
  metric,
  column,
}: DataEvaluationParameters['dataSource']['metrics'][number]): string => {
  if (column && column !== DATASET_METRIC_COLUMN_VALUE) return `${metric}${CUSTOM_METRIC_VALUE_SEPARATOR}${column}`;
  return metric;
};

export const HOURLY_BATCHES_LIMIT = 7;
export const DAILY_BATCHES_LIMIT = 180;

export const translateRangeToWidgetFormat = (
  params: SuperDatePickerState,
  fallbackTimePeriod: TimePeriod,
): CustomDashboardDateRange | undefined => {
  const pickerConfig = {
    startTimestamp: params.start?.getTime(),
    endTimestamp: params.end?.getTime(),
    preset: params.preset,
    fallbackTimePeriod,
  };
  return getDashboardRangeConfig(pickerConfig);
};

export const getTrailingWindowRange = (size: number = HOURLY_BATCHES_LIMIT, endDate = new Date()) => {
  const [start, end] = calculateDailyTrailingWindow(size, endDate);
  return {
    start,
    end,
    preset: CUSTOM_RANGE,
  };
};

export const handleEvaluationRangeTruncation = (
  range: SuperDatePickerState,
  batchFrequency: TimePeriod,
): SuperDatePickerState => {
  const [usedStart, usedEnd] = (() => {
    const { start, end, preset } = range;
    if (start && end) return [start, end];
    if (preset) return convertRelativePresetToRange(preset) ?? [undefined, undefined];
    return [undefined, undefined];
  })();
  if (!usedStart || !usedEnd) return getTrailingWindowRange();
  const diffInMillis = usedEnd.getTime() - usedStart.getTime();
  if (batchFrequency === TimePeriod.Pt1H && diffInMillis / ONE_DAY_IN_MILLIS > HOURLY_BATCHES_LIMIT) {
    return getTrailingWindowRange(HOURLY_BATCHES_LIMIT, usedEnd);
  }
  if (diffInMillis / ONE_DAY_IN_MILLIS > DAILY_BATCHES_LIMIT) {
    return getTrailingWindowRange(DAILY_BATCHES_LIMIT, usedEnd);
  }
  return range;
};

export const handleEvaluationQueryParams = <T extends DataEvaluationParameters | null | undefined>(
  params: T,
  batchFrequency: TimePeriod,
): T => {
  if (!params || params.type === EvaluationAggregationType.ReferenceProfile) return params;
  const pickerDateRange = translateWidgetRangeToState(params.dateRange) ?? getTrailingWindowRange();
  const truncatedRange = handleEvaluationRangeTruncation(pickerDateRange, batchFrequency);
  return { ...params, dateRange: translateRangeToWidgetFormat(truncatedRange, batchFrequency) };
};
