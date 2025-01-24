import { rangePickerDate } from 'utils/dateUtils';
import { useContext } from 'react';
import { TimePeriod } from 'generated/graphql';
import { useDateRangeParams } from './useDateRangeParams';
import { DatePickerContext } from '../PickerContext';
import { usePickerDates } from './usePickerDates';
import { createISOStringWithUpdatedHours, WhyLabsPickerCommonProps } from '../utils';

export const renderPartialString = (start: number, timeString: string, displayHours: boolean): string => {
  if (displayHours) {
    return `${rangePickerDate(start)} ${timeString}`;
  }
  return `${rangePickerDate(start)}`;
};
export const renderRangeString = (
  start: number,
  end: number,
  displayHours: boolean,
  startTimeString = '00:00',
  endTimeString = '23:59',
): string => {
  return `${renderPartialString(start, startTimeString, displayHours)} - ${renderPartialString(
    end,
    endTimeString,
    displayHours,
  )}`;
};
type DateRangeStringProps = {
  startTimestamp?: number | null;
  endTimestamp?: number | null;
  startTime?: string;
  endTime?: string;
  displayHours: boolean;
};
export const renderDateRangeString = ({
  startTimestamp,
  endTimestamp,
  startTime,
  endTime,
  displayHours,
}: DateRangeStringProps): string => {
  if (!startTimestamp) return '';
  if (!endTimestamp) {
    return `${renderPartialString(startTimestamp, startTime ?? '00:00', displayHours)} -`;
  }
  return renderRangeString(startTimestamp, endTimestamp, displayHours, startTime, endTime);
};

const convertLocalTimestampToUTC = (timestamp?: number) => {
  if (!timestamp) return undefined;
  return new Date(createISOStringWithUpdatedHours(new Date(timestamp))).getTime();
};

type DateRangeStringType = [rangeString: string];
export const useDateRangeString = (props: WhyLabsPickerCommonProps): DateRangeStringType => {
  const { startTimestamp, endTimestamp } = useDateRangeParams({ ...props });
  const { timePeriod } = props;
  const [{ opened }] = useContext(DatePickerContext);
  const { usedRange, usedStartTime, usedEndTime } = usePickerDates(props);
  const [tempStartTimestamp, tempEndTimestamp] = [usedRange?.[0]?.getTime(), usedRange?.[1]?.getTime()];
  const displayHours = timePeriod === TimePeriod.Pt1H;

  const rangeString = (() => {
    if (opened) {
      return renderDateRangeString({
        startTimestamp: convertLocalTimestampToUTC(tempStartTimestamp),
        endTimestamp: convertLocalTimestampToUTC(tempEndTimestamp),
        startTime: usedStartTime,
        endTime: usedEndTime,
        displayHours,
      });
    }
    return renderDateRangeString({
      startTimestamp,
      endTimestamp,
      startTime: usedStartTime,
      endTime: usedEndTime,
      displayHours,
    });
  })();

  return [rangeString];
};
