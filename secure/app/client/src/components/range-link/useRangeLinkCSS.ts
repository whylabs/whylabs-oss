import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useRangeLinkCSS = createStyles({
  smallText: {
    fontFamily: 'Asap, sans-serif',
    fontSize: '12px',
    lineHeight: '14px',
  },
  linkStyle: {
    cursor: 'pointer',
    color: Colors.linkColor,
    textDecorationLine: 'underline',
    fontFamily: 'Asap, sans-serif',
    transition: 'opacity 200ms, color 200ms',
    '&:hover': {
      color: Colors.brandPrimary600,
      opacity: 0.8,
    },
  },
  cardText: {
    fontFamily: 'Asap, sans-serif',
    fontSize: 14,
    lineHeight: 1,
  },
  cardNoData: {
    fontFamily: 'Asap, sans-serif',
    paddingTop: '3px',
    lineHeight: '14px',
    fontSize: '14px',
    fontStyle: 'italic',
  },
});
