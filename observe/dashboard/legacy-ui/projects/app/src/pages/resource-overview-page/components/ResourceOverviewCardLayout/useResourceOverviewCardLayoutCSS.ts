import { Colors } from '@whylabs/observatory-lib';
import { createStyles, getStylesRef } from '@mantine/core';
import diagonalPatternBottom from 'ui/Diagonal-Patterns1.svg';
import diagonalPatternTop from 'ui/Diagonal-Patterns2.svg';

const cardGap = 21;
const iconWidth = 24;
const cardPadding = 15;

export const useCardLayoutStyles = createStyles(() => ({
  tooltipWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
  },
  cardName: {
    maxWidth: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-block',
    fontSize: 16,
    lineHeight: '27.44px',
    color: Colors.brandPrimary900,
    textDecoration: 'underline',
    transition: 'opacity 200ms, color 200ms',

    '&:hover': {
      color: Colors.brandPrimary600,
      opacity: 0.8,
    },
    '& a': {
      display: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
      textDecoration: 'inherit',
      whiteSpace: 'inherit',
      overflow: 'inherit',
      textOverflow: 'inherit',
    },
  },
  cardSubTitle: {
    fontSize: 12,
    fontFamily: 'Asap, Roboto, sans-serif',
    color: Colors.brandSecondary700,
    wordWrap: 'break-word',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 1,
  },
  cardNoData: {
    paddingTop: '3px',
    lineHeight: '14px',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  cardFooterTxt: {
    fontSize: 12,
    lineHeight: 1,
  },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gridTemplateAreas: `"header"
                          "content"
                          "footer"`,
    gridTemplateRows: 'min-content auto min-content',
    maxWidth: 300,
    borderRadius: 4,
    backgroundColor: Colors.whiteBackground,
    outline: `2px solid ${Colors.brandSecondary200}`,
    outlineOffset: '-2px',
    transition: 'opacity 200ms',

    '&:hover': {
      visibility: 'visible',
    },
  },
  cardContent: {
    gridArea: 'content',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    padding: `15px ${cardPadding}px 0 ${cardPadding}px`,
  },
  cardSpacer: {
    marginBottom: 15,
    width: '100%',
  },
  cardSpacerSmall: {
    marginBottom: 7.5,
    width: '100%',
  },
  cardFooter: {
    padding: cardPadding,
    paddingBottom: 0,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  cardFooterLink: {
    display: 'block',
    fontSize: 14,
    lineHeight: 1,
    color: Colors.linkColor,
    textDecoration: 'underline',
    transition: 'opacity 200ms, color 200ms',
    padding: cardPadding,
    margin: `0 -${cardPadding}px`,

    '&:hover': {
      color: Colors.brandPrimary600,
      opacity: 0.8,
      [`& .${getStylesRef('cardFooterIcon')} svg`]: {
        transform: 'translate(8px, -50%)',
      },
    },
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
  cardFooterDivider: {
    border: 'none',
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    width: '100%',
    pointerEvents: 'none',
    marginBottom: 0,
  },
  linkStyle: {
    color: Colors.linkColor,
    fontSize: '12px',
    width: 'fit-content',
    lineHeight: '14px',
    textDecorationLine: 'underline',
    fontFamily: 'Asap, Roboto, sans-serif',
    transition: 'opacity 200ms, color 200ms',
    '&:hover': {
      color: Colors.brandPrimary600,
      opacity: 0.8,
    },
  },
  editContainer: {
    display: 'flex',
    overflow: 'auto',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '100%',
  },
  root: {
    padding: '21px 32px',
    background: `url(${diagonalPatternBottom}) left bottom no-repeat, url(${diagonalPatternTop})  right top no-repeat`,
    backgroundColor: Colors.brandSecondary100,
    overflow: 'auto',
    height: '100%',
  },
  cardsWrap: {
    display: 'grid',
    gap: cardGap,
    gridTemplateColumns: `repeat(auto-fit, minmax(250px, 250px))`,
    justifyContent: 'center',
    margin: '0 auto',
  },
  addCardBtn: {
    borderRadius: 4,
    backgroundColor: Colors.whiteBackground,
    border: `2px solid ${Colors.brandSecondary200}`,
    height: 55,
  },
  addCardBtnIcon: {
    position: 'relative',
    paddingLeft: 10 + iconWidth,
    '& svg': {
      color: Colors.chartAqua,
      width: iconWidth,
      fontSize: 28,
      position: 'absolute',
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      transition: 'transform 200ms',
      transformOrigin: 'center',
    },
  },
  addCardBtnLink: {
    width: '100%',
    height: '100%',
    padding: cardPadding,
    fontSize: '12px',
    lineHeight: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: Colors.linkColor,
    textDecoration: 'underline',
    cursor: 'pointer',
    transition: 'opacity 200ms, color 200ms',
    '&:hover': {
      color: Colors.brandPrimary600,
      opacity: 0.8,
    },
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
  securedIconContainer: {
    display: 'flex',
    gap: 3,
    alignItems: 'center',
    position: 'absolute',
    top: '10px',
    right: '6px',
  },
  securedText: {
    color: Colors.blue2,
    fontFamily: '"Baloo 2"',
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
  },
}));
