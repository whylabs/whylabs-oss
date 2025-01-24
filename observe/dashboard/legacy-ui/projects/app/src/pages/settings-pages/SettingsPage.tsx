import { GlobalTitleBar } from 'components/controls/widgets/GlobalTitleBar';
import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { memo } from 'react';
import SettingsPageContentArea, { SettingsPageStartingContent } from './SettingsPageContentArea';
import SettingsTabBarArea, { SettingsTabBarAreaBlank } from './SettingsTabBarArea';

export const SettingsPageBase = memo(() => (
  <TitleAndContentTemplate
    BannerComponent={<GlobalBanner />}
    TitleBarAreaComponent={<GlobalTitleBar />}
    TabBarComponent={<SettingsTabBarAreaBlank />}
    ContentAreaComponent={<SettingsPageStartingContent />}
  />
));

export const SettingsPage = memo(() => (
  <TitleAndContentTemplate
    BannerComponent={<GlobalBanner />}
    TitleBarAreaComponent={<GlobalTitleBar />}
    TabBarComponent={<SettingsTabBarArea />}
    ContentAreaComponent={<SettingsPageContentArea />}
  />
));
