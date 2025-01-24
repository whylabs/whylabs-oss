import { createStyles } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';

export const useModelWidgetStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    backgroundColor: Colors.white,
    paddingLeft: '20px',
    paddingRight: '20px',
    minHeight: Spacings.tabContentHeaderHeight,
  },
  withoutLeftBorder: {
    borderLeft: 'none',
  },
  overviewAlerts: {
    minWidth: 380,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    color: Colors.brandSecondary900,
  },
  headlineColumn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '10px 0',
  },
  iconColumn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginRight: '2px',
    width: '24px',
  },
  heroNumber: {
    color: Colors.brandPrimary900,
    fontSize: '36px',
    lineHeight: '38px',
    minWidth: 'fit-content',
    fontFamily: 'Asap, sans-serif',
  },
  heroText: {
    color: Colors.brandPrimary900,
    fontSize: '24px',
    lineHeight: '30px',
    fontFamily: 'Asap, sans-serif',
  },
  bolded: {
    fontWeight: 600,
  },
  asap: {
    fontFamily: 'Asap, sans-serif',
  },
  headline: {
    color: Colors.brandSecondary900,
    fontSize: '14px',
    lineHeight: '20px',
    whiteSpace: 'nowrap',
    fontFamily: 'Asap, sans-serif',
  },
  row: {
    width: '100%',
  },
  maxContentWidth: {
    width: 'max-content',
  },
  skeletonWrap: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 30,
    '& > div:first-child': {
      marginRight: 8,
    },
    '& > div > span': {
      marginBottom: 2,
      '&:last-child': {
        marginBottom: 0,
      },
    },
  },
});
