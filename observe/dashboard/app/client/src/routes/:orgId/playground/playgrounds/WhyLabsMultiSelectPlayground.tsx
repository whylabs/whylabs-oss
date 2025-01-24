import { WhyLabsMultiSelect } from '~/components/design-system';
import { JSX } from 'react';

const SELECT_OPTIONS = [
  { label: 'Argentina', value: 'Argentina' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Brazil', value: 'Brazil' },
  { label: 'Canada', value: 'Canada' },
  { label: 'China', value: 'China' },
  { label: 'Denmark', value: 'Denmark' },
  { label: 'Finland', value: 'Finland' },
  { label: 'France', value: 'France' },
  { label: 'Germany', value: 'Germany' },
  { label: 'India', value: 'India' },
  { label: 'Italy', value: 'Italy' },
  { label: 'Japan', value: 'Japan' },
  { label: 'Mexico', value: 'Mexico' },
  { label: 'Netherlands', value: 'Netherlands' },
  { label: 'Norway', value: 'Norway' },
  { label: 'Poland', value: 'Poland' },
  { label: 'Spain', value: 'Spain' },
  { label: 'Sweden', value: 'Sweden' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'United States', value: 'United States' },
  { label: 'Other', value: 'Other' },
];

export const WhyLabsMultiSelectPlayground = (): JSX.Element => {
  return (
    <>
      <WhyLabsMultiSelect
        data={SELECT_OPTIONS}
        label="Multi select searchable=false"
        placeholder="You can't search here"
        searchable={false}
      />
      <WhyLabsMultiSelect
        clearable
        data={SELECT_OPTIONS}
        defaultValue={[SELECT_OPTIONS[5].value]}
        label="Multi select clearable=true"
      />
      <WhyLabsMultiSelect
        clearable={false}
        data={SELECT_OPTIONS}
        defaultValue={[SELECT_OPTIONS[0].value, SELECT_OPTIONS[10].value]}
        label="Multi select clearable=false"
      />
    </>
  );
};
