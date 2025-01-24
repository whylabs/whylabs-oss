import { useContext, useEffect, useMemo } from 'react';

import { FlexibleCard } from 'components/panels/llm/FlexibleCard';
import { MetricDataFragment, SegmentTag, TimePeriod, useGetMetricsByTagQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsNoDataPage } from 'components/empty-states/WhyLabsNoDataPage';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { DashboardTabsContext } from 'pages/llm-dashboards/DashboardTabsContext';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import {
  CardSkeleton,
  dashboardPanelStyles,
  MetricsCardsSkeleton,
  renderSummarySection,
  UnavailableMetricCard,
} from '../utils';
import { PerformanceVisualization } from './components/PerformanceVisualization';
import {
  CardColumnKey,
  filterContinuousMetrics,
  getCustomMetricHeroValue,
  mergeMetrics,
  metricDataToMapEntries,
} from '../../../utils';
import { LLMDashboardContext, LLMDashboardContextProvider } from '../contexts/LLMDashboardContext';
import { LLMCardRowContextProvider } from '../contexts/LLMCardRowContext';
import { LLMGraphCardContextProvider } from '../contexts/LLMGraphCardContext';
import { DashboardHeader } from '../components/DashboardHeader';

export const PerformancePanel: React.FC = () => {
  useSetHtmlTitle('Performance');
  const { classes } = dashboardPanelStyles();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const {
    resourceState: { resource },
  } = useResourceContext();
  const currentResourceBatchFrequency = resource?.batchFrequency ?? null;
  const { modelId } = usePageTypeWithParams();
  const [{ primaryMetrics, secondaryMetrics }, dashboardDispatch] = useContext(LLMDashboardContext);
  const [{ compareWithResourceId, primarySelectedSegment, secondarySelectedSegment }] =
    useContext(DashboardTabsContext);

  const {
    data: primaryMetricsAvailable,
    loading: primaryMetricsLoading,
    error: primaryMetricsError,
  } = useGetMetricsByTagQuery({
    variables: {
      resourceId: modelId,
      tags: ['performance'],
      segmentTags: primarySelectedSegment?.tags ?? [],
      ...dateRange,
      granularity: currentResourceBatchFrequency ?? TimePeriod.P1D,
    },
    skip: loadingDateRange,
  });

  const filteredPrimaryMetrics = useMemo(() => {
    return filterContinuousMetrics(primaryMetricsAvailable?.resource?.segment?.customMetrics ?? []);
  }, [primaryMetricsAvailable?.resource?.segment?.customMetrics]);

  useEffect(() => {
    if (primaryMetricsLoading) return;
    const metrics = metricDataToMapEntries(filteredPrimaryMetrics);
    dashboardDispatch({ primaryMetrics: new Map(metrics) });
  }, [dashboardDispatch, filteredPrimaryMetrics, primaryMetricsLoading]);

  const {
    data: comparisonMetricsAvailable,
    loading: comparisonMetricsLoading,
    error: comparisonMetricsError,
  } = useGetMetricsByTagQuery({
    variables: {
      resourceId: compareWithResourceId ?? '',
      tags: ['performance'],
      segmentTags: secondarySelectedSegment?.tags ?? [],
      ...dateRange,
      granularity: currentResourceBatchFrequency ?? TimePeriod.P1D,
    },
    skip: loadingDateRange,
  });

  const filteredComparisonMetrics = useMemo(() => {
    return filterContinuousMetrics(comparisonMetricsAvailable?.resource?.segment?.customMetrics ?? []);
  }, [comparisonMetricsAvailable?.resource?.segment?.customMetrics]);

  useEffect(() => {
    if (comparisonMetricsLoading) return;
    const metrics = metricDataToMapEntries(filteredComparisonMetrics);
    dashboardDispatch({ secondaryMetrics: new Map(metrics) });
  }, [dashboardDispatch, filteredComparisonMetrics, comparisonMetricsLoading]);

  const mergedMetrics = useMemo(() => {
    return mergeMetrics(filteredPrimaryMetrics, filteredComparisonMetrics);
  }, [filteredPrimaryMetrics, filteredComparisonMetrics]);

  if (primaryMetricsError) {
    console.error('error loading metrics in perf:', primaryMetricsError);
  }
  if (comparisonMetricsError) {
    console.error('error loading metrics in perf:', comparisonMetricsError);
  }

  const hasActiveComparison = !!(secondarySelectedSegment && compareWithResourceId);

  const renderMetric = ({
    metric,
    resourceName,
    resourceId,
    datePair,
    columnKey,
    metricKey,
    color,
    manualTags,
  }: {
    metric?: MetricDataFragment;
    resourceName: string;
    resourceId: string;
    datePair: SimpleDateRange;
    columnKey: CardColumnKey;
    metricKey: string;
    color: string;
    manualTags: SegmentTag[];
  }) => {
    if ((columnKey === 'comparison' && comparisonMetricsLoading) || (columnKey === 'primary' && primaryMetricsLoading))
      return <CardSkeleton key={`${columnKey}--${metricKey}`} />;
    const comparisonHasSegment = secondarySelectedSegment?.tags?.length;
    if (!metric)
      return (
        <UnavailableMetricCard targetText={comparisonHasSegment ? 'target segment' : resourceName ?? resourceId} />
      );
    const { from, to } = datePair;
    const rangeString = from && to ? `${from}-to-${to}` : '';
    const heroValue = getCustomMetricHeroValue(metric);
    const analysisMetric = metric?.metadata?.queryDefinition?.metric ?? 'UNKNOWN';
    const key = `${columnKey}--${metricKey}--${analysisMetric}`;
    return (
      <div className={classes.graph} key={key}>
        <LLMGraphCardContextProvider key={`${key}-context`} metric={metric}>
          <FlexibleCard
            summarySection={renderSummarySection({
              metric,
              resourceName,
              color,
              heroValue,
              selectedBatch: rangeString,
              batchFrequency: primaryMetricsAvailable?.resource?.batchFrequency,
              overrideTimestampsLabel: 'For selected date range',
            })}
            visualizationSection={
              <PerformanceVisualization
                name={`${resourceId}-${metricKey}`}
                navigationInformation={{
                  columnId: metric?.metadata?.queryDefinition?.column ?? undefined,
                  resourceId,
                  segment: manualTags ? { tags: manualTags } : undefined,
                  customDateRange: dateRange,
                }}
                columnKey={columnKey}
                key={`${key}-card`}
              />
            }
          />
        </LLMGraphCardContextProvider>
      </div>
    );
  };

  const noMetricsInRange = primaryMetricsLoading === false && filteredPrimaryMetrics?.length === 0;
  const renderNoMetricsInRange = () => {
    return (
      <div className={classes.emptyState}>
        <WhyLabsNoDataPage
          maxContentWidth={900}
          title="No performance metrics available in the selected date range"
          subtitle={<p>Set a different time window or use the batch profile lineage widget to set the date range.</p>}
        />
      </div>
    );
  };

  return (
    <>
      <DashboardHeader />
      {noMetricsInRange ? (
        renderNoMetricsInRange()
      ) : (
        <div className={classes.newRoot}>
          {primaryMetricsLoading && <MetricsCardsSkeleton key="security--primary" />}
          {!primaryMetricsLoading &&
            mergedMetrics.map((metric) => {
              const primaryMetricData = primaryMetrics.get(metric);
              const secondaryMetricData = secondaryMetrics.get(metric);
              return (
                <LLMCardRowContextProvider key={`${metric}--card-row`}>
                  <div className={classes.graphRow}>
                    {renderMetric({
                      metric: primaryMetricData,
                      resourceName: primaryMetricsAvailable?.resource?.name ?? 'Loading...',
                      resourceId: modelId,
                      datePair: dateRange,
                      columnKey: 'primary',
                      metricKey: metric,
                      color: Colors.brandSecondary200,
                      manualTags: primarySelectedSegment?.tags ?? [],
                    })}
                    {hasActiveComparison &&
                      renderMetric({
                        metric: secondaryMetricData,
                        resourceName: comparisonMetricsAvailable?.resource?.name ?? 'Loading...',
                        resourceId: compareWithResourceId ?? '',
                        datePair: dateRange,
                        columnKey: 'comparison',
                        metricKey: metric,
                        color: Colors.brandPrimary100,
                        manualTags: secondarySelectedSegment?.tags ?? [],
                      })}
                  </div>
                </LLMCardRowContextProvider>
              );
            })}
        </div>
      )}
    </>
  );
};

export const LLMPerformanceDashboard: React.FC = () => {
  return (
    <LLMDashboardContextProvider>
      <PerformancePanel />
    </LLMDashboardContextProvider>
  );
};
