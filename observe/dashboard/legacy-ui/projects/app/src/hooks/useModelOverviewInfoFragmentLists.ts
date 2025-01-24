import { CustomTag, ModelOverviewInfoFragment, ModelType } from 'generated/graphql';

import { convertAbbreviationToBatchType } from 'adapters/date/timeperiod';
import { AlertTimeseries, AlertTimeseriesEmpty } from 'components/controls/table/cells/AnomalyTypes';
import { useMemo } from 'react';

type HookReturnType = {
  modelBatchFrequencies: ReturnType<typeof convertAbbreviationToBatchType>[];
  modelIds: string[];
  modelLatestAnomalyTimestamps: number[];
  modelNames: string[];
  modelTimeseries: AlertTimeseries[];
  modelTotalFeatures: string[];
  modelTotalOutputs: string[];
  modelTotalSegments: string[];
  modelTypes: ModelType[];
  modelTags: [CustomTag[]];
};

export function useModelOverviewInfoFragmentLists(infoFragmentData: ModelOverviewInfoFragment[]): HookReturnType {
  const lists = useMemo(() => {
    const modelBatchFrequencies: HookReturnType['modelBatchFrequencies'] = [];
    const modelIds: HookReturnType['modelIds'] = [];
    const modelLatestAnomalyTimestamps: HookReturnType['modelLatestAnomalyTimestamps'] = [];
    const modelNames: HookReturnType['modelNames'] = [];
    const modelTimeseries: HookReturnType['modelTimeseries'] = [];
    const modelTotalFeatures: HookReturnType['modelTotalFeatures'] = [];
    const modelTotalOutputs: HookReturnType['modelTotalOutputs'] = [];
    const modelTotalSegments: HookReturnType['modelTotalSegments'] = [];
    const modelTypes: HookReturnType['modelTypes'] = [];
    const modelTags: HookReturnType['modelTags'] = [[]];

    infoFragmentData.forEach((model) => {
      modelBatchFrequencies.push(convertAbbreviationToBatchType(model.batchFrequency));
      modelIds.push(model.id);
      modelLatestAnomalyTimestamps.push(model.latestAnomalyTimestamp ?? 0);
      modelNames.push(model.name);
      modelTimeseries.push(model.anomalyCounts?.timeseries || AlertTimeseriesEmpty);
      modelTotalFeatures.push((model.entitySchema?.inputCounts.total || 0).toString());
      modelTotalOutputs.push((model.entitySchema?.outputCounts.total || 0).toString());
      modelTotalSegments.push(model.totalSegments.toString());
      modelTypes.push(model.modelType);
      modelTags.push(model.resourceTags);
    });

    return {
      modelBatchFrequencies,
      modelIds,
      modelLatestAnomalyTimestamps,
      modelNames,
      modelTimeseries,
      modelTotalFeatures,
      modelTotalOutputs,
      modelTotalSegments,
      modelTypes,
      modelTags,
    };
  }, [infoFragmentData]);

  return lists;
}
