import { useDebouncedState, useResizeObserver } from '@mantine/hooks';
import { WhyLabsText } from 'components/design-system';
import { FeaturePanelHCPlaceholderBoxPlot } from 'components/visualizations/box-plots/FeaturePanelHCPlaceholderBoxPlot';
import { BoxPlotData } from 'components/visualizations/box-plots/types';
import { HistogramDomain } from 'components/visualizations/inline-histogram/histogramUtils';
import { UnifiedHistogramWithMetadata } from 'components/visualizations/OverlaidHistograms/types';
import { Center, Loader } from '@mantine/core';
import { useEffect } from 'react';
import FeaturePanelHistogramStack from './FeaturePanelHistogramStack';
import { ProfilesHistogramTableController } from './ProfilesHistogramTableController';
import { useProfileFeaturePanelStyles } from './ProfilesFeaturePanelCSS';

interface HistogramTabComponentProps {
  amountOfBins: number;
  setAmountOfBins: (amount: number) => void;
  unifiedBinsLoading: boolean;
  unifiedCommonYRange: HistogramDomain | null;
  commonXDomain: HistogramDomain | null;
  unifiedHistograms: UnifiedHistogramWithMetadata[] | undefined;
  boxPlotData: BoxPlotData[] | undefined;
  loading: boolean;
}

const BOXPLOT_DEFAULT_HEIGHT = 200;
const BOXPLOT_BASE_HEIGHT = 100;
const BOXPLOT_PER_PROFILE_HEIGHT = 100;
export function HistogramTabComponent({
  amountOfBins,
  setAmountOfBins,
  unifiedBinsLoading,
  unifiedCommonYRange,
  commonXDomain,
  unifiedHistograms,
  boxPlotData,
  loading,
}: HistogramTabComponentProps): JSX.Element {
  const { classes } = useProfileFeaturePanelStyles();
  const [ref, rect] = useResizeObserver();
  const [noBlinkLoading, setNoBlinkLoading] = useDebouncedState(loading, 400, { leading: true });

  useEffect(() => {
    setNoBlinkLoading(loading || unifiedBinsLoading);
  }, [loading, unifiedBinsLoading, setNoBlinkLoading]);
  // This line guards against boxPlotData being undefined or empty, so the ! is safe
  // in the plot component -- it is added only to satisfy TypeScript.
  const hasBoxPlotData = !!boxPlotData && boxPlotData.length > 0;
  const hasHistogramData = !!unifiedHistograms && unifiedHistograms.length > 0;
  const hasNoData = !hasBoxPlotData && !hasHistogramData && !unifiedBinsLoading;

  const renderNotAvailableText = (element: string) => {
    return (
      <WhyLabsText inherit className={classes.noDataText}>
        {`${element} data not available`}
      </WhyLabsText>
    );
  };
  const renderBoxPlots = () => {
    if (hasNoData) {
      return null;
    }
    const boxPlotCount = boxPlotData?.length ?? 0;
    const graphHeight = BOXPLOT_BASE_HEIGHT + BOXPLOT_PER_PROFILE_HEIGHT * boxPlotCount || BOXPLOT_DEFAULT_HEIGHT;
    return (
      <div className={classes.columnContainer}>
        <WhyLabsText inherit className={classes.sectionLabel}>
          Boxplots
        </WhyLabsText>
        {hasBoxPlotData ? (
          <div ref={ref}>
            <FeaturePanelHCPlaceholderBoxPlot
              graphHeight={graphHeight}
              graphWidth={rect.width}
              boxPlotData={boxPlotData ?? []}
              domain={commonXDomain}
            />
          </div>
        ) : (
          renderNotAvailableText('Boxplot')
        )}
      </div>
    );
  };

  const renderLoading = () => {
    return (
      <Center>
        <Loader className={classes.loader} />
      </Center>
    );
  };

  const renderContent = () => {
    return (
      <>
        {(hasHistogramData || unifiedBinsLoading) && (
          <FeaturePanelHistogramStack
            amountOfBins={amountOfBins}
            setAmountOfBins={setAmountOfBins}
            unifiedBinsLoading={unifiedBinsLoading}
            unifiedCommonYRange={unifiedCommonYRange}
            commonXDomain={commonXDomain}
            unifiedHistograms={unifiedHistograms}
          />
        )}
        {renderBoxPlots()}
        <div className={classes.columnContainer}>
          <WhyLabsText inherit className={classes.sectionLabel}>
            Histogram data
          </WhyLabsText>
          {hasHistogramData ? (
            <ProfilesHistogramTableController unifiedHistograms={unifiedHistograms} />
          ) : (
            renderNotAvailableText('Histogram')
          )}
        </div>
      </>
    );
  };

  return (
    <div className={classes.tabRoot}>{noBlinkLoading || unifiedBinsLoading ? renderLoading() : renderContent()}</div>
  );
}
