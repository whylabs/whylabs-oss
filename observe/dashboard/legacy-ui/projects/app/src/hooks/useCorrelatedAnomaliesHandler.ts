import { useSearchParams } from 'react-router-dom';
import { useContext } from 'react';
import { AnalysisContext, AnalysisState } from '../pages/shared/AnalysisContext';
import { ACTIVE_CORRELATED_COLUMN, ACTIVE_CORRELATED_TYPE, SELECTED_TIMESTAMP } from '../types/navTags';

type CorrelatedAnomaliesHandlerReturnType = {
  handleShowCorrelated(newState: Partial<AnalysisState>): void;
};
export const useCorrelatedAnomaliesHandler = (): CorrelatedAnomaliesHandlerReturnType => {
  const [, setParams] = useSearchParams();
  const [, analysisDispatch] = useContext(AnalysisContext);

  const handleShowCorrelated = (newState: Partial<AnalysisState>) => {
    const { activeCorrelatedAnomalies, selectedCorrelatedTimestamp } = newState;
    setParams((params) => {
      const { interactionCardType, referenceFeature } = activeCorrelatedAnomalies ?? {};
      if (selectedCorrelatedTimestamp) {
        params.set(SELECTED_TIMESTAMP, selectedCorrelatedTimestamp.toString());
      } else {
        params.delete(SELECTED_TIMESTAMP);
      }
      if (interactionCardType && referenceFeature) {
        params.set(ACTIVE_CORRELATED_COLUMN, referenceFeature);
        params.set(ACTIVE_CORRELATED_TYPE, interactionCardType);
      } else {
        params.delete(ACTIVE_CORRELATED_COLUMN);
        params.delete(ACTIVE_CORRELATED_TYPE);
      }
      return params;
    });
    analysisDispatch(newState);
  };

  return { handleShowCorrelated };
};
