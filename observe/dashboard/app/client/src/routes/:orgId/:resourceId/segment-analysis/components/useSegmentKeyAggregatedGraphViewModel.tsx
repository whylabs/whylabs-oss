import { ChartCategorySeries } from '~/components/chart/types/chart-types';
import { useResourceSegmentAnalysisViewModel } from '~/routes/:orgId/:resourceId/segment-analysis/useResourceSegmentAnalysisViewModel';
import {
  AggregatedData,
  AvailableMetric,
  COMPARISON_TOKEN,
  CommonGraphProps,
  DEFAULT_TICKS_AMOUNT,
  SegmentAnalysisCategoryChartSeries,
  SegmentGraphSortBy,
  THRESHOLD_LINE_COLOR,
  YDataDomain,
  findMetricSchema,
  generateAggregatedSeriesObject,
  generateBarPatternZones,
  generateMetricGraphTickPositions,
  mountMetricQueries,
  shouldUseCommonAxis,
  sortAggregatedMetricData,
} from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import { SortDirectionType } from '~/types/sortTypes';
import { getValidMaxValue, getValidMinValue } from '~/utils/numberUtils';
import { trpc } from '~/utils/trpc';
import { isNumber } from '~/utils/typeGuards';
import { AnalysisMetric, MetricSchema, SortDirection } from '~server/graphql/generated/graphql';
import { AxisPlotLinesOptions } from 'hcplaceholder';
import { useCallback, useMemo, useState } from 'react';

const THRESHOLD_ID = 'reference-threshold';
type SortControl = {
  direction: SortDirectionType;
  sortBy: SegmentGraphSortBy;
};

export type SegmentKeyAggregatedGraphProps = CommonGraphProps & {
  pageViewModel: ReturnType<typeof useResourceSegmentAnalysisViewModel>;
  segmentKey: string;
};
export const useSegmentKeyAggregatedGraphViewModel = ({
  pageViewModel,
  segmentKey,
  primaryMetric,
  secondaryMetric,
  referenceThreshold,
  targetColumn,
}: SegmentKeyAggregatedGraphProps) => {
  const [sortState, setSortState] = useState<SortControl>({
    direction: SortDirection.Desc,
    sortBy: SegmentGraphSortBy.PrimaryMetric,
  });

  const thresholdPlotLine: AxisPlotLinesOptions = useMemo(
    () => ({
      id: THRESHOLD_ID,
      color: THRESHOLD_LINE_COLOR,
      zIndex: 5,
      value: referenceThreshold ?? undefined,
      width: 1.5,
      dashStyle: 'ShortDash',
    }),
    [referenceThreshold],
  );

  const handleSortChange = (newState: Partial<SortControl>) => {
    setSortState((curr) => ({ ...curr, ...newState }));
  };

  const {
    globalDateRange,
    comparisonDateRange,
    meta: { orgId, resourceId },
  } = pageViewModel;

  const { queries, isMissingColumnSelection } = useMemo(
    () => mountMetricQueries({ targetColumn, resourceId, selectedMetrics: [primaryMetric, secondaryMetric] }),
    [primaryMetric, resourceId, secondaryMetric, targetColumn],
  );

  const queriesCommonParams = {
    orgId,
    resourceId,
    segmentKey,
    queries,
  };
  const isPrimaryRangeQueryEnabled = !!primaryMetric && !isMissingColumnSelection;
  const { data, isLoading: primaryRangeQueryLoading } = trpc.dashboard.metrics.getSegmentGroupRollUpMetricData.useQuery(
    {
      ...queriesCommonParams,
      fromTimestamp: globalDateRange.from,
      toTimestamp: globalDateRange.to,
    },
    { enabled: isPrimaryRangeQueryEnabled },
  );

  const isComparisonRangeQueryEnabled = !!(isPrimaryRangeQueryEnabled && comparisonDateRange);
  const { data: comparisonData, isLoading: comparisonRangeQueryLoading } =
    trpc.dashboard.metrics.getSegmentGroupRollUpMetricData.useQuery(
      {
        ...queriesCommonParams,
        fromTimestamp: comparisonDateRange?.from ?? 0,
        toTimestamp: comparisonDateRange?.to ?? 0,
      },
      { enabled: isComparisonRangeQueryEnabled },
    );

  const isLoading =
    (isPrimaryRangeQueryEnabled && primaryRangeQueryLoading) ||
    (isComparisonRangeQueryEnabled && comparisonRangeQueryLoading);

  const generateSeriesArray: () => SegmentAnalysisCategoryChartSeries[] = useCallback(() => {
    const series: SegmentAnalysisCategoryChartSeries[] = [];
    const setMetric = (metric: AvailableMetric | null, type: 'primary' | 'secondary') => {
      if (!metric) return;
      series.push(generateAggregatedSeriesObject({ metric, type, isComparison: false }));
      if (comparisonDateRange) {
        series.push(generateAggregatedSeriesObject({ metric, type, isComparison: true }));
      }
    };
    setMetric(primaryMetric, 'primary');
    setMetric(secondaryMetric, 'secondary');
    return series;
  }, [comparisonDateRange, primaryMetric, secondaryMetric]);

  const getMetricLabel = useCallback(
    (name: AnalysisMetric, column: string) => {
      const metrics = [primaryMetric, secondaryMetric].filter((m): m is MetricSchema => !!m);
      const foundMetric = findMetricSchema(metrics, name, column);
      return foundMetric?.label ?? name;
    },
    [primaryMetric, secondaryMetric],
  );

  const joinSegmentsData = useCallback(() => {
    const segmentGroupsAggData = new Map<string, number>();
    const availableSegmentGroups = new Set<string>();
    const unifiedDataDomain: YDataDomain = { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER };
    const mapAggregatedSegmentGroupsMetrics = (aggData: AggregatedData, isComparison: boolean) => {
      aggData.forEach((metric) => {
        if (metric.value > unifiedDataDomain.max) unifiedDataDomain.max = metric.value;
        if (metric.value < unifiedDataDomain.min) unifiedDataDomain.min = metric.value;
        const { segmentGroup, metric: metricName, feature } = metric;
        availableSegmentGroups.add(segmentGroup);
        const label = getMetricLabel(metricName, feature);
        const mapKey = `${segmentGroup}:${label}`.concat(isComparison ? COMPARISON_TOKEN : '');
        const currentAggSegmentValue = segmentGroupsAggData.get(mapKey) ?? 0;
        if (isNumber(metric.value)) {
          segmentGroupsAggData.set(mapKey, currentAggSegmentValue + metric.value);
        }
      });
    };
    const sortByMetric = sortState.sortBy === 'PrimaryMetric' ? primaryMetric : secondaryMetric;
    const sortedData = sortAggregatedMetricData(data ?? [], sortByMetric, sortState.direction);
    mapAggregatedSegmentGroupsMetrics(sortedData, false);
    mapAggregatedSegmentGroupsMetrics(comparisonData ?? [], true);
    const allGraphCategories = [...availableSegmentGroups];
    return {
      segmentGroupsAggData,
      allGraphCategories,
      unifiedDataDomain: allGraphCategories?.length ? unifiedDataDomain : null,
    };
  }, [comparisonData, data, getMetricLabel, primaryMetric, secondaryMetric, sortState]);

  const [graphData, graphCategories, dataDomain]: [ChartCategorySeries[], string[], YDataDomain] = useMemo(() => {
    if (!primaryMetric) return [[], [], null];
    const { segmentGroupsAggData, allGraphCategories, unifiedDataDomain } = joinSegmentsData();
    const graphSeries = generateSeriesArray();
    const series: ChartCategorySeries[] = graphSeries.map(
      ({ name, color, pointPlacement, metric, metricType, ...rest }) => {
        const usedData = allGraphCategories.flatMap((segmentGroup) => {
          const seriesValue = segmentGroupsAggData.get(`${segmentGroup}:${name}`);
          return isNumber(seriesValue) ? [seriesValue] : [];
        });
        const zones = metricType === 'primary' ? generateBarPatternZones(metric, color, referenceThreshold) : undefined;
        return {
          ...rest,
          pointPlacement: isComparisonRangeQueryEnabled ? pointPlacement : undefined,
          name,
          color,
          data: usedData,
          zones,
        };
      },
    );

    if (isNumber(referenceThreshold) && !!series?.length) {
      series.push({
        type: 'annotation-line',
        width: 0, // this series is not visible, but we pushed it here to have threshold on the tooltip
        color: THRESHOLD_LINE_COLOR,
        name: 'Reference threshold',
        pointPlacement: 'on',
        yAxis: 0,
        zIndex: 3,
        data: allGraphCategories.map(() => referenceThreshold),
        events: {
          legendItemClick(this) {
            if (this.visible) {
              this.chart.yAxis[0].removePlotLine(THRESHOLD_ID);
            } else {
              this.chart.yAxis[0].addPlotLine(thresholdPlotLine);
            }
          },
        },
      });
    }

    return [series, allGraphCategories, unifiedDataDomain];
  }, [
    generateSeriesArray,
    isComparisonRangeQueryEnabled,
    joinSegmentsData,
    primaryMetric,
    referenceThreshold,
    thresholdPlotLine,
  ]);

  const handleTickPositioner = useCallback(
    ({
      dataMin,
      dataMax,
      unitInterval,
      integerDataType,
    }: {
      dataMin: number;
      dataMax: number;
      unitInterval?: boolean | null;
      integerDataType: boolean;
    }) => {
      const commonAxis = shouldUseCommonAxis(primaryMetric, secondaryMetric);
      if (!commonAxis) {
        return generateMetricGraphTickPositions({
          dataMin,
          dataMax,
          ticksAmount: DEFAULT_TICKS_AMOUNT,
          isUnitInterval: unitInterval ?? undefined,
          integerDataType,
        });
      }
      const usedMin = getValidMinValue(dataDomain?.min, referenceThreshold);
      const usedMax = getValidMaxValue(dataDomain?.max, referenceThreshold);
      return generateMetricGraphTickPositions({
        dataMin: usedMin ?? dataMin,
        dataMax: usedMax ?? dataMax,
        ticksAmount: DEFAULT_TICKS_AMOUNT,
        isUnitInterval: unitInterval ?? undefined,
        integerDataType,
      });
    },
    [dataDomain?.max, dataDomain?.min, primaryMetric, referenceThreshold, secondaryMetric],
  );

  return {
    graph: {
      data: graphData,
      isLoading,
      categories: graphCategories,
    },
    handleTickPositioner,
    isMissingColumnSelection,
    primaryMetric,
    secondaryMetric,
    thresholdPlotLine,
    sortControl: {
      handleSortChange,
      sortState,
    },
  };
};
