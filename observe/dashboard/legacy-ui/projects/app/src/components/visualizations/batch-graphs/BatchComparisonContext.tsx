import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { createContext, useContext } from 'react';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { generateEmptyBaselineChartState, useHistogramCache } from './useHistogramCache';
import { BaselineChartAction, BaselineChartState } from './batchGraphTypes';

interface BatchComparisonState {
  datasetId: string;
  histogramState: BaselineChartState;
}

function generateEmptyState(startingBaselineState?: BaselineChartState) {
  return {
    datasetId: '',
    histogramState: startingBaselineState ?? generateEmptyBaselineChartState(),
  };
}

export const BatchComparisonContext = createContext<[BatchComparisonState, React.Dispatch<BaselineChartAction>]>([
  generateEmptyState(),
  () => {
    /**/
  },
]);

export const BatchComparisonContextProvider = (props: { children: React.ReactNode }): JSX.Element => {
  const { children } = props;
  const params = usePageTypeWithParams();
  const [cardState] = useContext(WhyCardContext);

  const { histogramState, histogramDispatch } = useHistogramCache(params.modelId, params.featureId, cardState.analyzer);
  const emptyState = generateEmptyState(histogramState);

  return (
    <BatchComparisonContext.Provider value={[emptyState, histogramDispatch]}>
      {children}
    </BatchComparisonContext.Provider>
  );
};
