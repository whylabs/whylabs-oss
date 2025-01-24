import { TimePeriod } from 'generated/graphql';
import { FixedCadenceSchedule } from 'generated/monitor-schema';

export function batchFrequencyToCadence(bf?: TimePeriod): FixedCadenceSchedule['cadence'] {
  if (!bf) {
    return 'daily';
  }
  switch (bf) {
    case TimePeriod.P1D:
      return 'daily';
    case TimePeriod.Pt1H:
      return 'hourly';
    case TimePeriod.P1W:
      return 'weekly';
    case TimePeriod.P1M:
      return 'monthly';
    default:
      return 'daily';
  }
}
