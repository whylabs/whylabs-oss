import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useLlmTraceTableStyles = createStyles(() => ({
  dataRow: {
    color: Colors.brandSecondary900,
    fontFamily: 'Inconsolata',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  drawerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: {
    color: Colors.black,
    whiteSpace: 'nowrap',
  },
  cellPadding: {
    padding: '8px',
  },
  buttonCell: {
    color: Colors.linkColor,
    textAlign: 'left',
  },
  selectedCell: {
    color: Colors.white,
  },
  rowSelectedCheckbox: {
    '&:checked': {
      backgroundColor: `${Colors.secondaryLight800} !important`,
      borderColor: `${Colors.secondaryLight800} !important`,
    },
  },
  checkboxHeaderCell: {
    padding: '0px 18px',
  },
}));
