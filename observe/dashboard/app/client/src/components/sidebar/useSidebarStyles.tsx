import { createStyles, getStylesRef } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useSidebarStyles = createStyles({
  contentRoot: {
    display: 'flex',
    flexDirection: 'column',
    padding: 20,
    backgroundColor: Colors.darkHeader,
    minWidth: 300,
    minHeight: '100%',
  },
  closeButton: {
    // Custom margins to match ui-exp sidebar design
    marginRight: -2,
    marginTop: -3,
  },
  logoRow: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 30,
    // Custom margins to match ui-exp sidebar design
    marginLeft: 1,
    marginTop: -2,
    paddingLeft: 10,
  },
  contentSection: {
    ref: getStylesRef('contentSection'),
    cursor: 'pointer',
    color: Colors.brandSecondary400,
    margin: 0,
    padding: '10px',
    fontSize: 14,
    justifyContent: 'flex-start',
    fontFamily: 'Asap, sans-serif',
    height: 40,
  },
  undecoratedA: {
    textDecoration: 'none',
    marginBottom: '2px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },

  hoverState: {
    '&:hover': {
      backgroundColor: 'rgba(49, 59, 61, 0.5)',
      borderRadius: '4px',
      [`& .${getStylesRef('contentSection')}`]: {
        color: Colors.white,
      },
    },
    [`&:active .${getStylesRef('contentSection')}`]: {
      color: `${Colors.brandPrimary200} !important`,
    },
    '&:active': {
      backgroundColor: Colors.secondaryLight1000,
    },
  },

  activeNavLink: {
    backgroundColor: Colors.secondaryLight1000,
    borderRadius: '4px',
    [`& .${getStylesRef('contentSection')}`]: {
      color: Colors.brandPrimary200,
    },
    '&:hover': {
      backgroundColor: Colors.secondaryLight1000,
      [`& .${getStylesRef('contentSection')}`]: {
        color: Colors.brandPrimary100,
      },
    },
  },
});
