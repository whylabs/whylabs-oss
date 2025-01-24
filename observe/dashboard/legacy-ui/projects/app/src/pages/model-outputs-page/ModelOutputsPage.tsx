import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import { GlobalTitleBar } from 'components/controls/widgets/GlobalTitleBar';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { memo } from 'react';
import { ModelOutputPageContentArea } from './ModelOutputPageContentArea';
import { ModelPageTabBarArea } from '../model-page/ModelPageTabBarArea';
import { AnalysisContextProvider } from '../shared/AnalysisContext';

export const ModelOutputsPage = memo(() => (
  <AnalysisContextProvider>
    <TitleAndContentTemplate
      BannerComponent={<GlobalBanner />}
      TitleBarAreaComponent={<GlobalTitleBar />}
      TabBarComponent={<ModelPageTabBarArea />}
      ContentAreaComponent={<ModelOutputPageContentArea />}
    />
  </AnalysisContextProvider>
));
