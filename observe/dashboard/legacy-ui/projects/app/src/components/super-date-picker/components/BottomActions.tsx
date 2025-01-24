import { createStyles } from '@mantine/core';
import React, { useContext } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsButton, WhyLabsSubmitButton } from 'components/design-system';
import { Concrete } from 'types/utilityTypes';
import { DateTimeRange } from 'hooks/useCustomMonitor/monitorUtils';
import { TimePeriod } from 'generated/graphql';
import { useDateRangeParams } from '../hooks/useDateRangeParams';
import { DatePickerContext } from '../PickerContext';
import { usePickerDates } from '../hooks/usePickerDates';
import {
  createISOStringWithUpdatedHours,
  clearPickerState,
  dateConstructorToReadableISOString,
  CustomRangeSearchParams,
  PickerControlProps,
} from '../utils';

const useStyles = createStyles(() => ({
  root: {
    width: '100%',
    display: 'flex',
    justifyContent: 'end',
    gap: 7,
    borderTop: `1px solid ${Colors.lightGrayBorder}`,
    padding: 12,
  },
  cancelButton: {
    color: Colors.secondaryLight1000,
    border: 'unset',
    width: 70,
  },
  applyButton: {
    width: 70,
  },
}));
type BottomActionsProps = {
  maxUtcDate?: Date;
  minUtcDate?: Date;
  onApplyCallback?: ({ start, end }: DateTimeRange) => void;
} & Concrete<CustomRangeSearchParams> &
  PickerControlProps;
export const BottomActions = ({
  maxUtcDate,
  minUtcDate,
  onApplyCallback,
  ...props
}: BottomActionsProps): React.ReactElement => {
  const { classes } = useStyles();
  const { timePeriod } = props;
  const includeHours = timePeriod === TimePeriod.Pt1H;
  const [{ startDate, startHours, endDate, endHours }, pickerDispatch] = useContext(DatePickerContext);
  const { setRangeParams } = useDateRangeParams(props);
  const { usedRange, usedStartTime, usedEndTime } = usePickerDates(props);

  const handlePickerClose = () => {
    pickerDispatch({
      ...clearPickerState,
      opened: false,
    });
  };

  const [newStartDate, newEndDate] = usedRange ?? [];
  const noChangesInDates = !startDate || !endDate;
  const noChangesInHours = !startHours && !endHours;
  const hasIncompleteRange = !newStartDate || !newEndDate;

  const hasValidRange = (start: number, end: number) => {
    if (start >= end) {
      pickerDispatch({ invalidMessage: 'Start time should be earlier than end time.' });
      return false;
    }
    if (maxUtcDate && end > maxUtcDate.getTime()) {
      pickerDispatch({ invalidMessage: 'End time should be within calendar limit.' });
      return false;
    }
    if (minUtcDate && start < minUtcDate.getTime()) {
      pickerDispatch({ invalidMessage: 'Start time should be within calendar limit.' });
      return false;
    }
    return true;
  };

  const onApply = () => {
    if ((noChangesInDates && noChangesInHours) || hasIncompleteRange) {
      handlePickerClose();
      return;
    }
    const startISOString = createISOStringWithUpdatedHours(newStartDate!, usedStartTime ?? '00:00');
    const endISOString = createISOStringWithUpdatedHours(newEndDate!, usedEndTime ?? '23:59:59.999');
    const startDateInGMT = new Date(startISOString);
    const endDateInGMT = new Date(endISOString);
    const newReadableStartRange = dateConstructorToReadableISOString(startDateInGMT.getTime(), { includeHours });
    const newReadableEndRange = dateConstructorToReadableISOString(endDateInGMT.getTime(), { includeHours });
    if (
      newReadableStartRange &&
      newReadableEndRange &&
      hasValidRange(startDateInGMT.getTime(), endDateInGMT.getTime())
    ) {
      setRangeParams({
        start: newReadableStartRange,
        end: newReadableEndRange,
      });
      handlePickerClose();
      onApplyCallback?.({ start: startDateInGMT, end: endDateInGMT });
    }
  };
  return (
    <div className={classes.root}>
      <WhyLabsButton onClick={handlePickerClose} className={classes.cancelButton} variant="filled" color="gray">
        Cancel
      </WhyLabsButton>
      <WhyLabsSubmitButton onClick={onApply} className={classes.applyButton}>
        Apply
      </WhyLabsSubmitButton>
    </div>
  );
};
