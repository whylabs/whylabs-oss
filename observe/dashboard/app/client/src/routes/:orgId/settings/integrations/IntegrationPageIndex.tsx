import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsTabs } from '~/components/design-system';
import { useFlags } from '~/hooks/useFlags';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';

import { getSettingsPageTitle } from '../utils/settingsPageUtils';
import getStartedBG from './assets/getStartedBG.svg';
import { IntegrationsLibrary } from './integration-tabs/IntegrationsLibrary';
import { LegacyIntegrationsLibrary } from './integration-tabs/LegacyIntegrationsLibrary';
import { QuickStartTab } from './integration-tabs/QuickStart';
import { IntegrationPageTexts } from './IntegrationPageTexts';

const PARAGRAPH_STYLE = {
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 1.25,

  '& > a': {
    color: Colors.chartPrimary,
  },
};
const GETTING_STARTED_PANEL_WIDTH = 370;

const useStyles = createStyles({
  root: {
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: Colors.brandSecondary100,
  },
  header: {
    display: 'grid',
    gridTemplateColumns: `1fr ${GETTING_STARTED_PANEL_WIDTH}px`,
    backgroundColor: Colors.brandSecondary100,
    position: 'relative',
    padding: `15px 20px 0 50px`,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 6,
    marginTop: 0,
    lineHeight: 1.33,
  },
  pageDescription: {
    ...PARAGRAPH_STYLE,
    margin: '0 0 18px 0',
    maxWidth: '78%',
  },
  gettingStartedPanel: {
    position: 'absolute',
    width: GETTING_STARTED_PANEL_WIDTH,
    height: 110,
    right: 20,
    top: 20,
    backgroundColor: Colors.white,
    backgroundImage: `url("${getStartedBG}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    borderRadius: 4,
    boxShadow: '0px 3px 10px 0px #0000001A',
    lineHeight: 1.43,
    padding: '10px 15px',

    '& > h2': {
      fontFamily: '"Baloo 2"',
      fontSize: 16,
      fontWeight: 600,
      margin: 0,
    },
  },

  gettingStartedPanelContentWrapper: {
    alignItems: 'center',
    display: 'flex',
    fontSize: '14px',
    gap: 20,
    '& > p': {
      margin: 0,
    },
  },
  tabsRoot: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabsList: {
    paddingLeft: 50,
    width: `100%`,
  },
  tabsPanel: {
    backgroundColor: Colors.white,
    width: '100%',
    display: 'flex',
    flex: 1,
    overflow: 'auto',
  },
});

export const IntegrationPageIndex = (): JSX.Element => {
  const flags = useFlags();
  const { classes } = useStyles();

  const { getOldStackUrl } = useNavLinkHandler();

  useSetHtmlTitle(getSettingsPageTitle('orgIdSettingsIntegrations'));

  const hasNetworkedIntegration = flags.networkedIntegration;

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <div>
          <h1 className={classes.pageTitle}>{IntegrationPageTexts.subHeaderTitle}</h1>
          <p className={classes.pageDescription}>{IntegrationPageTexts.subHeaderDescription}</p>
        </div>
        <div className={classes.gettingStartedPanel}>
          <h2>{IntegrationPageTexts.gettingStartedTitle}</h2>
          <div className={classes.gettingStartedPanelContentWrapper}>
            <a href={getOldStackUrl('/get-started')}>
              <WhyLabsButton color="gray" size="xs" variant="outline">
                {IntegrationPageTexts.gettingStartedLinkText}
              </WhyLabsButton>
            </a>
            <p>{IntegrationPageTexts.gettingStartedDescription}</p>
          </div>
        </div>
      </div>
      <WhyLabsTabs
        classNames={{
          root: classes.tabsRoot,
          tabsList: classes.tabsList,
          tabsPanel: classes.tabsPanel,
        }}
        tabs={[
          {
            children: <QuickStartTab />,
            label: IntegrationPageTexts.quickStartTabLabel,
          },
          {
            children: hasNetworkedIntegration ? <IntegrationsLibrary /> : <LegacyIntegrationsLibrary />,
            label: IntegrationPageTexts.integrationLibraryTabLabel,
          },
        ]}
      />
    </div>
  );
};
