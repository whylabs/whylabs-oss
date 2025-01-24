import { GlobalTitleBar } from 'components/controls/widgets/GlobalTitleBar';
import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { ModelPageContentArea } from './ModelPageContentArea';
import { ModelPageTabBarArea } from './ModelPageTabBarArea';

export const ModelPage = (): JSX.Element => (
  <TitleAndContentTemplate
    BannerComponent={<GlobalBanner />}
    TitleBarAreaComponent={<GlobalTitleBar />}
    TabBarComponent={<ModelPageTabBarArea />}
    ContentAreaComponent={<ModelPageContentArea />}
  />
);
