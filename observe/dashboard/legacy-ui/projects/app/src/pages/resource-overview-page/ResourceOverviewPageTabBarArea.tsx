import { createTabBarComponents } from '@whylabs/observatory-lib';
import { DefaultTabBarArea } from 'components/layout/DefaultTabBarArea';
import OrganizationSelect from './components/OrganizationSelect';
import { DashboardPageTabs, useDashboardPageTab, useDashboardPageTabs } from './useDashboardPageTabs';

const { TabBarArea, TabLink, TabContent: TabContentComponent } = createTabBarComponents<DashboardPageTabs>();
export const TabContent = TabContentComponent;

export function ResourceOverviewPageTabBarArea(): JSX.Element {
  const tabs = useDashboardPageTabs();
  const activeTab = useDashboardPageTab();
  return (
    <DefaultTabBarArea preTitleChildren={<OrganizationSelect />} title="Project Dashboard">
      <TabBarArea activeTab={activeTab}>
        {tabs
          .filter(({ isHidden }) => !isHidden)
          .map((tab) => (
            <TabLink key={tab.value} {...tab} />
          ))}
      </TabBarArea>
    </DefaultTabBarArea>
  );
}
