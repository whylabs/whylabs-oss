import { createStyles, Skeleton } from '@mantine/core';
import { Colors, WhyLabsAutoSizer } from '@whylabs/observatory-lib';
import { LongHistogramVisxChart } from 'components/visualizations/long-histogram';
import { getBucketsForEachWholeUnit } from 'utils/dateUtils';
import { useDeepCompareMemo } from 'use-deep-compare';
import { TimePeriod, useGetTotalAlertsByTimeQuery } from 'generated/graphql';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsText } from 'components/design-system';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { BucketedAlertCount } from '../table/cells/AnomalyTypes';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    backgroundColor: Colors.white,
    paddingLeft: '20px',
    paddingRight: '20px',
    minHeight: '84px',
    minWidth: '500px',
    flexGrow: 1,
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    width: 50,
    maxHeight: 80,
    zIndex: 1,
  },
  textMessage: {
    fontWeight: 600,
    fontSize: 12,
    lineHeight: 1.2,
    textAlign: 'right',
    paddingRight: '5px',
    color: Colors.brandSecondary900,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    color: Colors.brandSecondary900,
  },
  skeletonContainer: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 25,
    '& > span': {
      marginRight: 2,
      paddingBottom: 10,
    },
  },
});

const OverviewAnomalyGraphContainer: React.FC = () => {
  const { classes: styles, cx } = useStyles();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { classes: typography } = useTypographyStyles();
  const { loading, error, data } = useGetTotalAlertsByTimeQuery({
    variables: {
      ...dateRange,
    },
    skip: loadingDateRange,
  });

  if (error) {
    console.error(error);
  }

  const bucketedAlerts = useDeepCompareMemo(() => {
    const dateBuckets = getBucketsForEachWholeUnit(dateRange, 'D', false);

    const constructedBuckets: BucketedAlertCount[] = dateBuckets.map((db) => ({
      from: db.from,
      to: db.to,
      counts: {
        // order is important for coloring
        Performance: 0,
        DataDrift: 0,
        DataQuality: 0,
        Ingestion: 0,
        Unknown: 0,
      },
    }));

    if (!data) {
      return constructedBuckets;
    }

    data.models.forEach((model) => {
      model.anomalyCounts?.timeseries.forEach((alerts) => {
        const targetBucket = constructedBuckets.find(
          (bucket) => bucket.from.getTime() <= alerts.timestamp && alerts.timestamp < bucket.to.getTime(),
        );
        if (targetBucket) {
          alerts.counts.forEach((count) => {
            targetBucket.counts[count.category] += count.count;
          });
        }
      });
    });
    return constructedBuckets;
  }, [data]);

  const readyToShow = !loading && !error && bucketedAlerts.length > 0;

  return (
    <div className={styles.root}>
      <div className={styles.textContainer}>
        <WhyLabsText inherit className={cx(typography.widgetTitle, styles.textMessage)}>
          Daily anomaly count
        </WhyLabsText>
      </div>
      {loading && (
        <div className={styles.skeletonContainer}>
          {Array.from({ length: 10 })
            .fill(null)
            .map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={`bar-skeleton-${i}`} variant="rect" width={40} height={48} animate />
            ))}
        </div>
      )}
      {readyToShow && (
        <div style={{ flex: '1 0 auto' }}>
          <WhyLabsAutoSizer>
            {({ height, width }) => (
              <LongHistogramVisxChart
                svgWidth={width}
                graphHorizontalBuffer={24}
                svgHeight={height}
                graphVerticalBuffer={24}
                bucketedAlertCounts={bucketedAlerts}
                name="all-alerts-graph"
                batchFrequency={TimePeriod.P1D}
              />
            )}
          </WhyLabsAutoSizer>
        </div>
      )}
    </div>
  );
};

export default OverviewAnomalyGraphContainer;
