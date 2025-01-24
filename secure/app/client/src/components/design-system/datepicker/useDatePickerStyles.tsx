import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useDatePickerStyles = createStyles(() => ({
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
