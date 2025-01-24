import React, { useReducer, createContext } from 'react';
import { SuperPickerContext } from './utils';

function generatePickerState(): SuperPickerContext {
  return { opened: false };
}

const DatePickerContext = createContext<[SuperPickerContext, React.Dispatch<Partial<SuperPickerContext>>]>([
  generatePickerState(),
  () => {
    /**/
  },
]);

function resourceReducer(state: SuperPickerContext, action: Partial<SuperPickerContext>): SuperPickerContext {
  if (!Object.keys(action)) return state;
  return { ...state, ...action };
}

const DatePickerContextProvider = (props: { children: React.ReactNode }): React.ReactElement => {
  const { children } = props;
  const reducer = useReducer(resourceReducer, generatePickerState());
  return <DatePickerContext.Provider value={reducer}>{children}</DatePickerContext.Provider>;
};

export { DatePickerContext, DatePickerContextProvider };
