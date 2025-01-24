import { useReducer } from 'react';

export interface HoverState {
  [key: string]: boolean;
}

export interface HoverAction {
  type: 'add' | 'remove' | 'clear';
  value: string;
}

function hoverReducer(state: HoverState, action: HoverAction): HoverState {
  const nextValue = { ...state };
  if (action.type === 'add') {
    nextValue[action.value] = true;
  } else if (action.type === 'remove') {
    nextValue[action.value] = false;
  } else {
    return {};
  }
  return nextValue;
}

export function useHover(): [HoverState, React.Dispatch<HoverAction>] {
  return useReducer(hoverReducer, {});
}
