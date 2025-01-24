import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { GlobalTitleBar } from 'components/controls/widgets/GlobalTitleBar';
import { ModelPageTabBarArea } from 'pages/model-page/ModelPageTabBarArea';
import { memo } from 'react';
import { FeaturePageContentArea } from './FeaturePageContentArea';
import { AnalysisContextProvider } from '../shared/AnalysisContext';

export const FeaturePage = memo(() => {
  return (
    <AnalysisContextProvider>
      <TitleAndContentTemplate
        BannerComponent={<GlobalBanner />}
        TitleBarAreaComponent={<GlobalTitleBar />}
        TabBarComponent={<ModelPageTabBarArea />}
        ContentAreaComponent={<FeaturePageContentArea />}
      />
    </AnalysisContextProvider>
  );
});
