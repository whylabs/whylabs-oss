import { useCallback, useContext, useMemo } from 'react';
import {
  AnalysisDataFragment,
  MetricKind,
  useGetContinuousMetricsAnalysisQuery,
  useGetFrequentItemsAnalysisQuery,
} from 'generated/graphql';
import { useResizeObserver } from '@mantine/hooks';
import { createStyles } from '@mantine/core';
import { DashboardTabsContext } from 'pages/llm-dashboards/DashboardTabsContext';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { LLMGraphCardContext } from '../../contexts/LLMGraphCardContext';
import { LLMContinuousGraph } from '../../components/LLMContinuousGraph';
import { SecurityDiscreteGraph } from './SecurityDiscreteGraph';
import { CommonDashboardVisualizationProps } from '../../utils';
import { MetricCardHeader } from '../../components/MetricCardHeader';

const useStyles = createStyles(() => ({
  root: {
    position: 'relative',
  },
  vizWrapper: {
    position: 'absolute',
  },
}));
interface SecurityVisualizationProps extends CommonDashboardVisualizationProps {
  usedTimestamps: SimpleDateRange;
  skip: boolean;
}
export const SecurityVisualization: React.FC<SecurityVisualizationProps> = ({
  usedTimestamps,
  columnKey,
  name,
  navigationInformation,
  skip,
}) => {
  const [{ metric, visualizationWidth, analyzerId }, cardStateDispatch] = useContext(LLMGraphCardContext);
  const [{ compareWithResourceId }] = useContext(DashboardTabsContext);
  const { classes } = useStyles();
  const analysisMetric = metric?.metadata?.queryDefinition?.metric;
  const [ref, { width }] = useResizeObserver();
  if (visualizationWidth !== width) {
    cardStateDispatch({ visualizationWidth: width });
  }

  const { metricKind } = metric?.metadata ?? {};
  const { data: frequentItemAnalysis, loading: distributionAnalysisLoading } = useGetFrequentItemsAnalysisQuery({
    variables: {
      model: navigationInformation.resourceId,
      tags: navigationInformation.segment?.tags ?? [],
      feature: metric?.metadata?.queryDefinition?.column ?? '',
      ...usedTimestamps,
    },
    skip:
      !navigationInformation.resourceId ||
      metricKind !== MetricKind.Distribution ||
      !metric?.metadata?.queryDefinition?.column ||
      skip,
  });

  const { data: continuousAnalysis, loading: continuousAnalysisLoading } = useGetContinuousMetricsAnalysisQuery({
    variables: {
      model: navigationInformation.resourceId,
      tags: navigationInformation.segment?.tags ?? [],
      feature: metric?.metadata?.queryDefinition?.column ?? '',
      metrics: [analysisMetric!],
      ...usedTimestamps,
    },
    skip:
      !navigationInformation.resourceId ||
      metricKind !== MetricKind.Amount ||
      !analysisMetric ||
      !metric?.metadata?.queryDefinition?.column ||
      skip,
  });

  const analysisLoading = distributionAnalysisLoading || continuousAnalysisLoading;

  const isDistribution = metricKind === MetricKind.Distribution;
  const analysisResults: AnalysisDataFragment[] = useMemo(
    () => (isDistribution ? frequentItemAnalysis?.analysisResults : continuousAnalysis?.analysisResults) ?? [],
    [continuousAnalysis?.analysisResults, frequentItemAnalysis?.analysisResults, isDistribution],
  );

  const dispatchAnalyser = (id: string) => cardStateDispatch({ analyzerId: id });

  const renderGraph = useCallback(() => {
    const selectedMonitorAnalysis = analysisResults.filter((an) => an.analyzerId === analyzerId);
    if (isDistribution) {
      return (
        <SecurityDiscreteGraph
          usedTimestamps={usedTimestamps}
          analysisResults={selectedMonitorAnalysis}
          columnKey={columnKey}
        />
      );
    }
    return (
      <LLMContinuousGraph
        columnKey={columnKey}
        usedTimestamps={usedTimestamps}
        analysisResults={selectedMonitorAnalysis}
        name={name}
        navigationInformation={navigationInformation}
      />
    );
  }, [analysisResults, analyzerId, columnKey, isDistribution, name, navigationInformation, usedTimestamps]);

  return (
    <div className={classes.root} ref={ref}>
      <div className={classes.vizWrapper}>
        <MetricCardHeader
          activeComparison={!!compareWithResourceId}
          analysisResults={analysisResults}
          isLoading={analysisLoading}
          analyzerId={analyzerId}
          dispatchAnalyzer={dispatchAnalyser}
          metric={metric}
        />
        {renderGraph()}
      </div>
    </div>
  );
};
