import { DatesRangeValue } from '@mantine/dates';
import { useContext } from 'react';
import { TimePeriod } from '~server/types/api';

import { DatePickerContext } from '../PickerContext';
import {
  WhyLabsPickerCommonProps,
  getUTCHoursString,
  timeObjectToString,
  translateGMTTimestampToLocalDate,
} from '../utils';
import { useDateRangeParams } from './useDateRangeParams';

type PickerDatesReturnType = {
  usedRange?: DatesRangeValue;
  usedStartTime?: string;
  usedEndTime?: string;
};

export const usePickerDates = (props: WhyLabsPickerCommonProps): PickerDatesReturnType => {
  const { timePeriod } = props;
  const allowHoursSelection = timePeriod === TimePeriod.Pt1H;
  const { startTimestamp, endTimestamp } = useDateRangeParams(props);
  const hackedStartDefaultDate = translateGMTTimestampToLocalDate(startTimestamp ?? null);
  const hackedEndDefaultDate = translateGMTTimestampToLocalDate(endTimestamp ?? null);
  const [{ startDate, startHours, endDate, endHours }] = useContext(DatePickerContext);
  const hasNoRange = !startDate && !endDate;
  const hasDefaultRange = !!(hackedStartDefaultDate && hackedEndDefaultDate);
  const fallbackRange = hasDefaultRange ? [hackedStartDefaultDate, hackedEndDefaultDate] : undefined;
  const usedRange = (hasNoRange ? fallbackRange : [startDate ?? null, endDate ?? null]) as DatesRangeValue;

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
