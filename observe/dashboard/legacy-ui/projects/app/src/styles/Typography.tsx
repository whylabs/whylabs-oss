import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

const gradientRed = '#EA5B4F';
const gradientYellow = '#F9C452';
const textGradient = `-webkit-linear-gradient(94.15deg, ${gradientRed} -10.2%, ${gradientYellow} 102.94%)`;

/**
 * Containts base typography styles
 * To visualy see how each of this styles look visit
 * https://www.figma.com/file/CzYRssnFYEnmraWrpyDFr6/Typography-Audit
 *
 * TODO:
 *  These styles all have very specific names, we should refactor all of them to be more generic
 */
const useTypographyStyles = createStyles({
  /**
   * Headings
   */
  headerLight: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '24px',
    fontWeight: 300,
    lineHeight: '1.5',
    color: Colors.white,
  },
  headerFit: {
    fontFamily: `"Baloo 2"`,
    fontSize: '42px',
    lineHeight: '56px',
    fontWeight: 400,
    color: Colors.secondaryLight1000,
    fontStyle: 'normal',
  },
  headerGradient: {
    fontFamily: `"Baloo 2"`,
    fontSize: '42px',
    lineHeight: '56px',
    fontWeight: 600,
    fontStyle: 'normal',
    background: textGradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerDark: {
    fontFamily: `"Baloo 2"`,
    fontSize: '33px',
    lineHeight: 1.5,
    fontWeight: 600,
    color: Colors.secondaryLight1000,
  },
  /**
   * Titles
   */
  title: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '1.5',
    fontStyle: 'normal',
  },
  titlePrimary: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '1.5',
    fontStyle: 'normal',
    color: Colors.brandPrimary900,
  },
  widgetTitle: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '14px',
    fontWeight: 600,
  },
  widgetMediumTitle: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '24px',
    fontWeight: 400,
    lineHeight: '1.5',
    color: Colors.brandPrimary900,
  },
  insightsWidgetTitle: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '18px',
    fontWeight: 400,
    lineHeight: '1.5',
    color: Colors.brandPrimary900,
  },
  cellTitle: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    fontWeight: 600,
  },
  titleGrey: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '30px',
    fontStyle: 'normal',
    colors: Colors.brandSecondary600,
  },
  widgetHighlightNumber: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '36px',
    lineHeight: '38px',
    minWidth: 'fit-content',
    color: Colors.brandPrimary900,
  },
  widgetHighlightText: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '24px',
    lineHeight: '30px',
    fontWeight: 400,
    color: Colors.brandPrimary900,
  },
  monitorManagerBannerTitle: {
    fontFamily: 'Asap',
    fontSize: '18px',
    lineHeight: '22px',
  },
  /**
   * Labels
   */
  label: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    fontWeight: 600,
  },
  labelAlertThin: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '14px',
    fontWeight: 'normal',
    lineHeight: '1.5',
    color: Colors.red,
  },
  labelPrimary: {
    color: Colors.chartPrimary,
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    fontWeight: 600,
  },
  labelSecondary: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    fontWeight: 600,
    color: Colors.brandSecondary900,
  },
  thinLabel: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '12px',
    lineHeight: '1',
    fontWeight: 400,
  },
  codeTabLabel: {
    fontFamily: `"Baloo 2"`,
    fontSize: '16px',
    lineHeight: '25px',
    letterSpacing: ' 0.01em',
    color: Colors.grey,
  },
  /**
   * Text
   */
  dataNotShownText: {
    fontSize: '12px',
    fontFamily: 'Asap,sans-serif',
    color: Colors.grey,
    fontStyle: 'italic',
  },
  text: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    fontWeight: 'normal',
  },
  textLarge: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '16px',
    lineHeight: '1.5',
    fontStyle: 'normal',
  },
  textThin: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: '1.5',
    fontWeight: 400,
  },
  textThinAlert: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: '1.5',
    fontWeight: 400,
    color: Colors.red,
  },
  textWide: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: 'normal',
  },
  textTable: {
    fontFamily: 'Inconsolata',
    fontSize: '13px',
    lineHeight: '1.5',
    fontWeight: 400,
  },
  textTableAlert: {
    fontFamily: 'Inconsolata',
    fontSize: '13px',
    lineHeight: '1.5',
    fontWeight: 600,
    color: Colors.red,
  },
  overflowTextCell: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  helperTextThin: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: 1,
    fontWeight: 400,
  },
  helperTrendText: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 400,
  },
  helperTextBold: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: '1.5',
    fontWeight: 600,
  },
  monitorManagerTableText: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'Inconsolata',
    fontWeight: 500,
    fontSize: '13px',
    lineHeight: '14px',
  },
  monitorManagerStrongTableText: {
    fontFamily: 'Inconsolata',
    fontWeight: 800,
    fontSize: '14px',
    lineHeight: '20px',
    color: Colors.secondaryLight1000,
  },
  /**
   * Utils
   */
  unhelpfulAlertText: {
    color: 'grey',
    fontStyle: 'italic',
  },
  noDataText: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: 1.5,
    fontWeight: 400,
    fontStyle: 'italic',
    color: Colors.brandSecondary700,
  },
  noDataTitle: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '16px',
    lineHeight: 1.5,
    fontWeight: 400,
    color: Colors.brandSecondary700,
  },
  link: {
    fontFamily: 'Asap,sans-serif',
    color: Colors.linkColor,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  linkLarge: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '16px',
    lineHeight: '1.5',
    fontWeight: 400,
    cursor: 'pointer',
    color: Colors.linkColor,
  },
  linkTiny: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '11px',
    lineHeight: '1.5',
    fontWeight: 400,
    color: Colors.linkColor,
    cursor: 'pointer',
  },
  linkLabel: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '14px',
    fontWeight: 600,
    color: Colors.linkColor,
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  /**
   * New getting started styles
   */
  titleGettingStarted: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '24px',
    lineHeight: '34px',
    textAlign: 'center',
    color: Colors.secondaryLight1000,
    fontWeight: 600,
    margin: 0,
  },
  imageText: {
    fontFamily: `"Baloo 2"`,
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: 400,
    textAlign: 'center',
    margin: 0,
    paddingTop: 9,
    color: Colors.secondaryLight1000,
  },
  boxText: {
    fontFamily: `"Baloo 2"`,
    fontSize: '16px',
    lineHeight: '32px',
    fontWeight: 400,
    textAlign: 'left',
    margin: 0,
    color: Colors.brandSecondary600,
  },
  alertMessage: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '18px',
    lineHeight: '30px',
  },
  monoFont: {
    fontFamily: 'Inconsolata',
    fontSize: '13px',
  },
  allContentMonospaceFont: {
    '& *': {
      fontFamily: 'Inconsolata',
    },
  },
});

export default useTypographyStyles;
