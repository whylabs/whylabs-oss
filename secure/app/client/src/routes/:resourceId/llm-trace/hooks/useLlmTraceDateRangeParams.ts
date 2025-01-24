import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { TimePeriod } from '~server/types/api';

type UseLlmTraceDateRangeParamsProps = {
  resourceId: string;
};

export const useLlmTraceDateRangeParams = ({ resourceId }: UseLlmTraceDateRangeParamsProps) => {
  const { batchFrequency, loading } = useResourceBatchFrequency({ resourceId });
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
