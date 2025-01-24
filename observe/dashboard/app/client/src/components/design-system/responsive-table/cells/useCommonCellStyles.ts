import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useCommonCellStyles = createStyles(() => ({
  common: {
    display: 'block',
    fontFamily: 'Inconsolata',
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.4,
    overflow: 'hidden',
    padding: 8,
    textOverflow: 'ellipsis',
    textWrap: 'nowrap',
  },
  text: {
    color: Colors.gray900,
  },
}));
