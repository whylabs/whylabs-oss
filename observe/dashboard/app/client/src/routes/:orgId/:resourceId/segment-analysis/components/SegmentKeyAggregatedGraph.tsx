import { createStyles } from '@mantine/core';
import { SegmentedControlItem } from '@mantine/core/lib/SegmentedControl/SegmentedControl';
import { Colors } from '~/assets/Colors';
import { CategoricalChart } from '~/components/chart/CategoricalChart';
import { ChartCard } from '~/components/chart/ChartCard';
import { WhyLabsSegmentedControl, WhyLabsText, WhyLabsTooltip } from '~/components/design-system';
import {
  SegmentKeyAggregatedGraphProps,
  useSegmentKeyAggregatedGraphViewModel,
} from '~/routes/:orgId/:resourceId/segment-analysis/components/useSegmentKeyAggregatedGraphViewModel';
import { DEFAULT_TICKS_AMOUNT, SegmentGraphSortBy } from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import { stringMax } from '~/utils/stringUtils';
import { MetricDataType, SortDirection } from '~server/graphql/generated/graphql';
import React, { ReactElement } from 'react';

const useStyles = createStyles({
  root: {
    height: 265,
    minHeight: 265,
    width: '100%',
    borderWidth: '1px 0px',
    borderBottom: 'unset',
    borderRadius: 0,
    padding: 15,
    paddingBottom: 0,
  },
  titleContainer: {
    marginBottom: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: 500,
    color: Colors.brandSecondary900,
  },
  graphControls: {
    display: 'flex',
    justifyContent: 'end',
    gap: 10,
    alignItems: 'center',
  },
  actionIcon: {
    '&:hover': {
      border: `1px solid ${Colors.secondaryLight700}`,
    },
  },
  sortLabel: {
    fontSize: 13,
    color: Colors.secondaryLight1000,
    fontWeight: 400,
  },
  sortSegmentControl: {
    borderLeft: 'unset !important',
  },
  sortDirectionRoot: {
    minWidth: 60,
  },
});

const CHART_ID = 'segment-analysis-graph';

export const SegmentKeyAggregatedGraph = (props: SegmentKeyAggregatedGraphProps): ReactElement => {
  const { classes } = useStyles();
  const { segmentKey } = props;
  const { graph, primaryMetric, secondaryMetric, thresholdPlotLine, sortControl, handleTickPositioner } =
    useSegmentKeyAggregatedGraphViewModel(props);
  const { sortState, handleSortChange } = sortControl;
  const getSortMetricLabel = (metricLabel: string) => {
    if (!metricLabel) return 'Loading...';
    const lengthLimit = 16;
    const isCollapsed = metricLabel.length > lengthLimit;
    const tooltip = isCollapsed ? metricLabel : '';
    return <WhyLabsTooltip label={tooltip}>{stringMax(metricLabel, lengthLimit)}</WhyLabsTooltip>;
  };

  const primaryMetricLabel = primaryMetric?.label || primaryMetric?.name || 'Primary metric';
  const secondaryMetricLabel = secondaryMetric?.label || secondaryMetric?.name || '';

  const graphControls = (() => {
    if (!primaryMetric && !secondaryMetric) return null;
    const segmentData = (() => {
      const items: SegmentedControlItem[] = [];
      if (primaryMetric) {
        items.push({ label: getSortMetricLabel(primaryMetric.label), value: SegmentGraphSortBy.PrimaryMetric });
      }
      if (secondaryMetric) {
        items.push({ label: getSortMetricLabel(secondaryMetric.label), value: SegmentGraphSortBy.SecondaryMetric });
      }
      return items;
    })();
    return (
      <div className={classes.graphControls}>
        <WhyLabsText className={classes.sortLabel}>Sort by:</WhyLabsText>
        <WhyLabsSegmentedControl
          classNames={{ control: classes.sortSegmentControl, root: classes.sortDirectionRoot }}
          size="xs"
          data={[
            { label: 'ASC', value: SortDirection.Asc },
            { label: 'DESC', value: SortDirection.Desc },
          ]}
          onChange={(value) => handleSortChange({ direction: value as SortDirection })}
          value={sortState.direction}
          color="gray"
        />
        <WhyLabsSegmentedControl
          size="xs"
          data={segmentData}
          onChange={(value) => handleSortChange({ sortBy: value as SegmentGraphSortBy })}
          value={sortState.sortBy}
          color="gray"
        />
      </div>
    );
  })();

  return (
    <ChartCard
      classNames={{
        root: classes.root,
        titleContainer: classes.titleContainer,
      }}
      title={<WhyLabsText className={classes.title}>{segmentKey}</WhyLabsText>}
      titleRightChildren={graphControls}
    >
      <CategoricalChart
        description="Segments graph"
        height={220}
        id={`${CHART_ID}:${segmentKey}`}
        isLoading={graph.isLoading}
        series={graph.data}
        categories={graph.categories}
        spec={{
          xAxis: {
            allowZooming: true,
            crosshair: false,
          },
          yAxis: [
            {
              title: primaryMetricLabel,
              tickAmount: DEFAULT_TICKS_AMOUNT,
              plotLines: [thresholdPlotLine],
              tickPositioner() {
                const { unitInterval, dataType } = primaryMetric ?? {};
                const integerDataType = dataType === MetricDataType.Integer;
                // @ts-expect-error - its an valid value as in https://api.hcplaceholder.com/hcplaceholder/xAxis.tickPositioner
                const { dataMax, dataMin } = this;
                return handleTickPositioner({ dataMin, dataMax, unitInterval, integerDataType });
              },
            },
            {
              title: secondaryMetricLabel,
              opposite: true,
              tickAmount: DEFAULT_TICKS_AMOUNT,
              tickPositioner() {
                const { unitInterval, dataType } = secondaryMetric ?? {};
                const integerDataType = dataType === MetricDataType.Integer;
                // @ts-expect-error - its an valid value as in https://api.hcplaceholder.com/hcplaceholder/xAxis.tickPositioner
                const { dataMax, dataMin } = this;
                return handleTickPositioner({ dataMin, dataMax, unitInterval, integerDataType });
              },
            },
          ],
          plotOptions: {
            columnGrouping: false,
          },
        }}
      />
    </ChartCard>
  );
};
