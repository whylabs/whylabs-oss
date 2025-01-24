import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { createTabBarComponents } from '~/components/design-system';
import { SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { useFlags } from '~/hooks/useFlags';
import { SettingsPath } from '~/hooks/useWhylabsNavigation';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { JSX } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useSettingsRootViewModel } from './useSettingsRootViewModel';

const { TabBarArea, TabLink, TabContent: TabContentComponent } = createTabBarComponents<SettingsPath>();
export const TabContent = TabContentComponent;

const useStyles = createStyles({
  root: {
    background: Colors.white,
    height: '100%',
  },
  embeddedRoot: {
    height: '100vh',
  },
  tabContainer: {
    display: 'flex',
    justifyContent: 'end',
    width: '100%',
  },
});

export const SettingsRoot = (): JSX.Element => {
  const { classes, cx } = useStyles();
  const flags = useFlags();
  const location = useLocation();

  const viewModel = useSettingsRootViewModel();

  const isSettingsFlagEnabled = flags.settingsPage;

  const canRender = (() => {
    // Allow any settings page to render if the settings flag is enabled
    if (isSettingsFlagEnabled) return true;

    // Allow the resource management page to render if the resource tagging flag is enabled
    const isResourceManagementPage = location.pathname.includes(AppRoutePaths.orgIdSettingsResourceManagement);
    if (flags.resourceTagging && isResourceManagementPage) return true;

    return false;
  })();

  if (!canRender) return <></>;

  const { activeTab, breadCrumbs, isIndexPage, tabs } = viewModel;

  const pageContent = <Outlet />;

  // Hide the header if the page is embedded, or the settings flag is disabled
  if (viewModel.isEmbedded || !isSettingsFlagEnabled) {
    return <div className={cx(classes.root, classes.embeddedRoot)}>{pageContent}</div>;
  }

  const secondaryHeader = (() => {
    // Don't show the tab bar if we're on the settings index page
    if (isIndexPage) return <></>;

    return (
      <TabBarArea activeTab={activeTab}>
        {tabs.map((tab) => (
          <TabLink key={tab.value} id={tab.value} {...tab} />
        ))}
      </TabBarArea>
    );
  })();

  return (
    <SinglePageLayout
      breadCrumbs={breadCrumbs}
      classNames={{
        main: classes.root,
      }}
      headerFields={[
        {
          data: viewModel.organizationsList,
          label: 'Select organization',
          onChange: viewModel.onChangeOrganization,
          size: 'sm',
          type: 'select',
          value: viewModel.orgId,
        },
      ]}
      secondaryHeader={secondaryHeader}
    >
      {pageContent}
    </SinglePageLayout>
  );
};
