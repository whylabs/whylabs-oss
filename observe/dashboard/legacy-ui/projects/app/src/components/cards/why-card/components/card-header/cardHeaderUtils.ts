import { AnalysisMetric } from 'generated/graphql';
import { TogglerItem } from 'components/chart-toggler/ChartToggler';
import { WhyCardState } from '../../WhyCardContext';

function toggleChart(showDefault: boolean, cardStateDispatch: (value: Partial<WhyCardState>) => void) {
  cardStateDispatch({
    showDefault,
  });
}

function countAnalysisResults(targetMetric: AnalysisMetric, whyState: WhyCardState) {
  // const filteredAnalysisResults = safeFilterAgainstMultipleAnalyzers(whyState.analysisResults, targetMetric);
  const filteredAnalysisResults = whyState.analysisResults.filter(
    (an) => an.metric === targetMetric && an.isAnomaly && !an.isFalseAlarm,
  );

  return filteredAnalysisResults.length;
}

export const getTogglerItems = (whyState: WhyCardState): TogglerItem[] => {
  if (whyState.decorationType === 'est_quantile_drift' || whyState.decorationType === 'drift_top_five')
    return [
      {
        label: 'Quantiles',
        alertNumber: countAnalysisResults(AnalysisMetric.Histogram, whyState),
      },
      {
        label: 'Frequent items',
        alertNumber: countAnalysisResults(AnalysisMetric.FrequentItems, whyState),
      },
    ];

  if (whyState.decorationType === 'est_missing_values' || whyState.decorationType === 'est_missing_ratios')
    return [
      {
        label: 'Count',
        alertNumber: countAnalysisResults(AnalysisMetric.CountNull, whyState),
      },
      {
        label: 'Ratio',
        alertNumber: countAnalysisResults(AnalysisMetric.CountNullRatio, whyState),
      },
    ];

  if (whyState.decorationType === 'est_unique_values' || whyState.decorationType === 'est_unique_ratio')
    return [
      {
        label: 'Count',
        alertNumber: countAnalysisResults(AnalysisMetric.UniqueEst, whyState),
      },
      {
        label: 'Ratio',
        alertNumber: countAnalysisResults(AnalysisMetric.UniqueEstRatio, whyState),
      },
    ];

  return [];
};

export const handleToggleChange = (
  selected: string,
  whyState: WhyCardState,
  cardStateDispatch: (value: Partial<WhyCardState>) => void,
): void => {
  if (whyState.decorationType === 'est_quantile_drift' || whyState.decorationType === 'drift_top_five') {
    const isQuantiles = selected === 'Quantiles';
    const showDefault = isQuantiles ? !whyState.isDiscrete : whyState.isDiscrete;
    const decorationType = isQuantiles ? 'est_quantile_drift' : 'drift_top_five';
    cardStateDispatch({ showDefault, decorationType });
  }
  if (
    ['est_missing_values', 'est_missing_ratios', 'est_unique_values', 'est_unique_ratio'].includes(
      whyState.decorationType,
    )
  ) {
    const showDefault = selected === 'Count';
    toggleChart(showDefault, cardStateDispatch);
  }
};

export const getDefaultToggleSelected = (whyState: WhyCardState): string | undefined => {
  switch (whyState.decorationType) {
    case 'drift_top_five':
      return 'Frequent items';
    case 'est_quantile_drift':
      return 'Quantiles';
    case 'est_missing_values':
    case 'est_unique_values':
      return 'Count';
    case 'est_missing_ratios':
    case 'est_unique_ratio':
      return 'Ratio';
  }
  return undefined;
};
