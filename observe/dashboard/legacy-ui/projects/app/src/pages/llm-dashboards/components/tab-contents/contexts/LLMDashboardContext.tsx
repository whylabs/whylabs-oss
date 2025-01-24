import { createContext, useReducer } from 'react';
import { MetricDataFragment } from 'generated/graphql';

export interface DashboardState {
  primaryMetrics: Map<string, MetricDataFragment>;
  secondaryMetrics: Map<string, MetricDataFragment>;
}

function generateDashboardState(): DashboardState {
  return {
    primaryMetrics: new Map(),
    secondaryMetrics: new Map(),
  };
}

const LLMDashboardContext = createContext<[DashboardState, React.Dispatch<Partial<DashboardState>>]>([
  generateDashboardState(),
  () => {
    /**/
  },
]);

function tabsReducer(state: DashboardState, updates: Partial<DashboardState>): DashboardState {
  return { ...state, ...updates };
}

const LLMDashboardContextProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [tabsState, tabsDispatch] = useReducer(tabsReducer, generateDashboardState());
  return <LLMDashboardContext.Provider value={[tabsState, tabsDispatch]}>{children}</LLMDashboardContext.Provider>;
};

export { LLMDashboardContext, LLMDashboardContextProvider };
