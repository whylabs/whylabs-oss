import { DatePicker, DatesRangeValue } from '@mantine/dates';
import { useContext, useEffect } from 'react';
import { Colors } from '~/assets/Colors';
import { useDatePickerStyles } from '~/components/design-system/datepicker/useDatePickerStyles';

import { usePickerDates } from '../hooks/usePickerDates';
import { DatePickerContext } from '../PickerContext';
import { SuperPickerContext, WhyLabsPickerCommonProps, translateGMTTimestampToLocalDate } from '../utils';

type CalendarRangePickerProps = {
  maxUtcDate?: Date;
  minUtcDate?: Date;
} & WhyLabsPickerCommonProps;
export const CalendarRangePicker = ({ maxUtcDate, minUtcDate, ...props }: CalendarRangePickerProps) => {
  const [{ tempSelectedStartDate }, rangeDispatch] = useContext(DatePickerContext);
  const { usedRange } = usePickerDates(props);
  const { classes } = useDatePickerStyles();

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
        const dateISO = date.toISOString().substring(0, 10);
        const todayISO = new Date().toISOString().substring(0, 10);
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
