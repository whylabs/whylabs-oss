import { createStyles } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';

import { TOOLTIP_MIN_WIDTH, TOTAL_GRAPH_AREA_HEIGHT, TOTAL_GRAPH_AREA_WIDTH } from 'ui/constants';

export const useCommonStyles = createStyles({
  clickity: {
    cursor: 'pointer',
  },
  buttonStyleCleaner: {
    padding: 0,
    textAlign: 'left',
  },
  textOverflow: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  disabled: {
    cursor: 'not-allowed',
  },
  breakWord: {
    wordWrap: 'break-word',
    wordBreak: 'break-word',
    lineHeight: `1.25 !important`,
    marginBottom: '4px',
  },
  dashedCta: {
    textDecoration: 'underline dashed',
    textUnderlineOffset: '4px',
  },
  redUnderline: {
    textDecorationColor: Colors.red,
  },
  pageRoot: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center-horizontal',
    width: 'auto',
    padding: '8px',
    minHeight: '100%',
  },
  pageWithoutFlex: {
    width: '100%',
    minHeight: '300px',
  },
  paneledPage: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
  },
  largeFont: {
    fontSize: '14px',
    lineHeight: '20px',
  },
  linkCell: {
    color: Colors.linkColor,
    textDecoration: 'underline',
    textOverflow: 'ellipsis',
    display: 'block',
    overflow: 'hidden',
  },
  bolded: {
    fontWeight: 600,
  },
  horizontalContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  cellBack: {
    backgroundColor: Colors.white,
  },
  numberAligned: {
    textAlign: 'right',
  },
  longGraphContainer: {
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '16px',
    marginRight: '8px',
    marginBottom: '8px',
    marginTop: '8px',
  },
  graphContainer: {
    width: TOTAL_GRAPH_AREA_WIDTH,
    height: TOTAL_GRAPH_AREA_HEIGHT,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: '8px',
    marginRight: '16px',
    marginBottom: 0,
    marginTop: '8px',
  },
  tooltip: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    minWidth: TOOLTIP_MIN_WIDTH,
  },
  explanationRow: {
    display: 'flex',
    columnGap: 8,
    rowGap: 2,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    maxWidth: '250px',
    flexWrap: 'wrap',
  },
  explanationWrapper: {
    display: 'flex',
    columnGap: 8,
    rowGap: 2,
    width: '100%',
    flexDirection: 'row',
    marginTop: '6px',
    flexWrap: 'nowrap',
    alignItems: 'start',
    height: '100%',
    maxWidth: '250px',
  },
  tooltipRow: {
    display: 'flex',
    gap: 8,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    justifyContent: 'center',
    margin: '5px 0',
    gap: 4,
  },
  marginLeftAuto: {
    marginLeft: 'auto',
  },
  tooltipLabel: {
    textTransform: 'capitalize',
    marginRight: '8px',
  },
  square: {
    height: '12px',
    width: '12px',
    marginLeft: 0,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  allCaps: {
    textTransform: 'uppercase',
  },
  tableFirstColumn: {
    width: '300px',
    maxWidth: '300px',
    minWidth: '300px',
    margin: 0,
  },
  tableHackFirstColumn: {
    width: '298px',
    maxWidth: '298px',
    minWidth: '298px',
    margin: 0,
  },
  verticalCenteredContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  rightThickBorder: {
    borderRight: `solid 4px ${Colors.brandSecondary200}`,
  },
  bottomThickBorder: {
    borderBottom: `solid 4px ${Colors.brandSecondary200}`,
  },
  cellStandard: {
    height: '40px',
  },
  cellStandardHeight: {
    height: '42px',
    minHeight: '42px',
  },
  commonLeftPadding: {
    paddingLeft: '18px',
  },
  cellStandardWidth: {
    width: '156px',
    minWidth: '156px',
  },
  cellFixedWidth: {
    width: '183px',
    minWidth: '183px',
    maxWidth: '183px',
  },
  cellFont: {
    fontSize: '12px',
    lineHeight: '20px',
  },
  cellNestedPadding: {
    padding: `0 ${Spacings.pageLeftPadding}px`,
  },
  lightGray: {
    color: 'gray',
    textDecorationColor: 'gray',
    fontStyle: 'italic',
  },
  commonFont: {
    fontFamily: 'Asap, sans-serif',
  },
});
