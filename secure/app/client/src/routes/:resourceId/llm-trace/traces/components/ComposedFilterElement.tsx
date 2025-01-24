import { createStyles } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { Colors } from '~/assets/Colors';
import { WhyLabsActionIcon, WhyLabsMultiSelect, WhyLabsSelect, WhyLabsTextInput } from '~/components/design-system';
import { ComposedFilter, ComposedFilterDimension } from '~/hooks/composed-filter/types';

const useStyles = createStyles(() => ({
  root: {
    alignItems: 'end',
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  title: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
    margin: 0,
    marginTop: 2,
  },
  value: {
    color: Colors.linkColor,
    fontSize: 16,
    lineHeight: '20px',
    margin: 0,
  },
  link: {
    textDecorationLine: 'underline',
  },
  dimensionInput: {
    width: 200,
  },
  conditionInput: {
    width: 160,
  },
  valueInput: {
    width: 320,
  },
}));

type ComposedFilterElementProps = {
  dimensionOptions: ComposedFilterDimension[];
  filter: ComposedFilter;
  onChangeCondition: (newCondition: string) => void;
  onChangeDimension: (newDimension: string | null) => void;
  onChangeValue: (newValue: string) => void;
  onDelete?: () => void;
  violationTagsOptions: string[];
};

const N_A_MESSAGE = 'Not applicable';

export const ComposedFilterElement = ({
  dimensionOptions,
  filter,
  onChangeCondition,
  onChangeDimension,
  onChangeValue,
  onDelete,
  violationTagsOptions,
}: ComposedFilterElementProps) => {
  const { classes } = useStyles();

  const {
    condition,
    conditionOptions,
    dimension,
    value,
    selectedDimension,
    shouldChooseCondition,
    shouldDisableValueByLackOfCondition,
  } = filter;

  const isListDimension = selectedDimension?.type === 'list';
  const isNumberDimension = selectedDimension?.type === 'number';
  const [selectInFocus, setSelectInFocus] = useState(false);

  const valueInput = (() => {
    const commonProps = {
      className: classes.valueInput,
      disabled: !selectedDimension || shouldDisableValueByLackOfCondition,
    };

    if (isListDimension && selectedDimension.value === 'violationTags') {
      return (
        <WhyLabsMultiSelect
          {...commonProps}
          onFocus={() => setSelectInFocus(true)}
          onBlur={() => setSelectInFocus(false)}
          concatenationToken={{ token: 'OR', position: selectInFocus ? 'afterEach' : 'between' }}
          clearable
          data={violationTagsOptions}
          maxInputHeight={60}
          label="Values"
          onChange={(values) => onChangeValue(values.join(','))}
          placeholder={`Select ${selectedDimension.label.toLowerCase()}`}
          value={value?.split(',') ?? []}
        />
      );
    }

    return (
      <WhyLabsTextInput
        {...commonProps}
        label="Value"
        onChange={onChangeValue}
        placeholder={getValuePlaceholder()}
        type={isNumberDimension ? 'number' : 'text'}
        value={value ?? ''}
      />
    );
  })();

  return (
    <div className={classes.root}>
      <WhyLabsSelect
        className={classes.dimensionInput}
        clearable
        data={dimensionOptions}
        label="Field/Attribute"
        onChange={onChangeDimension}
        placeholder="Select"
        value={dimension}
      />
      <WhyLabsSelect
        className={classes.conditionInput}
        data={conditionOptions ?? []}
        disabled={!shouldChooseCondition}
        label="Condition"
        onChange={onChangeCondition}
        placeholder={shouldChooseCondition ? 'Select' : N_A_MESSAGE}
        value={condition}
      />
      {valueInput}
      {!!onDelete && (
        <WhyLabsActionIcon label="Remove filter" labelAsTooltip onClick={onDelete} size={36}>
          <IconTrash color={Colors.secondaryLight1000} size={24} />
        </WhyLabsActionIcon>
      )}
    </div>
  );

  function getValuePlaceholder() {
    if (shouldDisableValueByLackOfCondition) return 'Choose a condition';
    if (dimension) return 'Type something';
    return N_A_MESSAGE;
  }
};
