import { trpc } from '~/utils/trpc';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { mapStringToTimePeriod } from '~server/util/time-period-utils';

interface BatchFrequencyProps {
  overrideBatchFrequency?: TimePeriod;
  orgId?: string;
  resourceId?: string;
}
export const useResourceBatchFrequency = ({ overrideBatchFrequency, resourceId, orgId }: BatchFrequencyProps) => {
  const enableQuery = !!resourceId && !!orgId && !overrideBatchFrequency;
  const { data, isLoading } = trpc.meta.resources.describe.useQuery(
    {
      id: resourceId ?? '',
      orgId: orgId ?? '',
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
