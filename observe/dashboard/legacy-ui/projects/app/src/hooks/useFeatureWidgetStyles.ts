import { createStyles } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';

export const useFeatureWidgetStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flex: '1 0 fit',
    whiteSpace: 'nowrap',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    backgroundColor: Colors.white,
    paddingLeft: '12px',
    paddingRight: '12px',
    '&:nth-of-type(1)': {
      borderLeft: 'none',
    },
  },
  lineageWidget: {
    minWidth: '280px',
  },
  firstItem: {
    marginLeft: 0,
    paddingLeft: '16px',
    borderLeft: 0,
  },
  firstWidget: {
    // added 1px to widget's width for border alignment
    maxWidth: Spacings.leftColumnWidth + 1,
    flexBasis: Spacings.leftColumnWidth + 1,
  },
  stretchy: {
    flex: '1 0 auto',
  },
  bumpDown: {
    position: 'relative',
    top: '5px',
  },
  lengthRestricted: {
    maxWidth: '256px',
  },
  headlineText: {
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.5,
    color: Colors.brandSecondary900,
    fontFamily: 'Asap, sans-serif',
  },
  heroText: {
    fontSize: 16,
    lineHeight: 1.5,
    color: Colors.brandPrimary900,
    fontFamily: 'Asap, sans-serif',
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
