import { Card } from 'generated/dashboard-schema';
import { Reducer, useReducer } from 'react';

export type ToggleOnClickState = { [key: string]: number };
export type ToggleOnClickAction = { key: string };

export function toBinarySet(state?: ToggleOnClickState): Set<string> {
  const outputSet = new Set<string>();
  if (!state) {
    return outputSet;
  }
  Object.keys(state).forEach((key) => {
    if (state[key] % 2 === 1) {
      outputSet.add(key);
    }
  });
  return outputSet;
}

function handleSubgridClick(state: ToggleOnClickState, action: ToggleOnClickAction): ToggleOnClickState {
  if (Object.keys(state).includes(action.key)) {
    const updatedValue = (state[action.key] + 1) % 2;
    return { ...state, [action.key]: updatedValue };
  }
  return { ...state, [action.key]: 1 };
}

function handleNothing(state: ToggleOnClickState, _action: ToggleOnClickAction): ToggleOnClickState {
  return state;
}

export function isEmptyHandler(reducer: Reducer<ToggleOnClickState, ToggleOnClickAction>): boolean {
  const outputState = reducer({}, { key: 'test' });
  return !Object.keys(outputState).includes('test');
}

export function getClickableIndexCount(cardInfo: Card): number {
  if (!cardInfo.subGrid || !(cardInfo.graphParams?.type === 'stackedBarTimeSeries')) {
    return 0;
  }
  return cardInfo.subGrid.contents.length;
}

export function useCardInfoClickReducer(
  cardInfo: Card,
): readonly [ToggleOnClickState, React.Dispatch<ToggleOnClickAction>, boolean] {
  const initialState: ToggleOnClickState = {};
  let reducer: Reducer<ToggleOnClickState, ToggleOnClickAction>;
  if (cardInfo.graphParams?.type === 'stackedBarTimeSeries') {
    reducer = handleSubgridClick;
  } else {
    reducer = handleNothing;
  }
  const canHandleClicks = !isEmptyHandler(reducer);
  return [...useReducer(reducer, initialState), canHandleClicks] as const;
}
