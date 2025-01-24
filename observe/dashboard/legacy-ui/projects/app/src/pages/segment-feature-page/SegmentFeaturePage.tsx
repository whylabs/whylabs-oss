import { GlobalTitleBar } from 'components/controls/widgets/GlobalTitleBar';
import { memo } from 'react';
import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import { SegmentPageTabBarArea } from 'pages/segment-page/SegmentPageTabBarArea';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { FeaturePageContentArea } from '../feature-page/FeaturePageContentArea';
import { AnalysisContextProvider } from '../shared/AnalysisContext';

export const SegmentFeaturePage = memo(() => {
  return (
    <AnalysisContextProvider>
      <TitleAndContentTemplate
        BannerComponent={<GlobalBanner />}
        TitleBarAreaComponent={<GlobalTitleBar />}
        TabBarComponent={<SegmentPageTabBarArea />}
        ContentAreaComponent={<FeaturePageContentArea />}
      />
    </AnalysisContextProvider>
  );
});
