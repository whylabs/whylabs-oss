export type FilterDiscreteState = 'NoFilter' | 'JustDiscrete' | 'JustNonDiscrete';
interface FilterDiscreteProps {
  discrete: boolean;
  nonDiscrete: boolean;
}
export function getFilterDiscreteState(filterState: FilterDiscreteProps): FilterDiscreteState {
  const { discrete, nonDiscrete } = filterState;
  if (nonDiscrete && !discrete) {
    return 'JustNonDiscrete';
  }

  if (!nonDiscrete && discrete) {
    return 'JustDiscrete';
  }

  return 'NoFilter';
}
