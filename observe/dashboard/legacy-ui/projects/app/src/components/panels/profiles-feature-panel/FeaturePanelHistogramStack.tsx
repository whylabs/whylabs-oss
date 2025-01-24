import { HistogramDomain } from 'components/visualizations/inline-histogram/histogramUtils';
import { useResizeObserver } from '@mantine/hooks';
import { Group, Radio } from '@mantine/core';
import { useProfileFeaturePanelStyles } from './ProfilesFeaturePanelCSS';
import { UnifiedHistogramWithMetadata } from '../../visualizations/OverlaidHistograms/types';
import OverlaidHistograms from '../../visualizations/OverlaidHistograms/OverlaidHistogram';

interface FeaturePanelHistogramStackProps {
  amountOfBins: number;
  setAmountOfBins: (amount: number) => void;
  unifiedBinsLoading: boolean;
  unifiedCommonYRange: HistogramDomain | null;
  commonXDomain: HistogramDomain | null;
  unifiedHistograms: UnifiedHistogramWithMetadata[] | undefined;
}

const FeaturePanelHistogramStack: React.FC<FeaturePanelHistogramStackProps> = ({
  amountOfBins,
  setAmountOfBins,
  unifiedBinsLoading,
  unifiedCommonYRange,
  commonXDomain,
  unifiedHistograms,
}) => {
  const [ref, rect] = useResizeObserver();
  const { classes } = useProfileFeaturePanelStyles();

  function displayHistogramCharts(width: number) {
    return (
      <OverlaidHistograms
        loading={unifiedBinsLoading}
        histograms={unifiedHistograms}
        histogramDomain={commonXDomain ?? undefined}
        histogramRange={unifiedCommonYRange ?? undefined}
        graphHeight={300}
        graphWidth={width}
        graphVerticalBuffer={20}
        graphHorizontalBuffer={60}
      />
    );
  }

  function renderUpdatedBinsControl() {
    return (
      <>
        <span className={classes.sectionLabel}>Histogram plots</span>
        <Radio.Group value={`${amountOfBins}`} onChange={(value) => setAmountOfBins(parseInt(value, 10))}>
          <Group>
            <Radio color="teal.7" value="30" label="30 bins" />
            <Radio color="teal.7" value="60" label="60 bins" />
            <Radio color="teal.7" value="90" label="90 bins" />
          </Group>
        </Radio.Group>
      </>
    );
  }

  return (
    <div style={{ flex: '1 1 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {renderUpdatedBinsControl()}
      </div>
      <div className={classes.graphContainer} ref={ref}>
        {displayHistogramCharts(rect.width)}
      </div>
    </div>
  );
};

export default FeaturePanelHistogramStack;
