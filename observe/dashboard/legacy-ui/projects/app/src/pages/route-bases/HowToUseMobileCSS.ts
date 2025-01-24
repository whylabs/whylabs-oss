import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import GetStartedWhyBotSVG from 'ui/get-started-why-bot-bg.svg';

const CONTENT_HORIZONTAL_PADDING = 53;

export const useHowToUseMobile = createStyles((theme) => ({
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
      minHeight: '110vh',
    },
  },
  header: {
    justifyContent: 'space-between',
    position: 'relative',
    display: 'flex',
    padding: '10px 10px 0 0',
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
  content: {
    padding: `0px ${CONTENT_HORIZONTAL_PADDING}px`,
    paddingTop: 0,
    position: 'relative',
    zIndex: 10,

    '& > section': {
      marginBottom: 20,
    },

    [`@media (max-width: ${theme.breakpoints.md})`]: {
      padding: '34px 20px',
    },
  },
  sectionTitle: {
    fontFamily: 'Asap, sans-serif',
    fontSize: 24,
    fontWeight: 400,
    marginBottom: 0,
    marginTop: 0,
  },
  linkTitle: {
    fontFamily: 'Asap, sans-serif',
    fontSize: 18,
    marginBottom: '0px',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.3px',
    display: 'block',
  },
  stepsList: {
    padding: '0 0 0 25px',
    fontFamily: 'Asap, sans-serif',
    fontSize: 16,
    marginTop: 10,
  },
  stepsImage: {
    width: '180px',
    aspectRatio: '0.46',
  },
  anchor: {
    color: Colors.chartPrimary,
    fontFamily: 'Asap, sans-serif',
  },
}));
