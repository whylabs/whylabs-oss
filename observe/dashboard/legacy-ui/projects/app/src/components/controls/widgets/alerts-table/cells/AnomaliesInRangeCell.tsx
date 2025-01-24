import { Colors, RedAlertBall } from '@whylabs/observatory-lib';
import GreenHappyBall from 'components/controls/GreenHappyBall';
import SimpleStackedChart from 'components/visualizations/simple-stacked-chart/SimpleStackedChart';
import { StackedBar } from 'components/visualizations/simple-stacked-chart/types';
import { AlertCategory, OverviewTimeSeriesFragment } from 'generated/graphql';
import cloneDeep from 'lodash/cloneDeep';
import { getBucketsForEachWholeUnit } from 'utils/dateUtils';

import { useElementSize } from 'hooks/useElementSize';
import { WhyLabsTooltip } from 'components/design-system';
import { createStyles } from '@mantine/core';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

const CARD_CHART_WIDTH = 165;
const CARD_CHART_HEIGHT = 28;
const TABLE_CHART_WIDTH = 120;
const TABLE_CHART_HEIGHT = 28;

const useStyles = createStyles(() => ({
  container: {
    display: 'flex',
  },
  containerCardMode: {
    justifyContent: 'space-between',
  },
  containerTableMode: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
  },
  chartContainerTableMode: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: TABLE_CHART_HEIGHT,
    padding: 0,
    marginLeft: 10,
  },
  alertCountTableMode: {
    minWidth: '2em',
    flexGrow: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  redAlertBall: {
    cursor: 'pointer',
  },
}));

type AnomaliesInRangeCellProps = {
  noDataText: JSX.Element;
  timeSeries: OverviewTimeSeriesFragment[];
  viewMode: 'card' | 'table';
  resourceId?: string;
  totalAnomaliesCount?: number;
};

const AnomaliesInRangeCell = ({
  noDataText,
  timeSeries,
  viewMode,
  resourceId = '',
  totalAnomaliesCount,
}: AnomaliesInRangeCellProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const { dateRange } = useSuperGlobalDateRange();
  const { modelId } = usePageTypeWithParams();
  const usedResourceId = resourceId || modelId;
  const { handleNavigation } = useNavLinkHandler();
  const [containerRef, { width: containerWidth }] = useElementSize();
  const [counterRef, { width: counterWidth }] = useElementSize();

  const isCardMode = viewMode === 'card';
  const isTableMode = viewMode === 'table';

  const alertsInRangeData = createStackedBars();
  const navToAnomaliesFeed = () => {
    handleNavigation({
      modelId: usedResourceId,
      page: 'monitorManager',
      monitorManager: { path: 'anomalies-feed' },
    });
  };
  return (
    <div
      className={cx(classes.container, {
        [classes.containerCardMode]: isCardMode,
        [classes.containerTableMode]: isTableMode,
      })}
      ref={containerRef}
    >
      <div className={cx({ [classes.chartContainerTableMode]: isTableMode })}>
        {alertsInRangeData.length ? (
          <SimpleStackedChart
            barGap={isCardMode ? 4 : undefined}
            colorRange={Colors.alertStackedBarArray}
            data={alertsInRangeData}
            height={isCardMode ? CARD_CHART_HEIGHT : TABLE_CHART_HEIGHT}
            width={getChartWidth()}
          />
        ) : (
          noDataText
        )}
      </div>
      <div
        className={cx({
          [classes.alertCountTableMode]: isTableMode,
        })}
      >
        {renderAlertCount()}
      </div>
    </div>
  );

  function renderAlertCount() {
    const alertCount =
      totalAnomaliesCount ||
      timeSeries.reduce((acc, curr) => {
        const dayCount = curr.counts.reduce((dayTotal, current) => dayTotal + current.count, 0);
        return acc + dayCount;
      }, 0);

    return (
      <div ref={counterRef}>
        <WhyLabsTooltip label={alertCount && 'View in anomalies feed'}>
          {alertCount ? (
            <RedAlertBall alerts={alertCount} inverted onClick={navToAnomaliesFeed} />
          ) : (
            <GreenHappyBall inverted />
          )}
        </WhyLabsTooltip>
      </div>
    );
  }

  function createStackedBars(): StackedBar[] {
    if (!timeSeries.length) return [];

    const alertMap = createAlertMap();
    const buckets = getBucketsForEachWholeUnit(dateRange, 'D', false);
    if (alertMap.size === 0) return []; // If there are no alerts theres nothing to show

    return buckets.map((bucket) => {
      const timestamp = bucket.from.valueOf();
      const beginningOfUtcDay = new Date(timestamp).setUTCHours(0, 0, 0, 0);
      const d = alertMap.get(beginningOfUtcDay);

      return {
        from: bucket.from,
        to: bucket.to,
        counts: {
          Ingestion: {
            count: d?.counts.find((c) => c.category === AlertCategory.Ingestion)?.count ?? 0,
            color: Colors.alertStackedBarArray[0],
          },
          'Data quality': {
            count: d?.counts.find((c) => c.category === AlertCategory.DataQuality)?.count ?? 0,
            color: Colors.alertStackedBarArray[1],
          },
          'Data drift': {
            count: d?.counts.find((c) => c.category === AlertCategory.DataDrift)?.count ?? 0,
            color: Colors.alertStackedBarArray[2],
          },
          Performance: {
            count: d?.counts.find((c) => c.category === AlertCategory.Performance)?.count ?? 0,
            color: Colors.alertStackedBarArray[3],
          },
        },
      };
    });
  }

  function createAlertMap() {
    const alertMap = new Map<number, OverviewTimeSeriesFragment>();

    timeSeries.forEach((data) => {
      const t = new Date(data.timestamp).setUTCHours(0, 0, 0, 0);
      const duplicate = alertMap.get(t);
      if (duplicate) {
        data.counts.forEach((c) => {
          const matching = duplicate.counts.find((m) => m.category === c.category);
          if (matching) {
            matching.count += c.count;
          }
        });
      } else {
        alertMap.set(t, cloneDeep(data));
      }
    });

    return alertMap;
  }

  function getChartWidth() {
    const defaultWidth = isCardMode ? CARD_CHART_WIDTH : TABLE_CHART_WIDTH;

    const chartWidth = containerWidth - counterWidth - 36;
    if (chartWidth > defaultWidth) return chartWidth;

    return defaultWidth;
  }
};

export default AnomaliesInRangeCell;
