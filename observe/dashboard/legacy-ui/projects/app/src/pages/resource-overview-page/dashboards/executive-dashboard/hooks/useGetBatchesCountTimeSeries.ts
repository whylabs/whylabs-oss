import { useGetResourceBatchesCountQuery } from 'generated/graphql';
import { useMemo } from 'react';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import {
  DATASET_INPUT_BATCHES_TIME_SERIES,
  INVALID_QVS,
  MODEL_INPUT_BATCHES_TIME_SERIES,
  QueryValueSet,
  TimeSeriesValue,
} from '../query-handlers/types';
import { makeResourceFilterFunction } from '../helpers/resourceHelpers';

export function useGetBatchesCountTimeSeries(primaryId: string): QueryValueSet {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const isModel = primaryId === MODEL_INPUT_BATCHES_TIME_SERIES;
  const resourceFilterFunction = makeResourceFilterFunction(isModel);
  const { data, loading, error } = useGetResourceBatchesCountQuery({
    variables: {
      ...dateRange,
      skipOutputs: !isModel,
      skipInputs: isModel,
    },
    skip: loadingDateRange,
  });
  const filteredResources = useMemo(
    () => data?.resources.filter((r) => resourceFilterFunction(r.assetCategory)) ?? null,
    [resourceFilterFunction, data?.resources],
  );

  const translatedChartData = useMemo((): TimeSeriesValue[] | undefined => {
    if (!filteredResources) return undefined;
    const timeseries = new Map<number, number>();
    filteredResources?.forEach((resource) => {
      resource.batches.forEach(({ inputCount, outputCount, timestamp }) => {
        const currentTimestampAcc = timeseries.get(timestamp) ?? 0;
        const newValue = currentTimestampAcc + (outputCount ?? 0) + (inputCount ?? 0);
        timeseries.set(timestamp, newValue);
      });
    });
    return Array.from(timeseries)
      .map(([timestamp, value]) => {
        return {
          timestamp,
          value,
        };
      })
      .sort((pair1, pair2) => {
        return pair1.timestamp - pair2.timestamp;
      });
  }, [filteredResources]);

  const totalBatchesCount = useMemo(() => {
    return translatedChartData?.reduce((acc, ts) => {
      return acc + (ts?.value ?? 0);
    }, 0);
  }, [translatedChartData]);

  if (![MODEL_INPUT_BATCHES_TIME_SERIES, DATASET_INPUT_BATCHES_TIME_SERIES].includes(primaryId)) {
    return INVALID_QVS;
  }

  return {
    value: totalBatchesCount ?? null,
    timeSeriesValues: translatedChartData,
    loading,
    error,
  };
}
