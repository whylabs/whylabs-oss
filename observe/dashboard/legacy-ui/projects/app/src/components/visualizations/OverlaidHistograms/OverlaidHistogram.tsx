import { HistogramDomain } from 'components/visualizations/inline-histogram/histogramUtils';
import { Skeleton } from '@material-ui/lab';
import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { useProfileFeaturePanelStyles } from 'components/panels/profiles-feature-panel/ProfilesFeaturePanelCSS';
import { UnifiedHistogramWithMetadata } from './types';
import { OverlaidHistogramControlGroup } from './OverlaidHistogramControlGroup';

interface OverlaidHistogramsProps {
  graphHeight: number;
  graphWidth: number;
  graphVerticalBuffer: number;
  graphHorizontalBuffer: number;
  histograms: UnifiedHistogramWithMetadata[] | undefined;
  histogramDomain: HistogramDomain | undefined;
  histogramRange: HistogramDomain | undefined;
  loading: boolean;
  noDataImageUrl?: string;
  compactView?: boolean;
}

type StylesProps = Pick<
  OverlaidHistogramsProps,
  'graphHeight' | 'graphWidth' | 'graphVerticalBuffer' | 'graphHorizontalBuffer'
>;

const useStyles = createStyles(
  (_, { graphHeight, graphWidth, graphVerticalBuffer, graphHorizontalBuffer }: StylesProps) => ({
    imageHolder: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: graphHeight,
      width: graphWidth,
      padding: `${graphVerticalBuffer}px ${graphHorizontalBuffer}px`,
    },
  }),
);

const OverlaidHistograms: React.FC<OverlaidHistogramsProps> = ({
  graphHeight,
  graphWidth,
  graphHorizontalBuffer,
  graphVerticalBuffer,
  histograms,
  histogramDomain,
  histogramRange,
  loading,
  noDataImageUrl,
  compactView = false,
}) => {
  const { classes } = useStyles({ graphHeight, graphWidth, graphVerticalBuffer, graphHorizontalBuffer });
  const { classes: profileStyles } = useProfileFeaturePanelStyles();

  if (loading)
    return (
      <Skeleton style={{ transform: 'unset', margin: '10px 0px' }} height={graphHeight} width="100%" variant="text" />
    );

  // Try to find at least one histgoram with data.
  const firstHistogramWithData = histograms?.find((histogram) => !!histogram.data);

  const renderNoDataImage = () => {
    return (
      <div className={classes.imageHolder}>
        <img src={noDataImageUrl} alt="Histogram plots not available" />
      </div>
    );
  };

  const renderNoDataText = () => (
    <WhyLabsText inherit className={profileStyles.noDataText}>
      Histogram plots not available
    </WhyLabsText>
  );

  if (
    !firstHistogramWithData || // If we can't find at least one histogram with data display error
    !firstHistogramWithData.data ||
    !histograms ||
    !histogramDomain ||
    !histogramRange ||
    !histogramDomain.isValid ||
    !histogramRange.isValid
  ) {
    return noDataImageUrl ? renderNoDataImage() : renderNoDataText();
  }

  return (
    <OverlaidHistogramControlGroup
      unifiedHistograms={histograms}
      allUnifiedBins={firstHistogramWithData.data.bins}
      graphHeight={graphHeight}
      graphWidth={graphWidth}
      graphHorizontalBuffer={graphHorizontalBuffer}
      graphVerticalBuffer={graphVerticalBuffer}
      histogramDomain={histogramDomain}
      histogramRange={histogramRange}
      compactView={compactView}
    />
  );
};

export default OverlaidHistograms;
