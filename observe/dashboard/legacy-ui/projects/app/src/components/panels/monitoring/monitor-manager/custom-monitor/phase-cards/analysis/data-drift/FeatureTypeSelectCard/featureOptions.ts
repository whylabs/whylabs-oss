export const featureSelectionOptions = [
  {
    value: 'all',
    label: 'All columns of this type',
    tooltip: 'All columns of this type',
  },
  {
    value: 'selected',
    label: 'Manually select columns of this type',
    tooltip: 'Manually select columns of this type',
  },
  {
    value: 'top_k',
    label: 'Most important columns of this type',
    tooltip: 'Most important columns of this type',
  },
] as const;

export type FeatureSelection = typeof featureSelectionOptions[number]['value'];
