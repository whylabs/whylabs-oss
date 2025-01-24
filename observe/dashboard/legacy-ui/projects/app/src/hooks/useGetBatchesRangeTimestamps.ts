import { useGetProfileTimestampsQuery } from 'generated/graphql';
import { useMemo } from 'react';
import { SimpleDateRange } from 'utils/dateRangeUtils';

interface HookProps {
  modelId: string;
  timestamps: number[];
  skip?: boolean;
}
interface GetBatchRangeTimestampsType {
  loading: boolean;
  batches: SimpleDateRange[] | null;
}
export const useGetBatchesRangeTimestamps = ({ modelId, timestamps, skip }: HookProps): GetBatchRangeTimestampsType => {
  const { data, loading, error } = useGetProfileTimestampsQuery({
    variables: { modelId, timestamps },
    skip: skip || !timestamps?.length,
  });
  if (error) console.log('Error to fetch model batchDateRanges', error);
  const noData = loading || error || !data;
  const batches = useMemo(
    () =>
      [...(data?.model?.batchDateRanges ?? [])]
        ?.map(({ fromTimestamp: from, toTimestamp: to }) => ({ from, to }))
        .filter(({ from, to }) => from && to) ?? null,
    [data?.model?.batchDateRanges],
  );
  if (noData || !batches?.length) return { loading, batches: null };

  return {
    loading,
    batches,
  };
};
