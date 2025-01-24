type ColumnListActionType = 'add' | 'clear';
export interface ColumnListAction {
  actionType: ColumnListActionType;
  data?: string[];
}

export function columnListReducer(state: string[], action: ColumnListAction): string[] {
  if (action.actionType === 'clear') return [];
  return [...new Set([...state, ...(action.data || [])])].sort();
}
