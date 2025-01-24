import { createStyles } from '@mantine/core';
import {
  GenericFlexColumnSelectItemData,
  SelectCustomItems,
  SelectorRowText,
  WhyLabsSelect,
} from '~/components/design-system';
import { JSX, ReactElement, useCallback, useState } from 'react';

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

const useStyles = createStyles({
  selectWrapper: {
    width: 240,
  },
});
export const WhyLabsSelectPlayground = (): JSX.Element => {
  const { classes } = useStyles();
  const commonPrimaryLabel = useCallback(
    (children: ReactElement) => <SelectorRowText type="label">{children}</SelectorRowText>,
    [],
  );

  const GENERIC_SIMPLE_OPTION: GenericFlexColumnSelectItemData[] = [
    { label: 'text1', value: '1' },
    { label: 'text2', value: '2' },
    { label: 'text3', value: '3' },
    { label: 'text4', value: '4' },
  ];

  const GENERIC_OPTION: GenericFlexColumnSelectItemData[] = [
    {
      label: 'model-0',
      group: 'MODELS GROUP',
      value: 'model-0',
      rows: [
        {
          textElementConstructor: commonPrimaryLabel,
          children:
            'Example of a long name that wraps lorem ipsum dolor sit amet consectetur. Fermentum nam at donec molestie malesuada tortor nulla (model-0)',
        },
        { element: <SelectorRowText type="secondary">Why: Labs</SelectorRowText> },
        { element: <SelectorRowText type="secondary">Another: text</SelectorRowText> },
      ],
    },
    {
      label: 'model-1',
      group: 'MODELS GROUP',
      value: 'model-1',
      rows: [
        {
          textElementConstructor: commonPrimaryLabel,
          children: 'Super model (model-1)',
        },
        { element: <SelectorRowText type="secondary">Woo: Hoo</SelectorRowText> },
        { element: <SelectorRowText type="secondary">Super: Cool</SelectorRowText> },
      ],
    },
    {
      label: 'dataset-1',
      group: 'DATASETS GROUP',
      value: 'dataset-1',
      rows: [
        {
          textElementConstructor: commonPrimaryLabel,
          children: 'My dataset (dataset-1))',
        },
        { element: <SelectorRowText type="secondary">Data: Set</SelectorRowText> },
        { element: <SelectorRowText type="secondary">Another: Text</SelectorRowText> },
      ],
    },
  ];

  const [selectStates, setSelectStates] = useState<{ [key: number]: string | null }>({
    0: SELECT_OPTIONS[0].value,
    1: SELECT_OPTIONS[2].value,
    2: SELECT_OPTIONS[5].value,
    3: SELECT_OPTIONS[9].value,
    4: GENERIC_OPTION[1].value,
    5: GENERIC_SIMPLE_OPTION[1].value,
    6: GENERIC_SIMPLE_OPTION[2].value,
  });

  return (
    <>
      <WhyLabsSelect
        data={SELECT_OPTIONS}
        label="Single select input (item component LabelWithLineBreak)"
        itemComponent={SelectCustomItems.LabelWithLineBreak}
        placeholder="Pick one"
        value={selectStates[0]}
        onChange={(value) => setSelectStates((c) => ({ ...c, 0: value }))}
      />
      <WhyLabsSelect
        data={SELECT_OPTIONS}
        label="Single select searchable=false (item component LabelWithLineBreakAndAnomalyCount)"
        placeholder="You can't search here"
        itemComponent={SelectCustomItems.LabelWithLineBreakAndAnomalyCount}
        searchable={false}
        value={selectStates[1]}
        onChange={(value) => setSelectStates((c) => ({ ...c, 1: value }))}
      />
      <WhyLabsSelect
        clearable
        data={SELECT_OPTIONS}
        label="Single select clearable=true"
        placeholder="Pick one"
        value={selectStates[2]}
        onChange={(value) => setSelectStates((c) => ({ ...c, 2: value }))}
      />
      <WhyLabsSelect
        clearable={false}
        data={SELECT_OPTIONS}
        label="Single select clearable=false"
        placeholder="Pick one"
        value={selectStates[3]}
        onChange={(value) => setSelectStates((c) => ({ ...c, 3: value }))}
      />
      <div className={classes.selectWrapper}>
        <WhyLabsSelect
          dropdownWidth={360}
          data={GENERIC_OPTION}
          label="Generic select items"
          itemComponent={SelectCustomItems.GenericFlexColumnItem}
          value={selectStates[4]}
          onChange={(value) => setSelectStates((c) => ({ ...c, 4: value }))}
        />
        <WhyLabsSelect
          dropdownWidth={360}
          data={GENERIC_SIMPLE_OPTION}
          label="Generic select items without children"
          itemComponent={SelectCustomItems.GenericFlexColumnItem}
          value={selectStates[5]}
          onChange={(value) => setSelectStates((c) => ({ ...c, 5: value }))}
        />
        <WhyLabsSelect
          dropdownWidth={360}
          data={GENERIC_SIMPLE_OPTION}
          label="Generic select items without icon"
          itemComponent={SelectCustomItems.GenericFlexColumnItemWithoutIcon}
          value={selectStates[6]}
          onChange={(value) => setSelectStates((c) => ({ ...c, 6: value }))}
        />
      </div>
    </>
  );
};
