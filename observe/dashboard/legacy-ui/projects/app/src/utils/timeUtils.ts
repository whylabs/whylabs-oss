import { TimePeriod } from 'generated/graphql';
import {
  ONE_DAY_IN_MILLIS,
  ONE_HOUR_IN_MILLIS,
  ONE_MINUTE_IN_MILLIS,
  ONE_MONTH_IN_MILLIS,
  ONE_WEEK_IN_MILLIS,
} from 'ui/constants';

function getBatchStep(batchFrequency: TimePeriod): number {
  switch (batchFrequency) {
    case TimePeriod.P1D:
      return ONE_DAY_IN_MILLIS;
    case TimePeriod.P1M:
      return ONE_MONTH_IN_MILLIS;
    case TimePeriod.P1W:
      return ONE_WEEK_IN_MILLIS;
    case TimePeriod.Pt1H:
      return ONE_HOUR_IN_MILLIS;
    default:
      return ONE_DAY_IN_MILLIS;
  }
}

function batchFrequencyToPeriodMillis(frequency: TimePeriod): number {
  return getBatchStep(frequency) - 1;
}

function batchFrequencyToUnitText(frequency: TimePeriod | undefined): string {
  switch (frequency) {
    case TimePeriod.P1D:
      return 'day';
    case TimePeriod.P1M:
      return 'month';
    case TimePeriod.P1W:
      return 'week';
    case TimePeriod.Pt1H:
      return 'hour';
    default:
      return '';
  }
}

function getFriendlyTimeDistanceName(timeDistanceInMillis: number, unitsBeforeNextMagnitude = 2): string {
  if (unitsBeforeNextMagnitude <= 0) {
    return '';
  }

  if (timeDistanceInMillis < unitsBeforeNextMagnitude * ONE_MINUTE_IN_MILLIS) {
    const seconds = Math.round(timeDistanceInMillis / 1000);
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
  if (timeDistanceInMillis < unitsBeforeNextMagnitude * ONE_HOUR_IN_MILLIS) {
    const minutes = Math.round(timeDistanceInMillis / ONE_MINUTE_IN_MILLIS);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  if (timeDistanceInMillis < unitsBeforeNextMagnitude * ONE_DAY_IN_MILLIS) {
    const hours = Math.round(timeDistanceInMillis / ONE_HOUR_IN_MILLIS);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (timeDistanceInMillis < unitsBeforeNextMagnitude * ONE_WEEK_IN_MILLIS) {
    const days = Math.round(timeDistanceInMillis / ONE_DAY_IN_MILLIS);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (timeDistanceInMillis < unitsBeforeNextMagnitude * ONE_MONTH_IN_MILLIS) {
    const weeks = Math.round(timeDistanceInMillis / ONE_WEEK_IN_MILLIS);
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  const months = Math.round(timeDistanceInMillis / ONE_MONTH_IN_MILLIS);
  return `${months} month${months === 1 ? '' : 's'}`;
}

export { batchFrequencyToPeriodMillis, batchFrequencyToUnitText, getBatchStep, getFriendlyTimeDistanceName };
