import { useContext, useEffect, useMemo } from 'react';
import { DashboardTabsContext } from 'pages/llm-dashboards/DashboardTabsContext';
import { FlexibleCard } from 'components/panels/llm/FlexibleCard';
import {
  MetricDataFragment,
  SegmentTag,
  TimePeriod,
  useGetMetricsByTagQuery,
  useGetModelBatchFrequencyQuery,
} from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { logErrorsIfDefined } from 'utils/logUtils';
import { WhyLabsNoDataPage } from 'components/empty-states/WhyLabsNoDataPage';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { NoDataMessagePage } from 'pages/no-data-message-page/NoDataMessagePage';
import {
  CardColumnKey,
  getCustomMetricHeroValue,
  mergeMetrics,
  metricDataToMapEntries,
} from 'pages/llm-dashboards/utils';
import { Colors } from '@whylabs/observatory-lib';
import {
  TEMP_COMPARED_END_DATE_RANGE,
  TEMP_COMPARED_RANGE_PRESET,
  TEMP_COMPARED_START_DATE_RANGE,
  TEMP_END_DATE_RANGE,
  TEMP_RANGE_PRESET,
  TEMP_START_DATE_RANGE,
} from 'types/navTags';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { SecurityVisualization } from './components/SecurityVisualization';
import {
  CardSkeleton,
  dashboardPanelStyles,
  MetricsCardsSkeleton,
  renderSummarySection,
  UnavailableMetricCard,
} from '../utils';
import { LLMDashboardContext, LLMDashboardContextProvider } from '../contexts/LLMDashboardContext';
import { LLMCardRowContextProvider } from '../contexts/LLMCardRowContext';
import { LLMGraphCardContextProvider } from '../contexts/LLMGraphCardContext';
import { DashboardHeader } from '../components/DashboardHeader';

export const SecurityPanel: React.FC = () => {
  useSetHtmlTitle('Security');
  const { classes } = dashboardPanelStyles();
  const [{ primaryMetrics, secondaryMetrics }, dashboardDispatch] = useContext(LLMDashboardContext);
  const [{ compareWithResourceId, primarySelectedSegment, secondarySelectedSegment }] =
    useContext(DashboardTabsContext);
  const {
    resourceState: { resource },
    loading: primaryModelInfoLoading,
  } = useResourceContext();
  const currentResourceBatchFrequency = resource?.batchFrequency ?? null;
  const { modelId } = usePageTypeWithParams();
  const { data: secondaryModelInfo, loading: secondaryModelInfoLoading } = useGetModelBatchFrequencyQuery({
    variables: {
      model: compareWithResourceId!,
    },
    skip: !compareWithResourceId,
  });

  const { dateRange, appliedPreset, loading: loadingDateRange } = useSuperGlobalDateRange();
  const {
    dateRange: { from: primaryStartTimestamp, to: primaryEndTimestamp },
    isUsingFallbackRange: primaryIsUsingFallbackRange,
    setDatePickerRange: setPrimaryRange,
  } = useSuperGlobalDateRange({
    startDateSearchParamKey: TEMP_START_DATE_RANGE,
    endDateSearchParamKey: TEMP_END_DATE_RANGE,
    dynamicPresetSearchParamKey: TEMP_RANGE_PRESET,
    loading: primaryModelInfoLoading,
    timePeriod: resource?.batchFrequency,
  });

  const {
    dateRange: { from: secondaryStartTimestamp, to: secondaryEndTimestamp },
  } = useSuperGlobalDateRange({
    startDateSearchParamKey: TEMP_COMPARED_START_DATE_RANGE,
    endDateSearchParamKey: TEMP_COMPARED_END_DATE_RANGE,
    dynamicPresetSearchParamKey: TEMP_COMPARED_RANGE_PRESET,
    loading: secondaryModelInfoLoading,
    timePeriod: secondaryModelInfo?.model?.batchFrequency,
  });

  const {
    data: primaryMetricsAvailable,
    loading: primaryMetricsLoading,
    error: primaryMetricsError,
  } = useGetMetricsByTagQuery({
    variables: {
      resourceId: modelId,
      tags: ['security'],
      from: primaryStartTimestamp ?? 0,
      to: primaryEndTimestamp ?? 0,
      granularity: currentResourceBatchFrequency ?? TimePeriod.P1D,
    },
    skip: primaryModelInfoLoading,
  });

  useEffect(() => {
    if (!loadingDateRange && primaryIsUsingFallbackRange) {
      setPrimaryRange(
        {
          from: dateRange.from,
          to: dateRange.to,
        },
        appliedPreset,
      );
    }
  }, [appliedPreset, dateRange, loadingDateRange, primaryIsUsingFallbackRange, setPrimaryRange]);

  const primaryMetricsArray = useMemo(
    () => primaryMetricsAvailable?.resource?.customMetrics ?? [],
    [primaryMetricsAvailable?.resource?.customMetrics],
  );

  useEffect(() => {
    if (primaryMetricsLoading) return;
    const metrics = metricDataToMapEntries(primaryMetricsArray);
    dashboardDispatch({ primaryMetrics: new Map(metrics) });
  }, [dashboardDispatch, primaryMetricsArray, primaryMetricsAvailable, primaryMetricsLoading]);

  const {
    data: secondaryMetricsAvailable,
    loading: secondaryMetricsLoading,
    error: secondaryMetricsError,
  } = useGetMetricsByTagQuery({
    variables: {
      resourceId: compareWithResourceId!,
      tags: ['security'],
      from: secondaryStartTimestamp ?? primaryStartTimestamp,
      to: secondaryEndTimestamp ?? primaryEndTimestamp,
      granularity: currentResourceBatchFrequency ?? TimePeriod.P1D,
    },
    skip: secondaryModelInfoLoading || !compareWithResourceId,
  });

  const secondaryMetricsArray = useMemo(
    () => secondaryMetricsAvailable?.resource?.customMetrics ?? [],
    [secondaryMetricsAvailable?.resource?.customMetrics],
  );
  useEffect(() => {
    if (secondaryMetricsLoading) return;
    const metrics = metricDataToMapEntries(secondaryMetricsArray);
    dashboardDispatch({ secondaryMetrics: new Map(metrics) });
  }, [dashboardDispatch, secondaryMetricsArray, secondaryMetricsAvailable, secondaryMetricsLoading]);

  const mergedMetrics = useMemo(() => {
    return mergeMetrics(primaryMetricsArray, secondaryMetricsArray);
  }, [primaryMetricsArray, secondaryMetricsArray]);

  logErrorsIfDefined(
    ['Could not load available metrics for primary resource', primaryMetricsError],
    ['Could not load available metrics for secondary resource', secondaryMetricsError],
  );

  const noDataUploaded = !resource?.dataAvailability?.latestTimestamp;

  const noProfilesInRange =
    !primaryMetricsLoading &&
    primaryMetricsAvailable?.resource?.customMetrics?.length === 0 &&
    !primaryModelInfoLoading;

  const renderCard = ({
    metric,
    resourceName,
    color,
    columnKey,
    profileString,
    resourceId,
    customDateRange,
    metricKey,
    manualTags,
  }: {
    metric?: MetricDataFragment;
    resourceName?: string;
    resourceId?: string | null;
    columnKey: CardColumnKey;
    metricKey: string;
    profileString: string | null;
    color: string;
    customDateRange: SimpleDateRange | null;
    manualTags: SegmentTag[];
  }) => {
    if ((columnKey === 'comparison' && secondaryMetricsLoading) || (columnKey === 'primary' && primaryMetricsLoading))
      return <CardSkeleton key={`${columnKey}--${metricKey}`} />;
    if (!metric) return <UnavailableMetricCard targetText={resourceName || resourceId || ''} />;
    const heroValue = getCustomMetricHeroValue(metric);
    const analysisMetric = metric?.metadata?.queryDefinition?.metric ?? 'UNKNOWN';
    const key = `${columnKey}--${metricKey}--${analysisMetric}`;
    const columnId = metric.metadata?.queryDefinition?.column ?? undefined;
    const segment = manualTags ? { tags: manualTags } : undefined;
    return (
      <div className={classes.graph} key={key}>
        <LLMGraphCardContextProvider metric={metric}>
          <FlexibleCard
            key={`${key}-summary`}
            summarySection={renderSummarySection({
              metric,
              resourceName: resourceName ?? 'Loading...',
              color,
              heroValue,
              selectedBatch: profileString,
              resourceId: resourceId ?? '',
              columnId,
              tags: segment?.tags,
            })}
            visualizationSection={
              <SecurityVisualization
                key={`${key}--card`}
                name={`${resourceId}--${metricKey}`}
                columnKey={columnKey}
                navigationInformation={{
                  columnId,
                  resourceId: resourceId ?? '',
                  segment,
                  customDateRange: customDateRange ?? undefined,
                }}
                usedTimestamps={{
                  from: customDateRange?.from ?? dateRange.from,
                  to: customDateRange?.to ?? dateRange.to,
                }}
                skip={!customDateRange && loadingDateRange}
              />
            }
          />
        </LLMGraphCardContextProvider>
      </div>
    );
  };

  const renderNoProfilesInRange = () => {
    return (
      <div className={classes.emptyState}>
        <WhyLabsNoDataPage
          maxContentWidth={900}
          title="No batches available in the selected date range"
          subtitle={<p>Set a different time window or use the batch profile lineage widget to set the date range.</p>}
        />
      </div>
    );
  };

  const totalLoading = primaryModelInfoLoading || primaryMetricsLoading;

  const usedSecondaryStartTimestamp = secondaryStartTimestamp ?? primaryStartTimestamp;
  const usedSecondaryEndTimestamp = secondaryEndTimestamp ?? primaryEndTimestamp;
  const renderContent = () => {
    return (
      <div className={classes.newRoot}>
        {totalLoading && <MetricsCardsSkeleton key="security--primary" />}
        {!totalLoading &&
          mergedMetrics.map((metric) => {
            const primaryMetricData = primaryMetrics.get(metric);
            const secondaryMetricData = secondaryMetrics.get(metric);
            return (
              <LLMCardRowContextProvider key={`${metric}--card-row`}>
                <div className={classes.graphRow}>
                  {renderCard({
                    metric: primaryMetricData,
                    profileString: primaryModelInfoLoading
                      ? null
                      : `${primaryStartTimestamp}-to-${primaryEndTimestamp}`,
                    columnKey: 'primary',
                    metricKey: metric,
                    resourceId: modelId,
                    resourceName: primaryMetricsAvailable?.resource?.name,
                    customDateRange: primaryModelInfoLoading
                      ? null
                      : { from: primaryStartTimestamp!, to: primaryEndTimestamp! },
                    color: Colors.brandSecondary200,
                    manualTags: primarySelectedSegment?.tags ?? [],
                  })}
                  {compareWithResourceId &&
                    renderCard({
                      metric: secondaryMetricData,
                      profileString: secondaryModelInfoLoading
                        ? null
                        : `${usedSecondaryStartTimestamp}-to-${usedSecondaryEndTimestamp}`,
                      columnKey: 'comparison',
                      metricKey: metric,
                      resourceId: compareWithResourceId,
                      resourceName: secondaryMetricsAvailable?.resource?.name,
                      customDateRange: secondaryModelInfoLoading
                        ? null
                        : { from: usedSecondaryStartTimestamp!, to: usedSecondaryEndTimestamp! },
                      color: Colors.brandSecondary100,
                      manualTags: secondarySelectedSegment?.tags ?? [],
                    })}
                </div>
              </LLMCardRowContextProvider>
            );
          })}
      </div>
    );
  };

  const renderPageContent = () => {
    if (primaryModelInfoLoading)
      return (
        <div className={classes.newRoot}>
          <MetricsCardsSkeleton key="security--primary" />
        </div>
      );
    if (noDataUploaded) return <NoDataMessagePage />;
    if (noProfilesInRange) return renderNoProfilesInRange();
    return renderContent();
  };

  return (
    <>
      <DashboardHeader />
      <div id="test-drawer-parent" style={{ position: 'relative' }}>
        {renderPageContent()}
      </div>
    </>
  );
};

export const LLMSecurityDashboard: React.FC = () => {
  return (
    <LLMDashboardContextProvider>
      <SecurityPanel />
    </LLMDashboardContextProvider>
  );
};
