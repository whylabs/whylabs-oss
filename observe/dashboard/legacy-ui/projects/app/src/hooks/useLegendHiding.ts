import { useReducer } from 'react';

function legendReducer(state: string[], action: string): string[] {
  const copyState = [...state];
  if (copyState.includes(action)) {
    copyState.splice(copyState.indexOf(action), 1);
  } else {
    copyState.push(action);
  }
  return copyState;
}

export function useLegendHiding(initialState?: string[]): [string[], React.Dispatch<string>] {
  return useReducer(legendReducer, initialState || []);
}
