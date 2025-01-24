import { createStyles } from '@mantine/core';
import { DateInput, DateValue, TimeInput } from '@mantine/dates';
import React, { useContext } from 'react';
import { Colors } from '~/assets/Colors';
import { WhyLabsText } from '~/components/design-system';
import { TimePeriod } from '~server/types/api';

import { usePickerDates } from '../hooks/usePickerDates';
import { DatePickerContext } from '../PickerContext';
import { WhyLabsPickerCommonProps, timeStringToObject } from '../utils';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    padding: '13px 12px 16px 12px',
    width: '565px',
  },
  dateTimeSection: {
    display: 'flex',
    width: '100%',
    gap: 5,
    '&:first-of-type': {
      marginRight: '24px',
    },
  },
  label: {
    fontWeight: 600,
    color: Colors.brandSecondary900,
  },
  inputValue: {
    color: Colors.darkGray,
    fontWeight: 400,
    fontSize: 14,
  },
  utcText: {
    paddingRight: 16,
  },
}));
export const InputsSection = (props: WhyLabsPickerCommonProps) => {
  const { classes, cx } = useStyles();
  const { timePeriod } = props;
  const allowHoursSelection = timePeriod === TimePeriod.Pt1H;
  const [{ defaultInputFocus }, pickerDispatch] = useContext(DatePickerContext);
  const { usedRange, usedStartTime, usedEndTime } = usePickerDates(props);

  const onChangeDate = (newDate: DateValue, type: 'startDate' | 'endDate') => {
    pickerDispatch({
      startDate: usedRange?.[0],
      endDate: usedRange?.[1],
      [type]: newDate,
      tempSelectedStartDate: newDate,
    });
  };

  const onChangeTime = (event: React.ChangeEvent<HTMLInputElement>, type: 'startHours' | 'endHours') => {
    const newTimeString = event.target.value;
    const newStartHours = timeStringToObject(newTimeString);
    pickerDispatch({ [type]: newStartHours });
  };

  const TimeRightSection = <WhyLabsText className={cx(classes.utcText, classes.inputValue)}>UTC</WhyLabsText>;

  return (
    <div className={classes.root}>
      <div className={classes.dateTimeSection}>
        <DateInput
          classNames={{ label: classes.label, input: classes.inputValue }}
          value={usedRange?.[0]}
          onChange={(value) => onChangeDate(value, 'startDate')}
          label="Start date:"
          placeholder="YYYY/MM/DD"
          w="100%"
          popoverProps={{ opened: false }}
          autoFocus={defaultInputFocus === 'start'}
          valueFormat="YYYY/MM/DD"
        />
        {allowHoursSelection && (
          <TimeInput
            value={usedStartTime}
            classNames={{ label: classes.label, input: classes.inputValue }}
            label="Start time:"
            w="100%"
            rightSection={TimeRightSection}
            onChange={(e) => onChangeTime(e, 'startHours')}
          />
        )}
      </div>
      <div className={classes.dateTimeSection}>
        <DateInput
          classNames={{ label: classes.label, input: classes.inputValue }}
          value={usedRange?.[1]}
          onChange={(value) => onChangeDate(value, 'endDate')}
          label="End date:"
          placeholder="YYYY/MM/DD"
          autoFocus={defaultInputFocus === 'end'}
          w="100%"
          popoverProps={{ opened: false }}
          valueFormat="YYYY/MM/DD"
        />
        {allowHoursSelection && (
          <TimeInput
            value={usedEndTime}
            classNames={{ label: classes.label, input: classes.inputValue }}
            label="End time:"
            w="100%"
            rightSection={TimeRightSection}
            onChange={(e) => onChangeTime(e, 'endHours')}
          />
        )}
      </div>
    </div>
  );
};
