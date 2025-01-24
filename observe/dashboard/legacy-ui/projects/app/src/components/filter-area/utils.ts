import { FilterKeys } from 'hooks/useFilterQueryString';
import { WhyLabsCheckboxGroupOptions } from 'components/design-system/checkbox/WhyLabsCheckboxGroup';

export type CheckBoxSection = {
  key: string;
  sectionLabel?: string;
  items: WhyLabsCheckboxGroupOptions[];
};

export interface FilterControlProps {
  filterKey?: FilterKeys;
  checkboxFilterList?: CheckBoxSection[];
  filterDropDownTitle?: string;
}

export const DEFAULT_COLUMN_FILTERS: CheckBoxSection[] = [
  {
    key: 'first_filter_section',
    items: [
      {
        label: 'Has anomalies',
        value: 'hasAnomalies',
      },
    ],
  },
  {
    sectionLabel: 'By discreteness',
    key: 'discreteness_filter_section',
    items: [
      {
        label: 'Inferred discrete',
        value: 'discrete',
      },
      {
        label: 'Inferred non-discrete',
        value: 'nonDiscrete',
      },
    ],
  },
];
