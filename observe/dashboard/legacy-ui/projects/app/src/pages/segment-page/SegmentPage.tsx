import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { GlobalTitleBar } from 'components/controls/widgets/GlobalTitleBar';
import { memo } from 'react';
import { SegmentPageContentArea } from './SegmentPageContentArea';
import { SegmentPageTabBarArea } from './SegmentPageTabBarArea';

export const SegmentPage = memo(() => (
  <TitleAndContentTemplate
    BannerComponent={<GlobalBanner />}
    TitleBarAreaComponent={<GlobalTitleBar />}
    TabBarComponent={<SegmentPageTabBarArea />}
    ContentAreaComponent={<SegmentPageContentArea />}
  />
));
