import { DatePicker, DatesRangeValue } from '@mantine/dates';
import React, { useContext, useEffect } from 'react';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { getFullDateFromISO } from 'utils/dateUtils';
import { DatePickerContext } from '../PickerContext';
import { usePickerDates } from '../hooks/usePickerDates';
import { WhyLabsPickerCommonProps, translateGMTTimestampToLocalDate, SuperPickerContext } from '../utils';

const useStyles = createStyles(() => ({
  day: {
    '&[data-in-range]': {
      backgroundColor: Colors.brandSecondary100,
      '&:hover': {
        backgroundColor: Colors.brandSecondary200,
      },
    },
    '&[data-selected]': {
      backgroundColor: Colors.brandPrimary700,
      '&:hover': {
        backgroundColor: Colors.brandPrimary800,
      },
    },
  },
  calendar: {
    padding: '0px 12px 6px 12px',
    '*': {
      fontFamily: 'Asap',
    },
  },
  monthLevelGroup: {
    justifyContent: 'space-between',
  },
  monthLevel: {
    '&[data-month-level]:not(:last-of-type)': {
      marginRight: 'unset',
    },
  },
  calendarHeaderLevel: {
    color: Colors.brandSecondary900,
    fontWeight: 600,
  },
  calendarHeaderControl: {
    color: Colors.brandSecondary900,
  },
  pickerControl: {
    color: Colors.brandSecondary900,
  },
}));
type CalendarRangePickerProps = {
  maxUtcDate?: Date;
  minUtcDate?: Date;
} & WhyLabsPickerCommonProps;
export const CalendarRangePicker = ({ maxUtcDate, minUtcDate, ...props }: CalendarRangePickerProps): JSX.Element => {
  const [{ tempSelectedStartDate }, rangeDispatch] = useContext(DatePickerContext);
  const { usedRange } = usePickerDates(props);
  const { classes } = useStyles();

  const usedMaxDate = (() => {
    return translateGMTTimestampToLocalDate(maxUtcDate?.getTime() ?? null) ?? undefined;
  })();

  const usedMinDate = (() => {
    return translateGMTTimestampToLocalDate(minUtcDate?.getTime() ?? null) ?? undefined;
  })();

  const isNotMaxMonth = (date: Date | null) => {
    if (!date || !usedMaxDate) return true;
    const selectedMonth = date.getMonth();
    const selectedYear = date.getFullYear();
    const maxMonth = usedMaxDate.getMonth();
    const maxYear = usedMaxDate.getFullYear();
    return selectedMonth !== maxMonth || selectedYear !== maxYear;
  };

  const pickerOnChange = (range: DatesRangeValue) => {
    const [start, end] = range;
    const updatedAction: Partial<SuperPickerContext> = { startDate: start, endDate: end };
    if (isNotMaxMonth(start)) {
      updatedAction.tempSelectedStartDate = start;
    }
    rangeDispatch(updatedAction);
  };

  useEffect(() => {
    if (!tempSelectedStartDate && usedRange?.[0]) {
      rangeDispatch({ tempSelectedStartDate: usedRange?.[0] });
    }
  }, [rangeDispatch, tempSelectedStartDate, usedRange]);

  const handleDateControlChange = (date: Date) => {
    // this is the prop that makes the calendar update the displayed month
    rangeDispatch({ tempSelectedStartDate: date });
  };

  return (
    <DatePicker
      type="range"
      mih={298}
      classNames={classes}
      defaultDate={usedRange?.[0] ?? undefined}
      date={tempSelectedStartDate || undefined}
      numberOfColumns={2}
      firstDayOfWeek={0}
      allowSingleDateInRange
      onChange={pickerOnChange}
      value={usedRange}
      onMonthSelect={handleDateControlChange}
      onYearSelect={handleDateControlChange}
      onNextMonth={handleDateControlChange}
      onNextDecade={handleDateControlChange}
      onNextYear={handleDateControlChange}
      onPreviousMonth={handleDateControlChange}
      onPreviousDecade={handleDateControlChange}
      onPreviousYear={handleDateControlChange}
      renderDay={(date) => {
        const dateISO = getFullDateFromISO(date.toISOString());
        const todayISO = getFullDateFromISO(new Date().toISOString());
        const isToday = dateISO === todayISO;
        return (
          <div style={{ borderBottom: isToday ? `2px solid ${Colors.brandPrimary900}` : 'none' }}>{date.getDate()}</div>
        );
      }}
      maxDate={usedMaxDate}
      minDate={usedMinDate}
    />
  );
};
