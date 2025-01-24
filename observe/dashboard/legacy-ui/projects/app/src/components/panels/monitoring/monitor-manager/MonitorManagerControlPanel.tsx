import { useEffect, useState, memo } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { RelativePages } from 'pages/page-types/pageType';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { Colors } from '@whylabs/observatory-lib';
import SectionErrorFallback from 'pages/errors/boundaries/SectionErrorFallback';
import useTypographyStyles from 'styles/Typography';
import { useUserContext } from 'hooks/useUserContext';
import { canManageMonitors } from 'utils/permissionUtils';
import { createStyles } from '@mantine/core';
import MonitorManager from './MonitorManager';
import MonitorManagerBanner from './monitors-tab/components/MonitorManagerBanner';
import CustomMonitorManager from './custom-monitor/CustomMonitorManager';
import { CustomMonitorJsonConfig } from './custom-monitor/MonitorJsonConfig/CustomMonitorJsonConfig';

const useStyles = createStyles({
  loader: {
    transform: 'unset',
  },
  commonSize: {
    fontSize: 14,
  },
  block: {
    position: 'absolute',
    background: Colors.black,
    opacity: 0.1,
    zIndex: 100,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  bannerText: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
});

const BANNER_CLOSE_KEY = 'IS_MM_BANNER_CLOSED';
const MonitorManagerControlPanel: React.FC = memo(() => {
  const { classes: styles, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();
  const { modelId, pageType } = usePageTypeWithParams();
  const { getNavUrl } = useNavLinkHandler();
  const newMonitorUrl = getNavUrl({ page: 'monitorManager', modelId, monitorManager: { path: 'customize-ui' } });
  const monitorsTabUrl = getNavUrl({ page: 'monitorManager', modelId });
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const userCanManageMonitors = canManageMonitors(user);
  const managerForRole = () => <MonitorManager userCanManageMonitors={userCanManageMonitors} />;
  const [isBannerOpen, setIsBannerOpen] = useState(
    userCanManageMonitors &&
      !localStorage.getItem(BANNER_CLOSE_KEY) &&
      (pageType === 'monitorManager' || pageType === 'monitorManagerPresets'),
  );
  useEffect(() => {
    const localStatusOpen = localStorage.getItem(BANNER_CLOSE_KEY) === 'false';
    if (
      (pageType === 'monitorManager' || pageType === 'monitorManagerPresets') &&
      userCanManageMonitors &&
      localStatusOpen
    ) {
      setIsBannerOpen(true);
    } else if (
      [
        'monitorManagerCustomize',
        'monitorManagerCustomizeExisting',
        'monitorManagerCustomizeJson',
        'monitorManagerCustomizeJsonPreset',
      ].includes(pageType)
    ) {
      setIsBannerOpen(false);
    }
  }, [pageType, userCanManageMonitors]);

  return (
    <>
      <ErrorBoundary FallbackComponent={SectionErrorFallback}>
        {isBannerOpen && (
          <MonitorManagerBanner
            onCloseClick={() => {
              localStorage.setItem(BANNER_CLOSE_KEY, 'true');
              setIsBannerOpen(false);
            }}
            content={
              <>
                Enable monitors from presets with a single click! Alternatively,{' '}
                <Link className={typography.link} to={newMonitorUrl}>
                  build custom monitors
                </Link>{' '}
                in a few simple steps. Manage enabled monitors from the{' '}
                <Link className={typography.link} to={monitorsTabUrl}>
                  Monitors tab
                </Link>
              </>
            }
            classes={{ text: cx(styles.bannerText, styles.commonSize) }}
          />
        )}

        <Routes>
          <Route path={`${RelativePages.monitorManagerCustomize}/*`}>
            <Route index element={<CustomMonitorManager />} />
            <Route path={RelativePages.monitorManagerCustomizeExisting} element={<CustomMonitorManager />} />
          </Route>
          <Route path={`${RelativePages.monitorManagerCustomizeJson}/*`}>
            <Route index element={<CustomMonitorJsonConfig />} />
            <Route path={RelativePages.monitorManagerCustomizeJsonPreset} element={<CustomMonitorJsonConfig />} />
          </Route>
          <Route path="*" element={managerForRole()} />
        </Routes>
      </ErrorBoundary>
    </>
  );
});

export default MonitorManagerControlPanel;
