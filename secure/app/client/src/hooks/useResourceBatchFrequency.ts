import { trpc } from '~/utils/trpc';
import { TimePeriod } from '~server/types/api';
import { mapStringToTimePeriod } from '~server/util/time-period-utils';

interface BatchFrequencyProps {
  overrideBatchFrequency?: TimePeriod;
  resourceId?: string;
}
export const useResourceBatchFrequency = ({ overrideBatchFrequency, resourceId }: BatchFrequencyProps) => {
  const enableQuery = !!resourceId && !overrideBatchFrequency;
  const { data, isLoading } = trpc.meta.resources.describe.useQuery(
    {
      id: resourceId ?? '',
    },
    { enabled: enableQuery },
  );
  const loading = enableQuery && isLoading && !data;
  const resourceBatchFrequency = mapStringToTimePeriod.get(data?.timePeriod ?? '');
  const usedBatchFrequency = overrideBatchFrequency || resourceBatchFrequency;

  return {
    loading,
    batchFrequency: usedBatchFrequency,
  };
};
