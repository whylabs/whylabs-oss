import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { useMainStackCustomEventsEmitters } from '~/hooks/useMainStackCustomEventsEmitters';
import { useResourceSegmentAnalysisViewModel } from '~/routes/:orgId/:resourceId/segment-analysis/useResourceSegmentAnalysisViewModel';
import {
  CommonGraphProps,
  TimeseriesData,
  TimeseriesMetricData,
  findMetricSchema,
  mapMetricSeries,
  mountMetricQueries,
  shouldUseCommonAxis,
} from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import { SimpleDateRange } from '~/types/dateTypes';
import { getValidMaxValue, getValidMinValue, isValidNumber } from '~/utils/numberUtils';
import { THRESHOLD_QUERY_NAME } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { MetricSchema, TimePeriod } from '~server/graphql/generated/graphql';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type SummaryCard = {
  label: string | null;
  value: number | null;
  showAsPercent?: boolean;
};

export type GraphMetricsData = {
  isLoading: boolean;
  primaryMetricSeries?: TimeseriesData;
  secondaryMetricSeries?: TimeseriesData;
  thresholdSeries?: TimeseriesData;
  summaryCard: {
    data?: TimeseriesMetricData;
    isLoading?: boolean;
  };
};

type OverallPerformanceTimeseriesViewModelProps = CommonGraphProps & {
  pageViewModel: ReturnType<typeof useResourceSegmentAnalysisViewModel>;
  batchFrequency: TimePeriod;
};
export const useOverallTimeseriesViewModel = ({
  batchFrequency,
  primaryMetric,
  secondaryMetric,
  referenceThreshold,
  targetColumn,
  pageViewModel,
}: OverallPerformanceTimeseriesViewModelProps) => {
  const {
    globalDateRange,
    comparisonDateRange,
    meta: { orgId, resourceId },
    setReferenceThresholdState,
  } = pageViewModel;
  const { emitReferenceThreshold } = useMainStackCustomEventsEmitters();
  const [searchParams] = useSearchParams();

  const { queries, isMissingColumnSelection } = useMemo(
    () => mountMetricQueries({ targetColumn, resourceId, selectedMetrics: [primaryMetric, secondaryMetric] }),
    [primaryMetric, resourceId, secondaryMetric, targetColumn],
  );

  const queriesCommonParams = {
    orgId,
    resourceId,
    granularity: batchFrequency,
    segmentTags: [],
    queries,
  };

  const enablePrimaryRangeQuery = !!primaryMetric && !isMissingColumnSelection;
  const { data, isLoading } = trpc.dashboard.metrics.getRollUpMetricData.useQuery(
    {
      ...queriesCommonParams,
      fromTimestamp: globalDateRange.from,
      toTimestamp: globalDateRange.to,
    },
    { enabled: enablePrimaryRangeQuery },
  );

  const enableComparisonRangeQuery = !!(enablePrimaryRangeQuery && comparisonDateRange);
  const { data: comparisonData, isLoading: isComparisonLoading } = trpc.dashboard.metrics.getRollUpMetricData.useQuery(
    {
      ...queriesCommonParams,
      fromTimestamp: comparisonDateRange?.from ?? 0,
      toTimestamp: comparisonDateRange?.to ?? 0,
    },
    { enabled: enableComparisonRangeQuery },
  );

  const { data: summaryCardData, isLoading: isLoadingSummaryCard } =
    trpc.dashboard.metrics.getRollUpMetricData.useQuery(
      {
        ...queriesCommonParams,
        granularity: TimePeriod.All,
        fromTimestamp: globalDateRange.from,
        toTimestamp: globalDateRange.to,
      },
      { enabled: enablePrimaryRangeQuery },
    );

  const { data: comparisonSummaryCardData, isLoading: isLoadingComparisonSummaryCard } =
    trpc.dashboard.metrics.getRollUpMetricData.useQuery(
      {
        ...queriesCommonParams,
        granularity: TimePeriod.All,
        fromTimestamp: comparisonDateRange?.from ?? 0,
        toTimestamp: comparisonDateRange?.to ?? 0,
      },
      { enabled: enableComparisonRangeQuery },
    );

  const generateTimeSeriesData = useCallback(
    (seriesData: TimeseriesMetricData, dateRange: SimpleDateRange) => {
      const [primaryMetricData, secondaryMetricData] = seriesData ?? [];
      const [primaryMetricSeries, primaryMetricDomain] = mapMetricSeries(primaryMetricData);
      const [secondaryMetricSeries, secondaryMetricDomain] = mapMetricSeries(secondaryMetricData);
      const thresholdSeries: [number, number | null][] = (() => {
        const availableDataTimestamps = new Set([
          ...(primaryMetricSeries?.map(([ts]) => ts) ?? []),
          ...(secondaryMetricSeries?.map(([ts]) => ts) ?? []),
        ]);
        if (!availableDataTimestamps.size) return [];
        const mappedData: [number, number | null][] = [...availableDataTimestamps].map((ts) => [
          ts,
          referenceThreshold,
        ]);
        return [[dateRange.from, referenceThreshold], ...mappedData, [dateRange.to, referenceThreshold]];
      })();
      return {
        primaryMetricSeries,
        secondaryMetricSeries,
        thresholdSeries,
        dataDomain: {
          primaryMetric: primaryMetricDomain,
          secondaryMetric: secondaryMetricDomain,
        },
      };
    },
    [referenceThreshold],
  );

  const primaryTimeseries = useMemo(() => {
    return generateTimeSeriesData(data ?? [], globalDateRange);
  }, [data, generateTimeSeriesData, globalDateRange]);

  const comparisonTimeseries = useMemo(() => {
    return comparisonDateRange ? generateTimeSeriesData(comparisonData ?? [], comparisonDateRange) : null;
  }, [comparisonData, generateTimeSeriesData, comparisonDateRange]);

  const generateTicksBounds = useCallback(
    (metricType: 'primaryMetric' | 'secondaryMetric') => {
      const { dataDomain } = primaryTimeseries;
      const { dataDomain: comparisonDataDomain } = comparisonTimeseries ?? {};
      const getDomainBounds = (type: 'primaryMetric' | 'secondaryMetric') => {
        const min = getValidMinValue(dataDomain?.[type]?.min, comparisonDataDomain?.[type]?.min);
        const max = getValidMaxValue(dataDomain?.[type]?.max, comparisonDataDomain?.[type]?.max);
        if (type === 'primaryMetric')
          return [getValidMinValue(min, referenceThreshold), getValidMaxValue(max, referenceThreshold)];
        return [min, max];
      };
      const commonAxis = shouldUseCommonAxis(primaryMetric, secondaryMetric);
      if (!commonAxis) {
        // return the extreme min and max within the main range and comparison range
        return getDomainBounds(metricType);
      }
      const [primaryMetricMin, primaryMetricMax] = getDomainBounds('primaryMetric');
      const [secondaryMetricMin, secondaryMetricMax] = getDomainBounds('secondaryMetric');

      const unifiedMin = getValidMinValue(primaryMetricMin, secondaryMetricMin);
      const unifiedMax = getValidMaxValue(primaryMetricMax, secondaryMetricMax);

      return [unifiedMin, unifiedMax];
    },
    [comparisonTimeseries, primaryMetric, primaryTimeseries, referenceThreshold, secondaryMetric],
  );

  const translateSummaryCardData = useCallback(
    (rollupAllData: TimeseriesMetricData) => {
      return rollupAllData?.map(({ metric, feature, points }) => {
        const metrics = [primaryMetric, secondaryMetric].filter((m): m is MetricSchema => !!m);
        const foundMetric = findMetricSchema(metrics, metric, feature);
        return {
          label: foundMetric?.label ?? metric,
          value: points[0]?.value ?? null,
          showAsPercent: !!foundMetric?.showAsPercent,
        } satisfies SummaryCard;
      });
    },
    [primaryMetric, secondaryMetric],
  );
  const thresholdSearchParam = (() => {
    const param = searchParams.get(THRESHOLD_QUERY_NAME);
    if (param === null || !param.length) return null;
    return Number(param);
  })();

  useDeepCompareEffect(() => {
    if (!summaryCardData?.length || !primaryMetric || isValidNumber(thresholdSearchParam)) return;
    const rolledUpPrimaryMetric = summaryCardData.find(
      ({ metric, feature }) => !!findMetricSchema([primaryMetric], metric, feature),
    );
    const maxDataPoint = Math.max(
      ...primaryTimeseries.primaryMetricSeries.flatMap(([, value]) => (isValidNumber(value) ? [value] : [])),
    );
    const rollUpValue = rolledUpPrimaryMetric?.points[0]?.value;
    if (!isValidNumber(rollUpValue) || !isValidNumber(maxDataPoint)) return;
    const newThreshold = (() => {
      if (rollUpValue > maxDataPoint) {
        // when is an aggregated count
        return (maxDataPoint * 0.8).toFixed(3);
      }
      return rollUpValue.toFixed(3);
    })();
    setReferenceThresholdState(newThreshold);
    emitReferenceThreshold({ page: 'segment-analysis', url: window.location.href, value: Number(newThreshold) });
  }, [primaryMetric, primaryTimeseries.primaryMetricSeries, summaryCardData, translateSummaryCardData]);

  return {
    data: {
      isLoading: isLoading && enablePrimaryRangeQuery,
      ...primaryTimeseries,
      summaryCard: {
        data: summaryCardData,
        isLoading: enablePrimaryRangeQuery && isLoadingSummaryCard,
      },
    } satisfies GraphMetricsData,
    comparisonData: {
      isLoading: isComparisonLoading && enableComparisonRangeQuery,
      ...comparisonTimeseries,
      summaryCard: {
        data: comparisonSummaryCardData,
        isLoading: enableComparisonRangeQuery && isLoadingComparisonSummaryCard,
      },
    } satisfies GraphMetricsData,
    isMissingColumnSelection,
    generateTicksBounds,
    translateSummaryCardData,
  };
};
