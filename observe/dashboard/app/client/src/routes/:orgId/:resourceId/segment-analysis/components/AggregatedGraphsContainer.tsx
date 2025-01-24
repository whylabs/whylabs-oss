import { createStyles } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { SkeletonGroup, WhyLabsBadge, WhyLabsText } from '~/components/design-system';
import ExternalLink from '~/components/link/ExternalLink';
import { SegmentKeyAggregatedGraph } from '~/routes/:orgId/:resourceId/segment-analysis/components/SegmentKeyAggregatedGraph';
import { useAggregatedGraphsContainerViewModel } from '~/routes/:orgId/:resourceId/segment-analysis/useAggregatedGraphsContainerViewModel';
import { useResourceSegmentAnalysisViewModel } from '~/routes/:orgId/:resourceId/segment-analysis/useResourceSegmentAnalysisViewModel';
import { CommonGraphProps } from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import { SimpleDateRange } from '~/types/dateTypes';
import { arrayOfLength } from '~/utils/arrayUtils';
import { getUTCDateRangeString, openEndDateRangeTransformer } from '~/utils/dateRangeUtils';
import { ReactElement } from 'react';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    borderRadius: 4,
    border: `2px solid ${Colors.brandSecondary200}`,
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    columnGap: 16,
    rowGap: 6,
    alignItems: 'center',
    padding: '8px 15px 8px 15px',
    minHeight: 40,
    flexWrap: 'wrap',
    background: Colors.white,
  },
  headerTittle: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    lineHeight: 1,
    fontWeight: 500,
  },
  headerBadges: {
    fontSize: 13,
    fontWeight: 400,
    height: 24,
  },
  cardLoadingContainer: {
    background: Colors.white,
    padding: '8px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  emptyStateCard: {
    width: '100%',
    height: '200px',
    background: 'white',
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: Colors.secondaryLight1000,
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '100%',
    color: Colors.linkColor,
  },
});
type AggregatedGraphsContainerProps = CommonGraphProps & {
  pageViewModel: ReturnType<typeof useResourceSegmentAnalysisViewModel>;
};
export const AggregatedGraphsContainer = ({ pageViewModel, ...rest }: AggregatedGraphsContainerProps): ReactElement => {
  const { classes } = useStyles();
  const { globalDateRange, comparisonDateRange, meta } = pageViewModel;
  const {
    segmentInfo: { segmentKeys, isLoadingSegmentKeys },
  } = useAggregatedGraphsContainerViewModel({ meta });
  const renderDateRangeBadge = (dateRange: SimpleDateRange, color: string) => {
    const endOpenDateRange = openEndDateRangeTransformer(dateRange);
    return (
      <WhyLabsBadge
        size="md"
        radius="xl"
        className={classes.headerBadges}
        customBackground={color}
        customColor={Colors.secondaryLight1000}
      >
        {getUTCDateRangeString(endOpenDateRange.from, endOpenDateRange.to, pageViewModel.meta.batchFrequency)}
      </WhyLabsBadge>
    );
  };

  const renderGraphsLoadingState = () => {
    return arrayOfLength(3).map((i) => (
      <div className={classes.cardLoadingContainer} key={`loading-state-card-${i}`}>
        <SkeletonGroup count={1} height={30} />
        <SkeletonGroup count={1} height={220} />
      </div>
    ));
  };

  const noSegmentsEmptyState = () => {
    return (
      <div className={classes.emptyStateCard}>
        <WhyLabsText className={classes.emptyStateText}>
          No segments to show. Learn how to create segments in this{' '}
          <ExternalLink to="segmentsDocumentation" className={classes.link}>
            example notebook
          </ExternalLink>
          <IconExternalLink size={18} />
        </WhyLabsText>
      </div>
    );
  };

  const renderGraphs = () => {
    if (isLoadingSegmentKeys) {
      return renderGraphsLoadingState();
    }
    if (!segmentKeys?.length) return noSegmentsEmptyState();
    return segmentKeys.map((key) => {
      return <SegmentKeyAggregatedGraph key={key} segmentKey={key} pageViewModel={pageViewModel} {...rest} />;
    });
  };

  return (
    <div className={classes.root}>
      <div className={classes.sectionHeader}>
        <WhyLabsText className={classes.headerTittle}>Segmented performance</WhyLabsText>
        {renderDateRangeBadge(globalDateRange, Colors.lightBlue)}
        {comparisonDateRange && renderDateRangeBadge(comparisonDateRange, Colors.lightOrange)}
      </div>
      {renderGraphs()}
    </div>
  );
};
