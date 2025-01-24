import { createStyles, CSSObject } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import GetStartedWhyBotSVG from 'ui/get-started-why-bot-bg.svg';

const gradientTextStyle: CSSObject = {
  fontWeight: 600,
  backgroundSize: '100%',
  WebkitBackgroundClip: 'text',
  MozBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  MozTextFillColor: 'transparent',
};

const BOX_SHADOW = '0px 4px 20px 0px #00000026';

const DATA_GRADIENT = 'linear-gradient(91.27deg, #369BAC 16.83%, #3BC088 83.63%)';
const MODEL_GRADIENT = 'linear-gradient(94.15deg, #6D44C3 -10.2%, #EA5B4F 102.94%)';
const BLACK_GRADIENT = 'linear-gradient(90deg, #5B5B5B 0%, #010101 100%)';
const LLM_SECURE_GRADIENT = 'linear-gradient(91deg, #2683C9 16.83%, #44C0E7 84.77%)';

const CONTENT_HORIZONTAL_PADDING = 53;

export const useSemiModalPageStyles = createStyles((theme) => ({
  pageContainer: {
    background: 'linear-gradient(180deg, #EBF2F3 0%, #FFFFFF 52.47%)',
    minHeight: '100vh',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      overflowX: 'hidden',
      minHeight: '110vh',
    },
  },
  botImageBackgroundContainer: {
    backgroundImage: `url("${GetStartedWhyBotSVG}")`,
    backgroundPosition: 'bottom right',
    backgroundRepeat: 'no-repeat',
    height: '100%',
    position: 'absolute',
    width: '100%',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      minHeight: '115vh',
    },
  },
  header: {
    justifyContent: 'space-between',
    position: 'relative',
    display: 'flex',
    padding: '10px 10px 0 0',
  },
  anchor: {
    color: Colors.linkColor,
  },
  headerLogoContainer: {
    alignItems: 'center',
    display: 'flex',
    marginLeft: 11,
    height: 'fit-content',
  },
  menuButton: {
    display: 'block',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      display: 'none',
    },
  },
  closeButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    border: '2px solid #e3613199',
    color: Colors.night1,
    height: 31,
    padding: 0,
    width: 31,

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      display: 'none',
    },
  },
  logOutButton: {
    fontWeight: 600,
    color: '#000',
    textDecoration: 'none',
    display: 'none',
    fontFamily: 'Asap, sans-serif',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      display: 'block',
    },
  },
  content: {
    padding: `45px ${CONTENT_HORIZONTAL_PADDING}px`,
    paddingTop: 0,
    position: 'relative',

    '& > section': {
      marginBottom: 20,
    },

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      padding: '0px 20px',
    },
  },
  justifyEnd: {
    display: 'flex',
    justifyContent: 'end',
  },
  pageTitle: {
    fontFamily: "'Baloo 2'",
    fontSize: 34,
    fontWeight: 600,
    margin: 0,
    marginBottom: 16,

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      textAlign: 'center',
      marginTop: '10px',
    },
  },
  sectionTitle: {
    fontFamily: 'Asap, Roboto, sans-serif',
    fontSize: 24,
    fontWeight: 400,
    marginBottom: 10,
    marginTop: 0,
  },
  linksContainer: {
    display: 'flex',
    gap: 20,
    // Enable a nicer horizontal scrolling experience
    // And the vertical padding allow shadow to be visible as expected
    padding: `20px ${CONTENT_HORIZONTAL_PADDING}px`,
    margin: `-20px -${CONTENT_HORIZONTAL_PADDING}px`,
    msOverflowStyle: 'none',
    overflow: 'scroll clip',
    scrollbarWidth: 'none',

    '& > a': {
      textDecoration: 'none',
    },

    '&&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  linkCard: {
    borderRadius: 10,
    boxShadow: BOX_SHADOW,
    color: '#fff',
    fontFamily: 'Asap, Roboto, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    height: 160,
    lineHeight: '20px',
    padding: '15px 20px',
    width: 240,
  },
  linkTitle: {
    fontFamily: "'Baloo 2'",
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 10,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.3px',
  },
  linkCategory: {
    fontFamily: "'Baloo 2'",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '14px',
  },
  linkDivider: {
    background: 'linear-gradient(90deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%)',
    height: 1,
    marginBottom: 8,
    marginTop: 10,
    width: '100%',
  },
  exploreLinkIcon: {
    marginBottom: 10,
    width: 50,
  },
  discoverBottomContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  discoverLinkIcon: {
    marginBottom: 10,
    width: 30,
  },
  blueBox: {
    margin: '20px 0',
    padding: '10px 15px 10px 40px',
    background: '#e9f3f3',
    borderRadius: '8px',
    flexDirection: 'column',
    fontFamily: 'Asap, Roboto, sans-serif',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '24px',
    position: 'relative',
    display: 'none',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      display: 'flex',
    },
  },
  blueBoxTitle: {
    color: '#1273a1',
    fontWeight: 600,
    marginBottom: '8px',
  },
  integrateContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 10,

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },
  blueBoxIcon: {
    position: 'absolute',
    left: '10px',
    color: '#1273a1',
  },
  integrateButton: {
    borderRadius: 10,
    boxShadow: BOX_SHADOW,
    fontSize: 19,
    height: 50,
    width: 240,

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      display: 'none',
    },
  },
  scheduleButton: {
    borderRadius: 10,
    boxShadow: BOX_SHADOW,
    fontSize: 19,
    height: 50,
    width: 240,
    display: 'none',
    textDecoration: 'none',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      display: 'block',
    },
  },
  integrateList: {
    fontFamily: 'Asap, Roboto, sans-serif',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '24px',
    margin: 0,

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      paddingLeft: '20px',
    },
  },
  normalText: {
    fontFamily: 'Asap, Roboto, sans-serif',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '24px',
    margin: 0,
    display: 'none',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      display: 'block',
    },
  },

  removeInMobile: {
    display: 'block',

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      display: 'none',
    },
  },
  resourcesIconContainer: {
    alignItems: 'center',
    display: 'flex',
    height: 50,
    marginBottom: 10,
  },
  dataTextGradient: {
    ...gradientTextStyle,
    backgroundColor: '#369BAC',
    backgroundImage: DATA_GRADIENT,
  },
  modelTextGradient: {
    ...gradientTextStyle,
    backgroundColor: '#6D44C3',
    backgroundImage: MODEL_GRADIENT,
  },
  llmSecureTextGradient: {
    ...gradientTextStyle,
    backgroundColor: '#2683C9',
    backgroundImage: LLM_SECURE_GRADIENT,
  },
  dataGradient: {
    background: DATA_GRADIENT,
  },
  modelGradient: {
    background: MODEL_GRADIENT,
  },
  blackGradient: {
    background: BLACK_GRADIENT,
  },
  llmSecureGradient: {
    background: LLM_SECURE_GRADIENT,
  },
}));
