import { MetricDataFragment } from 'generated/graphql';
import { useReducer, createContext } from 'react';

export interface LLMGraphCardState {
  metric: MetricDataFragment | null;
  visualizationWidth: number;
  analyzerId: string | null;
}

function generateCardState(metric?: MetricDataFragment | null): LLMGraphCardState {
  return {
    metric: metric ?? null,
    visualizationWidth: 0,
    analyzerId: null,
  };
}

const LLMGraphCardContext = createContext<[LLMGraphCardState, React.Dispatch<Partial<LLMGraphCardState>>]>([
  generateCardState(),
  () => {
    /**/
  },
]);

function cardReducer(state: LLMGraphCardState, updates: Partial<LLMGraphCardState>): LLMGraphCardState {
  return { ...state, ...updates };
}

const LLMGraphCardContextProvider = (props: { children: React.ReactNode; metric: MetricDataFragment }): JSX.Element => {
  const { children, metric } = props;
  const [cardState, cardDispatch] = useReducer(cardReducer, generateCardState(metric));

  if (metric !== cardState.metric) {
    cardDispatch({ metric });
  }
  return <LLMGraphCardContext.Provider value={[cardState, cardDispatch]}>{children}</LLMGraphCardContext.Provider>;
};

export { LLMGraphCardContext, LLMGraphCardContextProvider };
