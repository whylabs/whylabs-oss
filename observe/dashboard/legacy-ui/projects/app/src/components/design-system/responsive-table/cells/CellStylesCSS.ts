import { createStyles, getStylesRef } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { HEADER_CELL_HORIZONTAL_PADDING } from './HeaderCell';
import { SortableGenericCellProps } from './types';

export const useCellStyles = createStyles((_, background: SortableGenericCellProps['background']) => ({
  root: {
    width: 'calc(100% - 2px)',
    height: '100%',
    border: 'unset',
    padding: 0,
    paddingRight: HEADER_CELL_HORIZONTAL_PADDING,
    backgroundColor: background?.default || 'white',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: background?.onHover || Colors.brandSecondary100,
      '& [data-show-on-hover]': {
        opacity: 1,
        [`&.${getStylesRef('actionIcon')}`]: {
          background: Colors.brandSecondary300,
        },
      },
    },
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 200ms',
  },
  sortingWrap: {
    opacity: 0,
    textAlign: 'end',
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: '1.5',
    fontWeight: 400,
    transition: 'opacity 150ms',
  },
  actionIcon: {
    ref: getStylesRef('actionIcon'),
    background: Colors.brandSecondary200,
    transition: 'background-color 200ms',
  },
}));
