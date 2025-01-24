import { TimePeriod } from '../../../../types/api';
import { getInterval, getIntervalWithDuration } from '../data-service-utils';

export const getIntervalFromResource = async ({
  batchFrequency = TimePeriod.Pt1H,
  fromTimestamp,
  toTimestamp,
}: {
  batchFrequency?: TimePeriod;
  resourceId: string;
  fromTimestamp: number;
  toTimestamp?: number | null;
}): Promise<string> => {
  return toTimestamp ? getInterval(fromTimestamp, toTimestamp) : getIntervalWithDuration(fromTimestamp, batchFrequency);
};
