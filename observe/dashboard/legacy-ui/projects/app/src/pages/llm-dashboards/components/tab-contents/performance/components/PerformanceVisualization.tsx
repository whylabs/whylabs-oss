import { useContext, useMemo } from 'react';
import { useResizeObserver } from '@mantine/hooks';
import { createStyles } from '@mantine/core';
import { AnalysisDataFragment, MetricKind, useGetContinuousMetricsAnalysisQuery } from 'generated/graphql';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { CommonDashboardVisualizationProps } from '../../utils';
import { MetricCardHeader } from '../../components/MetricCardHeader';
import { DashboardTabsContext } from '../../../../DashboardTabsContext';
import { LLMContinuousGraph } from '../../components/LLMContinuousGraph';
import { LLMGraphCardContext } from '../../contexts/LLMGraphCardContext';

const useStyles = createStyles(() => ({
  root: {
    position: 'relative',
  },
  vizWrapper: {
    position: 'absolute',
  },
}));

export const PerformanceVisualization: React.FC<CommonDashboardVisualizationProps> = ({
  navigationInformation,
  columnKey,
  name,
}) => {
  const { classes } = useStyles();
  const [{ metric, visualizationWidth, analyzerId }, cardStateDispatch] = useContext(LLMGraphCardContext);
  const [{ compareWithResourceId }] = useContext(DashboardTabsContext);
  const { dateRangeWithOneDayMinimumInterval: range, loading: loadingDateRange } = useSuperGlobalDateRange();
  const [ref, { width }] = useResizeObserver();

  if (visualizationWidth !== width) {
    cardStateDispatch({ visualizationWidth: width });
  }
  const analysisMetric = metric?.metadata?.queryDefinition?.metric;
  const { metricKind } = metric?.metadata ?? {};

  const { data: continuousAnalysis, loading: analysisLoading } = useGetContinuousMetricsAnalysisQuery({
    variables: {
      model: navigationInformation.resourceId,
      tags: navigationInformation?.segment?.tags ?? [],
      feature: metric?.metadata?.queryDefinition?.column ?? '',
      metrics: [analysisMetric!],
      ...range,
    },
    skip: !navigationInformation.resourceId || metricKind !== MetricKind.Amount || !analysisMetric || loadingDateRange,
  });
  const dispatchAnalyser = (id: string) => cardStateDispatch({ analyzerId: id });
  const analyzerAnalysisResults: AnalysisDataFragment[] = useMemo(
    () => continuousAnalysis?.analysisResults?.filter((an) => an?.analyzerId === analyzerId) ?? [],
    [continuousAnalysis?.analysisResults, analyzerId],
  );
  return (
    <div className={classes.root} ref={ref}>
      <div className={classes.vizWrapper}>
        <MetricCardHeader
          activeComparison={!!compareWithResourceId}
          analysisResults={continuousAnalysis?.analysisResults ?? []}
          analyzerId={analyzerId}
          dispatchAnalyzer={dispatchAnalyser}
          metric={metric}
          isLoading={analysisLoading}
        />
        <LLMContinuousGraph
          navigationInformation={navigationInformation}
          name={name}
          columnKey={columnKey}
          usedTimestamps={range}
          analysisResults={analyzerAnalysisResults}
        />
      </div>
    </div>
  );
};
