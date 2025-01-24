import { Colors } from '@whylabs/observatory-lib';
import { getStylesRef, createStyles } from '@mantine/core';

const headerPadding = 10;
const columnBulletWidth = 20;
const bulletSideMargin = 22;
const cardBtnHeight = 30;
const gridGap = 15;
export const minRowHeight = cardBtnHeight + gridGap;
export const cardPadding = 15;
export const cardBorderWidth = 2;

const useCustomMonitorManagerCSS = createStyles({
  debugButton: {
    position: 'fixed',
    right: 100,
  },
  loading: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  maxTopKLabel: {
    fontFamily: 'Asap',
    color: Colors.brandSecondary600,
    fontSize: '12px',
  },
  closedFlexCard: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  pageRoot: {
    flex: '1 1 auto',
    maxHeight: '100%',
    position: 'relative',
    display: 'flex',
    flexFlow: 'nowrap',
    overflow: 'auto',
  },
  loaderWrap: {
    flex: '1 1 auto',
    maxHeight: '100%',
    position: 'relative',
    display: 'flex',
    flexFlow: 'nowrap',
    overflow: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phasesContainer: {
    flex: '1 1 auto',
    maxHeight: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    padding: gridGap,
  },
  spaceBottom: {
    marginBottom: 10,
  },
  multiSelectWrapper: {
    width: '280px',
  },
  phaseRow: {
    display: 'grid',
    gridTemplateColumns: `280px repeat(4, 300px) ${minRowHeight}px`,
    gridAutoRows: `minmax(${minRowHeight}px, auto)`,
    gap: `${gridGap}px 0`,
    padding: 0,
    marginBottom: gridGap,
  },
  pageTitleLeft: {
    textAlign: 'right',
    color: Colors.brandPrimary900,
    paddingRight: 12,
  },
  pageTitle: {
    margin: `${headerPadding}px 0`,
    display: 'inline-block',
    fontWeight: 'normal',
    fontFamily: 'Asap',
    fontSize: '24px',
    lineHeight: '30px',
    width: '100%',
    ref: getStylesRef('pageTitle'),
  },
  pageTitleRight: {
    gridColumn: '2 / span 2',
    gridRow: 1,
    backgroundColor: Colors.white,
    borderRadius: 4,
    border: `${cardBorderWidth}px solid ${Colors.brandSecondary200}`,
    '&:focus:hover, &:focus-visible': {
      outline: 'none',
      border: `${cardBorderWidth}px solid ${Colors.brandPrimary900}`,
    },
    '&:hover': {
      border: `${cardBorderWidth}px solid ${Colors.brandSecondary400}`,
    },
    [`&.${getStylesRef('pageTitle')}`]: {
      margin: 0,
      padding: headerPadding,
      alignSelf: 'center',
      fontSize: '16px',
    },
  },
  actionControls: {
    gridColumn: '2',
    display: 'flex',
    gap: 15,
  },
  actionButton: {
    textDecoration: 'none',
    borderRadius: 4,
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 500,
    lineHeight: '20px',
    fontFamily: 'Asap',
    height: cardBtnHeight,
    boxShadow: 'none',
  },
  cancelButton: {
    color: Colors.brandSecondary900,
    border: `1px solid ${Colors.brandSecondary400}`,
    background: 'none',
    marginLeft: '15px',
    lineHeight: '14px',
    '&:hover, &:focus': {
      background: 'none',
    },
  },
  phaseBtn: {
    color: Colors.white,
  },
  nextBtn: {
    background: 'linear-gradient(94.15deg, #EA5B4F -10.2%, #F9C452 102.94%)',
    border: 'none !important',
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 500,
  },
  column1: {
    transition: 'height 200ms',
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      transition: 'height 200ms border 200ms',
      height: '100%',
      border: `1px solid transparent`,
      borderRightColor: Colors.brandPrimary900,
      width: 2,
      right: columnBulletWidth / 2 + bulletSideMargin + 1,
      top: minRowHeight / 2 + columnBulletWidth / 2,
      transform: 'translateX(50%)',
    },
  },
  column1Active: {
    '&::after': {
      borderRightColor: Colors.brandSecondary700,
      borderRightStyle: 'dashed',
    },
  },
  column1Inactive: {
    '&::after': {
      borderRightColor: Colors.brandSecondary700,
      borderRightStyle: 'dashed',
    },
  },
  column1Last: {
    '&::after': {
      display: 'none',
    },
  },
  column1Content: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: minRowHeight,
    marginRight: bulletSideMargin,
    color: Colors.brandPrimary900,
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontSize: '16px',
    lineHeight: '14px',
  },
  column1ContentActive: {
    fontWeight: 600,
  },
  column1ContentInactive: {
    color: Colors.brandSecondary700,
  },
  bullet: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: columnBulletWidth,
    height: columnBulletWidth,
    marginLeft: bulletSideMargin,
    borderRadius: '50%',
    border: `2px solid ${Colors.brandPrimary900}`,
    backgroundColor: Colors.brandSecondary100,
    transition: 'background-color 200ms, border-width 200ms',
    '& > svg': {
      width: 16,
      transition: 'opacity 200ms',
    },
  },
  bulletActive: {
    backgroundColor: Colors.brandPrimary900,
  },
  bulletInactive: {
    borderColor: Colors.brandSecondary700,
    borderWidth: 1,
    '& > svg': {
      opacity: 0,
    },
  },
  columnCardWrap: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    transition: 'opacity 200ms',
  },
  columnCardWrapInactive: {
    opacity: 0,
  },
  columnCard: {
    display: 'flex',
    position: 'relative',
    backgroundColor: Colors.whiteBackground,
    transition: 'min-height 300ms',
    border: `${cardBorderWidth}px solid ${Colors.brandSecondary200}`,
    borderLeft: 'none',
    padding: '9px 15px',
    flexGrow: 1,
    overflow: 'hidden',
  },
  columnCardFirst: {
    borderLeft: `${cardBorderWidth}px solid ${Colors.brandSecondary200}`,
    borderRadius: '4px 0 0 4px',
  },
  columnCardLast: {
    borderRadius: '0 4px 4px 0',
  },
  columnCardBtnSpacer: {
    minHeight: minRowHeight,
    display: 'flex',
    alignItems: 'flex-end',
  },
  phaseEditBtn: {
    '&:active': {
      top: '50%',
      transform: 'translateY(-45%)',
    },
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: 15,
    backgroundColor: Colors.whiteBackground,
    borderRadius: 4,
    border: `2px solid ${Colors.brandSecondary200}`,
    color: Colors.brandPrimary900,
    width: 30,
    height: 30,
    '& svg': {
      width: 18,
      height: 18,
    },
  },
  columnCardContentWrap: {
    position: 'absolute', // relatively to "columnCard"
    left: cardPadding,
    top: cardPadding,
    margin: 0,
    padding: 0,
    width: `calc(100% - ${cardPadding * 2}px)`,
    '& > *': {
      marginBottom: 15,
      '&:last-child': {
        marginBottom: 0,
      },
    },
  },
  metricsSelectWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  columnCardContent: {
    '& > *': {
      marginBottom: 15,
      '&:last-child': {
        marginBottom: 0,
      },
    },
  },
  columnCompleteStateComponent: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: 16,
    lineHeight: '20px',
    color: Colors.brandPrimary900,
    position: 'relative',
  },
  columnCardTitle: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: 16,
    lineHeight: '20px',
    color: Colors.secondaryLight1000,
  },
  columnCardText: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '20px',
    color: Colors.secondaryLight1000,
  },
  columnCardTextCenter: {
    textAlign: 'center',
  },
  columnCardLink: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 500,
    fontSize: 14,
    lineHeight: '20px',
    color: Colors.linkColor,
    textDecoration: 'underline',
    '&:hover': {
      color: Colors.brandPrimary600,
    },
  },
  cardRadioControlWithTooltip: {
    marginBottom: 10,
    marginRight: 0,
  },
  cardRadioControl: {
    marginBottom: 10,
    marginRight: 0,
    '&:last-child': {
      marginBottom: 0,
    },
  },
  cardRadioRoot: {
    marginRight: 0,
  },
  cardRadioLabel: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontSize: 16,
    lineHeight: '20px',
    color: Colors.secondaryLight1000,
  },
  columnCardFlex: {
    display: 'flex',
    '& > div': {
      width: 'calc((100% - 16px) / 2)',
      '&:last-child': {
        marginLeft: 16,
      },
    },
  },
  flexCard: {
    display: 'flex',
    gap: '20px',
  },
  childFlexCard: {
    position: 'relative',
    width: '50%',
  },
  cardFlexColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  columnCardGraphWrap: {
    marginLeft: 16,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monitorInputWrapper: {
    gridColumn: '2 / span 2',
    gridRow: 1,
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'column',
  },
  monitorIdWrapper: {
    marginTop: '8px',
  },
  tallInput: {
    height: 60,
  },
  monitorIdText: {
    lineHeight: '14px',
    color: Colors.grey,
  },
  monitorIdTextBold: {
    fontWeight: 600,
  },
  listTitle: {
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: '20px',
    margin: 0,
    marginBottom: 10,
  },
  highlightNumber: {
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: '36px',
    lineHeight: '44px',
    color: Colors.brandPrimary900,
    marginBottom: '10px',
    marginTop: '50px',
  },
  hellingerContainer: {
    borderTop: `1px solid ${Colors.brandSecondary200}`,
  },
  hellingerTitle: {
    fontFamily: 'Asap',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '15px 0px',
  },
  hellingerField: {
    width: '60px',
  },
  customBorder: {
    position: 'absolute',
    width: '2px',
    height: '70px',
    backgroundColor: Colors.brandSecondary200,
    right: '15px',
    top: '-20px',
  },
  readModeLabel: {
    fontFamily: 'Asap',
    fontSize: '12px',
    fontWeight: 400,
    color: Colors.brandSecondary800,
  },
});
export default useCustomMonitorManagerCSS;
