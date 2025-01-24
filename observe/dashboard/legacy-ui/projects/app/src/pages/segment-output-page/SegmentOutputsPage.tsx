import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { GlobalTitleBar } from 'components/controls/widgets/GlobalTitleBar';
import { memo } from 'react';
import { ModelOutputPageContentArea } from '../model-outputs-page/ModelOutputPageContentArea';
import { SegmentPageTabBarArea } from '../segment-page/SegmentPageTabBarArea';
import { AnalysisContextProvider } from '../shared/AnalysisContext';

export const SegmentOutputsPage = memo(() => (
  <AnalysisContextProvider>
    <TitleAndContentTemplate
      BannerComponent={<GlobalBanner />}
      TitleBarAreaComponent={<GlobalTitleBar />}
      TabBarComponent={<SegmentPageTabBarArea />}
      ContentAreaComponent={<ModelOutputPageContentArea />}
    />
  </AnalysisContextProvider>
));
