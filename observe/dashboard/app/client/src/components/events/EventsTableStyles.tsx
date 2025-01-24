import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useEventsTableStyles = createStyles(() => ({
  dataRow: {
    color: Colors.brandSecondary900,
    fontSize: 13,
    textWrap: 'nowrap',
  },
  drawerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: {
    color: Colors.black,
    textWrap: 'nowrap',
  },
  cellPadding: {
    padding: '8px',
  },
  linkCell: {
    color: Colors.linkColor,
    fontFamily: 'Inconsolata',
    fontSize: '14px',
  },
  contentCell: {
    lineHeight: '1.5',
    color: Colors.chartBlue,
    cursor: 'pointer',
  },
  contentCellButton: {
    border: 'none',
    backgroundColor: 'transparent',
    padding: 0,
    textAlign: 'left',
  },
}));
