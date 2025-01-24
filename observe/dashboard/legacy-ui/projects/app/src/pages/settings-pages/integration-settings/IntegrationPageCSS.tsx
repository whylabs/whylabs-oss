import { createStyles } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import getStartedBG from './assets/getStartedBG.svg';

const borderRadius = '4px';

const HORIZONTAL_PADDING = Spacings.pageLeftPaddingLarge;

const SELECT_CONTAINER_WIDTH = 450;
const ASIDE_WIDTH = 360;

const PARAGRAPH_STYLE = {
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 1.25,

  '& > a': {
    color: Colors.chartPrimary,
  },
};

const GETTING_STARTED_PANEL_WIDTH = 370;

export const useIntegrationSettingsStyles = createStyles(() => ({
  root: {
    overflow: 'auto',
    backgroundColor: Colors.brandSecondary100,
  },
  selectContainer: {
    marginTop: 0,
    width: '100%',
  },
  whylabsAlert: {
    width: '100%',
    marginBottom: '10px',
  },
  header: {
    display: 'grid',
    gridTemplateColumns: `1fr ${GETTING_STARTED_PANEL_WIDTH}px`,
    backgroundColor: Colors.brandSecondary100,
    position: 'relative',
    padding: `15px 20px 0 ${HORIZONTAL_PADDING}px`,
  },
  pageTitle: {
    fontFamily: 'Asap, Roboto, sans-serif',
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 6,
    marginTop: 0,
    lineHeight: 1.33,
  },
  pageDescription: {
    ...PARAGRAPH_STYLE,
    margin: '0 0 18px 0',
    maxWidth: '80%',
  },
  gettingStartedPanel: {
    position: 'absolute',
    width: GETTING_STARTED_PANEL_WIDTH,
    height: '110px',
    right: '20px',
    top: '20px',
    backgroundColor: Colors.white,
    backgroundImage: `url("${getStartedBG}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    borderRadius: 4,
    boxShadow: '0px 3px 10px 0px #0000001A',
    padding: '10px 15px',

    '& > h2': {
      fontFamily: "'Baloo 2'",
      fontSize: 16,
      fontWeight: 600,
      margin: 0,
    },
  },
  gettingStartedPanelContentWrapper: {
    alignItems: 'center',
    display: 'flex',
    gap: 20,
    '& > p': {
      margin: 0,
    },
  },
  flexRow: {
    alignItems: 'flex-end',
    display: 'flex',
    gap: 10,
    flexDirection: 'row',
  },
  selectLabel: {
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: 1.4,
    marginBottom: '4px',
    color: Colors.brandSecondary900,
  },
  selectResourceSelectorWrapper: {
    width: SELECT_CONTAINER_WIDTH,
    display: 'flex',
    flexDirection: 'column',
  },
  createApiTokenButton: {
    height: 36,
  },
  apiTokenInstructionsList: {
    fontFamily: 'Asap',
    fontSize: 13,
    fontWeight: 400,
    lineHeight: '20px',
    paddingLeft: 26,
  },
  colabButtonContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',

    '& > span': PARAGRAPH_STYLE,
  },
  openInColabButton: {
    background: 'linear-gradient(180deg, #5F5F5F 0%, #4D4D4D 100%)',
    height: 36,
  },
  tabsParent: {
    marginTop: -8,
    paddingLeft: HORIZONTAL_PADDING,
  },
  tabsPanel: {
    backgroundColor: Colors.white,
    width: '100%',
  },
  paragraph: {
    ...PARAGRAPH_STYLE,
    marginTop: 30,
  },
  tabRoot: {
    backgroundColor: Colors.white,
    display: 'flex',
    minHeight: '100%',
  },
  leftContent: {
    padding: `12px 0px 12px ${HORIZONTAL_PADDING}px`,
    maxWidth: 980,
    width: `calc(100% - ${ASIDE_WIDTH}px)`,
  },
  rightContent: {
    backgroundColor: Colors.white,
    borderRadius,
    minWidth: ASIDE_WIDTH,
    width: '100%',
  },
  installWhyLogsCodeBlockWrapper: {
    width: SELECT_CONTAINER_WIDTH,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  codeClassNameBig: { width: '100%' },
  codeBlock: {
    marginTop: 20,
    overflow: 'auto',
    display: 'flex',
    flexGrow: 1,
  },
  iconButton: {
    display: 'inline-block',
    padding: 0,
    paddingLeft: '10px',
    verticalAlign: 'middle',
  },
  whybotLink: {
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
}));
