import { createContext, useReducer } from 'react';

type GraphDomain = {
  min: number;
  max: number;
};

export interface CardRowState {
  primary?: GraphDomain;
  comparison?: GraphDomain;
}

function generateCardRowState(): CardRowState {
  return {};
}

const LLMCardRowContext = createContext<[CardRowState, React.Dispatch<Partial<CardRowState>>]>([
  generateCardRowState(),
  () => {
    /**/
  },
]);

function tabsReducer(state: CardRowState, updates: Partial<CardRowState>): CardRowState {
  return { ...state, ...updates };
}

const LLMCardRowContextProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [cardRowState, cardRowDispatch] = useReducer(tabsReducer, generateCardRowState());
  return <LLMCardRowContext.Provider value={[cardRowState, cardRowDispatch]}>{children}</LLMCardRowContext.Provider>;
};

export { LLMCardRowContext, LLMCardRowContextProvider };
