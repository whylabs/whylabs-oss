import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { adjustPickerDateRangeToGraphAxis } from '~/components/chart/chart-utils';
import { ChartCard } from '~/components/chart/ChartCard';
import { TimeSeriesChart } from '~/components/chart/TimeSeriesChart';
import { FlexDashCard } from '~/components/dashboard-cards/FlexDashCard';
import { SkeletonGroup, WhyLabsBadge, WhyLabsText } from '~/components/design-system';
import {
  GraphMetricsData,
  useOverallTimeseriesViewModel,
} from '~/routes/:orgId/:resourceId/segment-analysis/components/useOverallTimeseriesViewModel';
import { useResourceSegmentAnalysisViewModel } from '~/routes/:orgId/:resourceId/segment-analysis/useResourceSegmentAnalysisViewModel';
import {
  COMPARISON_PRIMARY_SERIES_COLOR,
  COMPARISON_SECONDARY_SERIES_COLOR,
  CommonGraphProps,
  DEFAULT_TICKS_AMOUNT,
  PRIMARY_SERIES_COLOR,
  SECONDARY_SERIES_COLOR,
  THRESHOLD_LINE_COLOR,
  TimeseriesMetricData,
  generateMetricGraphTickPositions,
  getSeriesSpec,
  handleMetricHero,
} from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import { SimpleDateRange } from '~/types/dateTypes';
import { arrayOfLength } from '~/utils/arrayUtils';
import { getUTCDateRangeString, openEndDateRangeTransformer } from '~/utils/dateRangeUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { RouterOutputs } from '~/utils/trpc';
import { isNumber } from '~/utils/typeGuards';
import { MetricDataType, TimePeriod } from '~server/graphql/generated/graphql';
import { mapStringToTimePeriod } from '~server/util/time-period-utils';
import React, { ReactElement } from 'react';

const GRAPHS_GAP = 20;
const DASH_CARD_GAP = 10;
const DASH_CARD_WIDTH = 200;
export const useStyles = createStyles({
  row: {
    display: 'flex',
    gap: GRAPHS_GAP,
  },
  graphWrapper: {
    display: 'flex',
    gap: DASH_CARD_GAP,
    width: '100%',
    minWidth: 400 + DASH_CARD_WIDTH + DASH_CARD_GAP,
  },
  card: {
    minHeight: 260,
    paddingBottom: 5,
  },
  cardTitleContainer: {
    marginBottom: 0,
  },
  cardTitleFlex: {
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  graphTitleText: {
    color: Colors.secondaryLight900,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.55,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badgeWrapper: {
    flexShrink: 0,
  },
  badge: {
    height: 24,
    fontSize: 13,
  },
  summaryCardSection: {
    display: 'flex',
    flexDirection: 'column',
    whiteSpace: 'pre-wrap',
  },
  sectionMetricLabel: {
    color: Colors.secondaryLight900,
    fontWeight: 500,
    fontSize: 14,
    lineHeight: 1.14,
  },
  sectionHeroNumber: {
    fontWeight: 400,
    fontSize: 36,
    lineHeight: 1,
  },
  sectionHeroEmptyState: {
    fontWeight: 400,
    fontSize: 16,
    lineHeight: 1.55,
    color: Colors.secondaryLight700,
  },
  sectionBottomText: {
    fontWeight: 400,
    fontSize: 12,
    lineHeight: 1.3,
    color: Colors.secondaryLight700,
  },
  sectionDateRange: {
    fontWeight: 700,
    fontSize: 12,
    lineHeight: 1.3,
    color: Colors.secondaryLight700,
  },
});

const CHART_ID = 'segment-analysis-overall-primary-timeseries-chart';

type OverallTimeseriesRowProps = CommonGraphProps & {
  pageViewModel: ReturnType<typeof useResourceSegmentAnalysisViewModel>;
  resourceData: RouterOutputs['meta']['resources']['describe'];
};
export const OverallTimeseriesRow = ({
  pageViewModel,
  resourceData,
  primaryMetric,
  secondaryMetric,
  referenceThreshold,
  targetColumn,
}: OverallTimeseriesRowProps): ReactElement => {
  const { timePeriod } = resourceData ?? {};
  const { classes } = useStyles();
  const batchFrequency = (timePeriod && mapStringToTimePeriod.get(timePeriod)) || TimePeriod.P1D;
  const { data, comparisonData, translateSummaryCardData, isMissingColumnSelection, generateTicksBounds } =
    useOverallTimeseriesViewModel({
      primaryMetric,
      secondaryMetric,
      batchFrequency,
      referenceThreshold,
      targetColumn,
      pageViewModel,
    });

  const primaryMetricLabel = primaryMetric?.label || primaryMetric?.name || 'Primary metric';
  const secondaryMetricLabel = secondaryMetric?.label || secondaryMetric?.name || '';

  const graphTitle = (() => {
    const metricsText = `${upperCaseFirstLetterOnly(primaryMetricLabel)}`.concat(
      secondaryMetricLabel ? ` and ${secondaryMetricLabel.toLowerCase()} for` : '',
    );
    return (
      <div className={classes.cardTitleFlex}>
        <WhyLabsText displayTooltip className={classes.graphTitleText}>
          {metricsText}
        </WhyLabsText>
        <div className={classes.badgeWrapper}>
          <WhyLabsBadge
            className={classes.badge}
            size="md"
            radius="xl"
            customBackground={Colors.secondaryLight200}
            customColor={Colors.secondaryLight1000}
            maxWidth={360}
          >
            {resourceData?.name || pageViewModel.meta.resourceId}
          </WhyLabsBadge>
        </div>
      </div>
    );
  })();

  const primaryPlot = getSeriesSpec(primaryMetric);
  const secondaryPlot = getSeriesSpec(secondaryMetric);
  const renderGraph = (graphData: GraphMetricsData | null, range: SimpleDateRange, index: number) => {
    const graphXAxis = adjustPickerDateRangeToGraphAxis(range, batchFrequency);
    return (
      <ChartCard
        classNames={{
          root: classes.card,
          titleContainer: classes.cardTitleContainer,
        }}
        title={graphTitle}
      >
        <TimeSeriesChart
          description="Accessibility description"
          customEmptyStateText={isMissingColumnSelection ? 'Select a column to visualize data.' : undefined}
          height={220}
          id={`${CHART_ID}:${index}`}
          isLoading={graphData?.isLoading}
          series={[
            {
              type: primaryPlot.type,
              color: index === 0 ? PRIMARY_SERIES_COLOR : COMPARISON_PRIMARY_SERIES_COLOR,
              data: graphData?.primaryMetricSeries ?? [],
              id: `primary-overall-performance-series:${index}`,
              name: primaryMetricLabel,
              yAxis: 0,
              zIndex: primaryPlot.zIndex,
            },
            {
              type: secondaryPlot.type,
              color: index === 0 ? SECONDARY_SERIES_COLOR : COMPARISON_SECONDARY_SERIES_COLOR,
              data: graphData?.secondaryMetricSeries ?? [],
              id: `secondary-overall-performance-series:${index}`,
              name: secondaryMetricLabel,
              yAxis: 1,
              zIndex: 0,
            },
            {
              type: 'annotation-line',
              color: THRESHOLD_LINE_COLOR,
              data: graphData?.thresholdSeries ?? [],
              id: `reference-threshold:${index}`,
              name: 'Reference threshold',
              yAxis: 0,
              zIndex: 3,
              width: 1.5,
            },
          ]}
          spec={{
            xAxis: {
              min: graphXAxis.min,
              max: graphXAxis.max,
              allowZooming: true,
            },
            yAxis: [
              {
                title: primaryMetricLabel,
                tickAmount: DEFAULT_TICKS_AMOUNT,
                tickPositioner() {
                  // @ts-expect-error - its an valid value as in https://api.hcplaceholder.com/hcplaceholder/xAxis.tickPositioner
                  const { dataMax: fallbackMax, dataMin: fallbackMin } = this;
                  const [usedMin, usedMax] = generateTicksBounds('primaryMetric');
                  const { unitInterval, dataType } = primaryMetric ?? {};
                  const integerDataType = dataType === MetricDataType.Integer;
                  return generateMetricGraphTickPositions({
                    dataMin: usedMin ?? fallbackMin,
                    dataMax: usedMax ?? fallbackMax,
                    ticksAmount: DEFAULT_TICKS_AMOUNT,
                    isUnitInterval: unitInterval ?? undefined,
                    integerDataType,
                  });
                },
              },
              {
                title: secondaryMetricLabel,
                opposite: true,
                tickAmount: DEFAULT_TICKS_AMOUNT,
                tickPositioner() {
                  // @ts-expect-error - its an valid value as in https://api.hcplaceholder.com/hcplaceholder/xAxis.tickPositioner
                  const { dataMax: fallbackMax, dataMin: fallbackMin } = this;
                  const [usedMin, usedMax] = generateTicksBounds('secondaryMetric');
                  const { unitInterval, dataType } = secondaryMetric ?? {};
                  const integerDataType = dataType === MetricDataType.Integer;
                  return generateMetricGraphTickPositions({
                    dataMin: usedMin ?? fallbackMin,
                    dataMax: usedMax ?? fallbackMax,
                    ticksAmount: DEFAULT_TICKS_AMOUNT,
                    isUnitInterval: unitInterval ?? undefined,
                    integerDataType,
                  });
                },
              },
            ],
          }}
        />
      </ChartCard>
    );
  };

  const summaryCardLoadingSkeleton = () =>
    arrayOfLength(2).map((i) => (
      <div key={`skeleton-summary-${i}`} className={classes.summaryCardSection}>
        <SkeletonGroup count={1} width="80%" height={16} />
        <SkeletonGroup count={1} width="60%" height={32} mt={4} mb={2} />
        <SkeletonGroup count={2} width="100%" height={14} mt={2} />
      </div>
    ));

  const renderSummaryCard = (
    summaryData: TimeseriesMetricData,
    range: SimpleDateRange,
    color: string,
    isLoading: boolean,
  ) => {
    if (isLoading)
      return (
        <FlexDashCard
          flexDirection="column"
          title="Summary metrics"
          sections={summaryCardLoadingSkeleton()}
          width={DASH_CARD_WIDTH}
        />
      );
    const dashMetrics = translateSummaryCardData(summaryData);
    const sections = dashMetrics.map((m) => {
      const hasData = isNumber(m.value);
      return (
        <div key={m.label} className={classes.summaryCardSection}>
          <WhyLabsText className={classes.sectionMetricLabel}>{m.label}</WhyLabsText>
          {hasData ? (
            <WhyLabsText className={classes.sectionHeroNumber} color={color}>
              {handleMetricHero(m.value, m.showAsPercent)}
            </WhyLabsText>
          ) : (
            <WhyLabsText className={classes.sectionHeroEmptyState} color={color}>
              No data available
            </WhyLabsText>
          )}
          <WhyLabsText className={classes.sectionBottomText}>
            {hasData ? 'Merged value for the range: ' : 'For the range:\n'}
            <span className={classes.sectionDateRange}>
              {getUTCDateRangeString(range.from, range.to, batchFrequency, false)}
            </span>
          </WhyLabsText>
        </div>
      );
    });
    return <FlexDashCard flexDirection="column" title="Summary metrics" sections={sections} width={DASH_CARD_WIDTH} />;
  };

  return (
    <div className={classes.row}>
      <div className={classes.graphWrapper}>
        {renderSummaryCard(
          data.summaryCard.data ?? [],
          openEndDateRangeTransformer(pageViewModel.globalDateRange),
          PRIMARY_SERIES_COLOR,
          data.summaryCard.isLoading,
        )}
        {renderGraph(data, pageViewModel.globalDateRange, 0)}
      </div>
      {pageViewModel.comparisonDateRange && (
        <div className={classes.graphWrapper}>
          {renderSummaryCard(
            comparisonData?.summaryCard.data ?? [],
            openEndDateRangeTransformer(pageViewModel.comparisonDateRange),
            COMPARISON_PRIMARY_SERIES_COLOR,
            comparisonData?.summaryCard?.isLoading,
          )}
          {pageViewModel.comparisonDateRange && renderGraph(comparisonData, pageViewModel.comparisonDateRange, 1)}
        </div>
      )}
    </div>
  );
};
