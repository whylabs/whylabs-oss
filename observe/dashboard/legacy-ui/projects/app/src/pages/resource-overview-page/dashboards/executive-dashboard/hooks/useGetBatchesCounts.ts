import { useGetResourceBatchesCountQuery } from 'generated/graphql';
import { useMemo } from 'react';
import { generateYesterdayTimestamps } from 'utils/dateUtils';
import { INVALID_QVS, QueryValueSet, DATASET_TOTAL_RECORDS_YESTERDAY } from '../query-handlers/types';
import { makeResourceFilterFunction } from '../helpers/resourceHelpers';

export function useGetBatchesCounts(primaryId: string): QueryValueSet {
  const isDataset = primaryId === DATASET_TOTAL_RECORDS_YESTERDAY;
  const resourceFilterFunction = makeResourceFilterFunction(!isDataset);
  const { data, loading, error } = useGetResourceBatchesCountQuery({
    variables: {
      ...generateYesterdayTimestamps(),
      skipOutputs: isDataset,
      skipTimestamps: true,
    },
  });

  const value = useMemo(() => {
    return (
      data?.resources.reduce((total, model) => {
        if (!resourceFilterFunction(model.assetCategory)) return total;
        return (
          total +
          model.batches.reduce((acc, batch) => {
            return acc + batch.inputCount;
          }, 0)
        );
      }, 0) ?? 0
    );
  }, [resourceFilterFunction, data?.resources]);

  if (primaryId !== DATASET_TOTAL_RECORDS_YESTERDAY) {
    return INVALID_QVS;
  }

  return {
    loading,
    error,
    value,
  };
}
