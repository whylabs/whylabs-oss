import { useCallback, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { createStyles, makeStyles, Button, Tab, Tabs } from '@material-ui/core';
import FilterListIcon from '@material-ui/icons/FilterList';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Colors } from '@whylabs/observatory-lib';
import { PageType, Pages, RelativePages } from 'pages/page-types/pageType';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import {
  ANOMALIES_FEED_TAB,
  MONITOR_RUNS_TAB,
  CONFIG_INVESTIGATOR_TAB,
  MONITORS_TAB,
  PRESETS_TAB,
} from 'constants/analyticsIds';
import { MonitorRunsPanel } from 'pages/model-page/model-runs-table/MonitorRunsPanel';
import { WhyLabsModal } from 'components/design-system';
import { Group } from '@mantine/core';
import { CTACard } from 'components/call-to-action-card/CTACard';
import WhyLabsSubmitButton from 'components/design-system/button/WhyLabsSubmitButton';
import { ModelAnomaliesTable } from 'pages/model-page/model-alert-table/ModelAnomaliesTable';
import { PresetsCardView } from './preset-tab/PresetsCardView';
import MonitorsTableView from './monitors-tab/MonitorsTableView';
import MonitorConfigInvestigator from './MonitorConfigInvestigator';

const viewControllerRowHeight = 44;
const viewControllerItemHeight = 30;
const useStyles = makeStyles(() =>
  createStyles({
    modalCloseButton: {
      borderColor: Colors.brandSecondary700,
      '& .MuiButton-label': {
        color: Colors.secondaryLight1000,
        fontSize: '13px',
        fontWeight: 600,
      },
    },
    pageRoot: {
      flex: '1 1 auto',
      maxHeight: '100%',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
    },
    contentRoot: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      overflowX: 'hidden',
    },
    viewSelectorRow: {
      borderBottom: `1px solid ${Colors.brandSecondary200}`,
      backgroundColor: Colors.white,
      display: 'flex',
      justifyContent: 'space-between',
    },
    viewSelectorRowRight: {
      display: 'flex',
      alignItems: 'center',
      '& > *': {
        marginRight: 10,
      },
    },
    tabs: {
      paddingLeft: 16,
      paddingRight: 16,
      minHeight: viewControllerRowHeight,
    },
    singleTabRoot: {
      minWidth: 'auto',
    },
    singleTab: {
      minHeight: viewControllerRowHeight,
    },
    label: {
      color: Colors.brandSecondary900,
      fontFamily: 'Asap',
      fontStyle: 'normal',
      fontWeight: 600,
      fontSize: '14px',
      marginRight: 12,
    },
    customMonitorBtn: {
      display: 'inline-block',
      background: 'linear-gradient(94.15deg, #EA5B4F -10.2%, #F9C452 102.94%)',
      maxHeight: viewControllerItemHeight,
      padding: '5px 15px',
      color: Colors.white,
      textDecoration: 'none',
      borderRadius: 4,
      fontSize: 14,
      lineHeight: '20px',
      fontFamily: 'Asap',
    },
    sortBtnRoot: {
      minWidth: viewControllerItemHeight,
    },
    sortBtn: {
      width: viewControllerItemHeight,
      maxWidth: viewControllerItemHeight,
      height: viewControllerItemHeight,
      padding: 0,
      backgroundColor: Colors.white,
    },
    sortIcon: {
      color: Colors.brandSecondary700,
      width: 15,
    },
    singleTabSelected: {
      color: Colors.brandPrimary900,
      borderBottomColor: Colors.brandPrimary900,
      fontWeight: 600,
    },
  }),
);

const SORT_BUTTON_CONNECTED = false;

interface MonitorManagerProps {
  userCanManageMonitors: boolean;
}

const MonitorManager: React.FC<MonitorManagerProps> = ({ userCanManageMonitors }) => {
  const styles = useStyles();
  const { modelId, monitorId, pageType } = usePageTypeWithParams();

  const { getNavUrl, handleNavigation } = useNavLinkHandler();
  const [creationModalOpened, setCreationModalOpened] = useState(false);

  const monitorsLink = getNavUrl({ page: 'monitorManager', modelId });
  const anomaliesFeedLink = getNavUrl({ page: 'monitorManager', modelId, monitorManager: { path: 'anomalies-feed' } });
  const monitorRunsLink = getNavUrl({ page: 'monitorManager', modelId, monitorManager: { path: 'monitor-runs' } });
  const configInvestigatorLink = getNavUrl({
    page: 'monitorManager',
    modelId,
    monitorManager: { path: 'config-investigator' },
  });
  const presetsLink = getNavUrl({ page: 'monitorManager', modelId, monitorManager: { path: 'presets' } });
  const navToUiCreation = () => {
    handleNavigation({
      page: 'monitorManager',
      modelId,
      monitorManager: { path: 'customize-ui' },
    });
  };

  const navToJsonCreation = () => {
    handleNavigation({
      page: 'monitorManager',
      modelId,
      monitorManager: { path: 'customize-json', id: 'no-preset-selected' },
    });
  };

  const customConfigInvestigatorLink = getNavUrl({
    page: 'monitorManager',
    modelId,
    monitorManager: { path: 'config-investigator', id: monitorId },
  });
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const renderSortButton = () => {
    return (
      <Button
        variant="outlined"
        className={styles.sortBtn}
        classes={{ root: styles.sortBtnRoot }}
        onClick={() => {
          /** */
        }}
      >
        <FilterListIcon className={styles.sortIcon} />
      </Button>
    );
  };

  const monitorManager = useCallback(
    () => <MonitorsTableView userCanManageMonitors={userCanManageMonitors} />,
    [userCanManageMonitors],
  );

  const monitorAnomaliesFeed = useCallback(
    () => <ModelAnomaliesTable userCanManageMonitors={userCanManageMonitors} />,
    [userCanManageMonitors],
  );

  const monitorMonitorRuns = useCallback(
    () => <MonitorRunsPanel userCanManageMonitors={userCanManageMonitors} />,
    [userCanManageMonitors],
  );

  const monitorManagerPresets = useCallback(
    () => (
      <PresetsCardView
        isFirstLoad={isFirstLoad}
        setIsFirstLoad={setIsFirstLoad}
        userCanManageMonitors={userCanManageMonitors}
      />
    ),
    [isFirstLoad, userCanManageMonitors],
  );

  const configInvestigator = useCallback(
    () => <MonitorConfigInvestigator userCanEdit={userCanManageMonitors} />,
    [userCanManageMonitors],
  );

  // We use this converter to ensure that our tab values are fixed to pageType values
  // which prevents setting a 'value' that doesn't exist. If the value of the
  // Tabs object is set to one that has no tab, the indicator disappears,
  // even if there is a valid link selected with included panel content.
  const asPageType = (possiblePage: string): PageType => {
    if (possiblePage in Pages) {
      return possiblePage as PageType;
    }
    return 'monitorManager';
  };

  return (
    <>
      <div className={styles.pageRoot}>
        <div className={styles.viewSelectorRow}>
          <Tabs indicatorColor="primary" className={styles.tabs} value={`${pageType}`}>
            <Tab
              label="Monitors"
              classes={{ root: styles.singleTabRoot, selected: styles.singleTabSelected }}
              className={styles.singleTab}
              value={asPageType('monitorManager')}
              to={monitorsLink}
              component={Link}
              id={MONITORS_TAB}
            />
            <Tab
              label="Anomalies Feed"
              classes={{ root: styles.singleTabRoot, selected: styles.singleTabSelected }}
              className={styles.singleTab}
              value={asPageType('monitorManagerAnomaliesFeed')}
              to={anomaliesFeedLink}
              component={Link}
              id={ANOMALIES_FEED_TAB}
            />
            <Tab
              label="Monitor Runs"
              classes={{ root: styles.singleTabRoot, selected: styles.singleTabSelected }}
              className={styles.singleTab}
              value={asPageType('monitorManagerMonitorRuns')}
              to={monitorRunsLink}
              component={Link}
              id={MONITOR_RUNS_TAB}
            />
            <Tab
              label="Presets"
              classes={{ root: styles.singleTabRoot, selected: styles.singleTabSelected }}
              className={styles.singleTab}
              value={asPageType('monitorManagerPresets')}
              to={presetsLink}
              component={Link}
              id={PRESETS_TAB}
            />

            <Tab
              label="Config Investigator"
              classes={{ root: styles.singleTabRoot, selected: styles.singleTabSelected }}
              className={styles.singleTab}
              value={
                monitorId
                  ? asPageType('monitorManagerCustomConfigInvestigator')
                  : asPageType('monitorManagerConfigInvestigator')
              }
              to={monitorId ? customConfigInvestigatorLink : configInvestigatorLink}
              component={Link}
              id={CONFIG_INVESTIGATOR_TAB}
            />
          </Tabs>
          <div className={styles.viewSelectorRowRight}>
            <WhyLabsSubmitButton size="xs" onClick={() => setCreationModalOpened(true)}>
              New custom monitor
            </WhyLabsSubmitButton>
            {SORT_BUTTON_CONNECTED && renderSortButton()}
          </div>
        </div>
        <div className={styles.contentRoot}>
          <Routes>
            <Route index element={monitorManager()} />
            <Route path={RelativePages.monitorManagerAnomaliesFeed} element={monitorAnomaliesFeed()} />
            <Route path={RelativePages.monitorManagerMonitorRuns} element={monitorMonitorRuns()} />
            <Route path={RelativePages.monitorManagerConfigInvestigator}>
              <Route index element={configInvestigator()} />
              <Route path={RelativePages.monitorManagerCustomConfigInvestigator} element={configInvestigator()} />
            </Route>
            <Route path={RelativePages.monitorManagerPresets} element={monitorManagerPresets()} />
          </Routes>
        </div>
      </div>
      <WhyLabsModal
        title="Select a monitor setup mode:"
        opened={creationModalOpened}
        onClose={() => setCreationModalOpened(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <CTACard
            title="UI builder"
            description="Use the WhyLabs monitor builder to create a custom monitor."
            onClick={navToUiCreation}
          />
          <CTACard
            title="JSON configuration"
            description="Use the WhyLabs JSON Editor to create an advanced configuration."
            onClick={navToJsonCreation}
          />
          <Group position="right">
            <Button
              className={styles.modalCloseButton}
              variant="outlined"
              onClick={() => setCreationModalOpened(false)}
            >
              Cancel
            </Button>
          </Group>
        </div>
      </WhyLabsModal>
    </>
  );
};

export default MonitorManager;
