import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { TimePeriod } from '~server/graphql/generated/graphql';

type UseLlmTraceDateRangeParamsProps = {
  orgId: string;
  resourceId: string;
};

export const useLlmTraceDateRangeParams = ({ orgId, resourceId }: UseLlmTraceDateRangeParamsProps) => {
  const { batchFrequency, loading } = useResourceBatchFrequency({ orgId, resourceId });
  const timePeriod = batchFrequency ?? TimePeriod.Pt1H;
  const {
    dateRange: { from: startTimestamp, to: endTimestamp },
  } = useSuperGlobalDateRange({
    timePeriod,
    loading,
    autoAdjustTimestampsByTimePeriod: false,
  });

  return {
    isLoading: loading,
    fromTimestamp: startTimestamp ?? 0,
    toTimestamp: endTimestamp ?? 0,
    timePeriod,
  };
};
