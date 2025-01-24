import { Colors } from '@whylabs/observatory-lib';
import { createStyles, getStylesRef } from '@mantine/core';

import DiagonalPatterns1Img from 'ui/Diagonal-Patterns1.svg';
import DiagonalPatterns2Img from 'ui/Diagonal-Patterns2.svg';

export const NUMBER_OF_COLUMNS = 5;
const cardGap = 21;
const useModelSummaryTabContentCSS = createStyles({
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '100%',
    overflow: 'auto',
    maxWidth: '100%',
  },
  columnsWrap: {
    height: '100%',
    maxHeight: '100%',
    display: 'flex',
    padding: 0,
    zIndex: 1,
    overflow: 'auto',
    backgroundImage: `url(${DiagonalPatterns1Img}), url(${DiagonalPatterns2Img})`,
    backgroundPosition: 'left bottom, right top',
    backgroundRepeat: 'no-repeat, no-repeat',
  },
  columnsSidePadding: {
    minWidth: 54,
  },
  columns: {
    margin: '0 auto',
    display: 'grid',
    gridGap: cardGap,
    gridTemplateColumns: `repeat(${NUMBER_OF_COLUMNS}, minmax(250px, 300px))`,
    maxHeight: '100%',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    padding: `${30 - cardGap / 2}px 0`,
    transition: 'background-color 200ms',
  },
});

const indicatorHeight = 2;
const iconWidth = 24;
const useSummaryCardStyles = createStyles({
  explainabilityChartLegend: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontFamily: 'Asap',
    color: Colors.brandSecondary700,
  },
  cardWrap: {
    padding: `${cardGap / 2}px 0`,
  },
  cardBase: {
    position: 'relative',
    maxWidth: 300,
  },
  card: {
    backgroundColor: Colors.whiteBackground,
    outline: `2px solid ${Colors.brandSecondary200}`,
    outlineOffset: '-2px',
    padding: 15,
    borderRadius: 4,
    transition: 'opacity 300ms',
    display: 'flex',
    flexDirection: 'column',
  },
  cardSkeleton: {
    borderRadius: 4,
  },
  cardHover: {
    '&[data-is-hovered="true"]': {
      [`& .${getStylesRef('cardRemoveBtn')}`]: {
        opacity: 1,
      },
    },
  },
  cardDisabled: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
  cardDragged: {
    opacity: 0,
  },
  cardDropIndicator: {
    '&::before': {
      position: 'absolute',
      content: '""',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 10px)',
      height: indicatorHeight,
      backgroundColor: Colors.chartPrimary,
    },
  },
  cardImageContainer: {
    position: 'relative',
    margin: 0,
  },
  cardNoDataText: {
    position: 'absolute',
    margin: 'auto',
    fontSize: 20,
    fontFamily: 'Asap, sans-serif',
    color: Colors.chartPrimary,
    width: '100%',
    textAlign: 'center',
    top: '36%',
  },
  stackCardNoDataText: {
    fontSize: 20,
    lineHeight: 1.4,
    fontFamily: 'Asap, sans-serif',
    color: Colors.chartPrimary,
  },
  cardDateRangeText: {
    fontSize: 12,
    lineHeight: 1.67,
    fontFamily: 'Asap, sans-serif',
    color: Colors.chartPrimary,
    marginBottom: 20,
  },
  cardExplanationText: {
    fontSize: 14,
    lineHeight: 1.43,
    fontFamily: 'Asap, sans-serif',
    color: Colors.chartPrimary,
  },
  cardDropIndicatorTop: {
    '&::before': {
      bottom: `calc(100% + ${(cardGap + indicatorHeight) / 2}px)`,
    },
  },
  cardDropIndicatorBottom: {
    '&::before': {
      top: `calc(100% + ${(cardGap + indicatorHeight) / 2}px)`,
    },
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    position: 'relative',
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 600,
    color: Colors.brandSecondary900,
    userSelct: 'none',
  },
  cardTitleInfo: {
    color: Colors.chartPrimary,
  },
  cardRemoveBtn: {
    ref: getStylesRef('cardRemoveBtn'),
    opacity: 0,
    transition: 'opacity 200ms',
    color: Colors.brandSecondary600,
    cursor: 'pointer',
    background: 'none',
    border: 0,
    padding: 0,
    fontFamily: 'inherit',
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 1,
    color: Colors.brandSecondary700,
    marginBottom: 5,
    marginTop: 10,
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  securedTopIndicator: {
    width: '100%',
    height: 5,
    borderRadius: '4px 4px 0 0',
    background: Colors.securedBlueGradient,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardLink: {
    textDecoration: 'underline',
    color: Colors.linkColor,
  },
  cardFooterText: {
    color: Colors.brandSecondary700,
  },
  cardDivider: {
    border: 'none',
    margin: '10px 0',
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    width: '100%',
  },
  cardFooter: {
    margin: '18px 0 13px 0',
    textAlign: 'center',
  },
  cardFooterIcon: {
    ref: getStylesRef('cardFooterIcon'),
    position: 'relative',
    paddingLeft: 10 + iconWidth,
    '& svg': {
      color: Colors.chartAqua,
      width: iconWidth,
      position: 'absolute',
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      transition: 'transform 200ms',
    },
  },
  cardFooterTxt: {
    fontSize: 12,
    fontFamily: 'Asap',
    lineHeight: 1.16,
    '&:hover': {
      [`& .${getStylesRef('cardFooterIcon')} svg`]: {
        transform: 'translate(8px, -50%)',
      },
    },
  },
  cardDialogBackground: {
    backgroundColor: Colors.whiteBackground,
  },
  mediumInfo: {
    fontSize: 20,
    lineHeight: 1.5,
    color: Colors.chartPrimary,
    fontFamily: 'Asap',
  },
  largeInfo: {
    fontSize: 36,
    lineHeight: '38px',
    color: Colors.chartPrimary,
    fontFamily: 'Asap',
  },
  largeInfoTxt: {
    marginLeft: 5,
    fontSize: 12,
    lineHeight: 1,
    color: Colors.secondaryLight1000,
  },
  linkInfo: {
    fontSize: 11,
    lineHeight: '20px',
    color: Colors.linkColor,
    lineBreak: 'anywhere',
    fontFamily: 'Asap',
  },
  featureLink: {
    fontSize: 11,
    lineHeight: 1.4,
    margin: 0,
    color: Colors.linkColor,
    lineBreak: 'anywhere',
    fontFamily: 'Asap',
  },
  linkData: {
    fontSize: 12,
    display: 'block',
    color: Colors.secondaryLight1000,
  },
  contentSubtitle: {
    fontSize: 12,
    lineHeight: 1,
    color: Colors.brandSecondary700,
    marginBottom: 5,
    marginTop: 10,
    fontFamily: 'Asap',
  },
  legendDescription: {
    fontSize: 11,
    lineHeight: 1,
    color: Colors.brandSecondary700,
    fontFamily: 'Asap',
  },
  contentList: {
    paddingLeft: 20,
  },
  contentTxt: {
    fontSize: 14,
    lineHeight: '22px',
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
  },
  shortLetterSpace: {
    letterSpacing: '0.11px',
  },
  contentSelect: {
    '& select': {
      padding: '10px 35px 10px 15px',
      fontSize: 14,
    },
  },
  contentSpaceBetween: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imgWrap: {
    objectFit: 'contain',
    textAlign: 'center',
    '& img': {
      maxHeight: '100%',
    },
  },
  switchContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    lineHeight: 1,
    marginBottom: 5,
  },
  contentSpacer: {
    width: '100%',
    marginBottom: 15,
  },
  contentTrendTxt: {
    fontSize: 12,
    lineHeight: '16px',
    color: Colors.brandSecondary700,
    fontFamily: 'Asap',
  },
  contentTrendValue: {
    position: 'relative',
    fontWeight: 600,
    paddingLeft: 22,
    fontFamily: 'Asap',
  },
  contentTrendPositive: {
    color: Colors.green,
  },
  contentTrendNegative: {
    color: Colors.red,
  },
  contentTrendArrow: {
    width: 22,
    height: 22,
    padding: 2,
    position: 'absolute',
    left: -2,
    top: '50%',
    transform: 'translateY(-50%)',
  },
  italicText: {
    fontStyle: 'italic',
    cursor: 'pointer',
    color: Colors.brandPrimary900,
  },
  messageStack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
});

export { useModelSummaryTabContentCSS, useSummaryCardStyles };
