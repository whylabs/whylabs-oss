import { useContext, useMemo } from 'react';
import { DatesRangeValue } from '@mantine/dates';
import { TimePeriod } from 'generated/graphql';
import { useDateRangeParams } from './useDateRangeParams';
import {
  getUTCHoursString,
  PickerDatesReturnType,
  timeObjectToString,
  translateGMTTimestampToLocalDate,
  WhyLabsPickerCommonProps,
} from '../utils';
import { DatePickerContext } from '../PickerContext';

export const usePickerDates = (props: WhyLabsPickerCommonProps): PickerDatesReturnType => {
  const { timePeriod } = props;
  const allowHoursSelection = timePeriod === TimePeriod.Pt1H;
  const { startTimestamp, endTimestamp } = useDateRangeParams({ ...props });
  const [{ startDate, startHours, endDate, endHours }] = useContext(DatePickerContext);
  const usedRange = useMemo(() => {
    const hasNoRange = !startDate && !endDate;
    const hackedStartDefaultDate = translateGMTTimestampToLocalDate(startTimestamp ?? null);
    const hackedEndDefaultDate = translateGMTTimestampToLocalDate(endTimestamp ?? null);
    const hasDefaultRange = !!(hackedStartDefaultDate && hackedEndDefaultDate);
    const fallbackRange = hasDefaultRange ? [hackedStartDefaultDate, hackedEndDefaultDate] : undefined;
    return (hasNoRange ? fallbackRange : [startDate ?? null, endDate ?? null]) as DatesRangeValue;
  }, [endDate, endTimestamp, startDate, startTimestamp]);

  const usedStartTime = (() => {
    if (!allowHoursSelection) return '00:00:00.000';
    if (startHours) return timeObjectToString(startHours);
    if (startTimestamp) return getUTCHoursString(startTimestamp);
    return undefined;
  })();

  const usedEndTime = (() => {
    if (!allowHoursSelection) return '23:59:59.999';
    if (endHours) return timeObjectToString(endHours);
    if (endTimestamp) return getUTCHoursString(endTimestamp);
    return undefined;
  })();

  return {
    usedRange,
    usedStartTime,
    usedEndTime,
  };
};
