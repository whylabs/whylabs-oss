import { JSONObject } from 'types/genericTypes';
import { ResourceState } from 'pages/model-page/context/ResourceContext';
import { ONE_DAY_IN_MILLIS, ONE_HOUR_IN_MILLIS, ONE_MONTH_IN_MILLIS, ONE_WEEK_IN_MILLIS } from 'ui/constants';
import { FixedCadenceSchedule } from 'generated/monitor-schema';
import { getDatasetTimestampOffset } from 'hooks/useCustomMonitor/monitorUtils';
import { TimePeriod } from 'generated/graphql';
import { JsonPresets, NO_PRESET_ID, ProgrammaticChange, REPLACE_REQUIRED_TOKEN } from './types';
import { customJsonAnalyzerPresetsMapper } from './index';
import { emptyAnalyzerPreset } from './base-configs/freeCreationFlowPreset';
import { batchFrequencyToCadence } from '../../../utils/batchFrequencyToCadence';
import { defaultTrailingWindowBaselineSize } from '../../../constants/presetUtils';

export const handleBaseConfig = (
  monitor: JSONObject,
  analyzer: JSONObject,
  presetDisplayName?: string,
  isEdit = false,
): JSONObject => {
  const displayName = presetDisplayName
    ? `${presetDisplayName}`.concat(!isEdit ? `-${`${Date.now()}`.substring(8)}` : '')
    : REPLACE_REQUIRED_TOKEN;
  return { monitors: [{ ...monitor, displayName }], analyzers: [analyzer] };
};

export const handleQuotes = (key: string): string => `\u0022${key}\u0022`;

export const getPresetName = (presetId: JsonPresets = NO_PRESET_ID): string => {
  const preset = customJsonAnalyzerPresetsMapper.get(presetId as JsonPresets);
  if (!preset || presetId === NO_PRESET_ID) {
    return emptyAnalyzerPreset.presetName;
  }
  return `Configuring the preset "${preset.presetName}"`;
};

export const handleProgrammaticReplace = (token: ProgrammaticChange, resource: ResourceState['resource']): string => {
  const { batchFrequency } = resource ?? {};
  const granularity = batchFrequencyToCadence(batchFrequency);
  switch (token) {
    case '$auto_fill_cadence':
      return handleQuotes(granularity);
    case '$auto_fill_dataset_timestamp_offset':
      return handleQuotes(getDatasetTimestampOffset(granularity));
    case '$auto_fill_seconds_batch_worth':
      return handleFillSecondsBatchWorth(granularity).toString();
    case '$auto_fill_trailing_window_size':
      return handleTrailingWindowSize(batchFrequency).toString();
  }
  return handleQuotes(REPLACE_REQUIRED_TOKEN);
};

const handleTrailingWindowSize = (bf?: TimePeriod) => {
  return (bf && defaultTrailingWindowBaselineSize.get(bf)?.size) ?? 7;
};

const handleFillSecondsBatchWorth = (granularity?: FixedCadenceSchedule['cadence']) => {
  switch (granularity) {
    case 'hourly':
      return ONE_HOUR_IN_MILLIS / 1000;
    case 'weekly':
      return ONE_WEEK_IN_MILLIS / 1000;
    case 'monthly':
      return ONE_MONTH_IN_MILLIS / 1000;
  }
  return ONE_DAY_IN_MILLIS / 1000; // daily default
};
