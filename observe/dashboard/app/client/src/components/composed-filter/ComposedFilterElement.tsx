import { SelectItem, createStyles } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import {
  WhyLabsActionIcon,
  WhyLabsMultiSelect,
  WhyLabsSelect,
  WhyLabsText,
  WhyLabsTextInput,
} from '~/components/design-system';
import { ComposedFilter, ComposedFilterDimension, ComposedFilterOption } from '~/hooks/composed-filter/types';

import { GenericFlexColumnItemWithoutIcon } from '../design-system/select/custom-items/GenericFlexColumnItemWithoutIcon';

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
  deleteButton: {
    height: 36,
  },
  label: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.55,
    margin: 0,
    marginTop: 2,
  },
  filterConditionTextContainer: {
    alignItems: 'center',
    background: Colors.disabledInputGray,
    borderLeft: `1px solid ${Colors.secondaryLight1000}`,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    display: 'flex',
    fontFamily: 'Inconsolata',
    fontSize: 14,
    height: 36,
    paddingLeft: 14,
    width: 90,
  },
  filterConditionText: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Inconsolata',
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
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

export type ListFilterOption = SelectItem & { color?: string; backgroundColor?: string };

type ComposedFilterElementProps = {
  conditionOptions: ComposedFilterOption[];
  dimensionOptions: ComposedFilterDimension[];
  filter: ComposedFilter;
  filterIndex: number;
  getListFilterOptionsFor: (dimension: string) => ListFilterOption[];
  onChangeCondition: (newCondition: string) => void;
  onChangeDimension: (newDimension: string | null) => void;
  onChangeValue: (newValue: string) => void;
  onDelete?: () => void;
  hideConditionSelection?: boolean;
  isLoadingOptions?: boolean;
};

const N_A_MESSAGE = 'Not applicable';

export const ComposedFilterElement = ({
  conditionOptions,
  dimensionOptions,
  filter,
  filterIndex,
  getListFilterOptionsFor,
  onChangeCondition,
  onChangeDimension,
  onChangeValue,
  onDelete,
  hideConditionSelection,
  isLoadingOptions,
}: ComposedFilterElementProps) => {
  const { classes } = useStyles();

  const hideLabels = filterIndex > 0;

  const {
    condition,
    dimension,
    value,
    selectedDimension,
    shouldChooseCondition,
    shouldDisableValueByLackOfCondition,
    notApplicableValue,
  } = filter;

  const isListDimension = selectedDimension?.type === 'list';
  const isNumberDimension = selectedDimension?.type === 'number';

  const valueInput = (() => {
    const commonProps = {
      className: classes.valueInput,
      disabled: !selectedDimension || shouldDisableValueByLackOfCondition || notApplicableValue,
      hideLabel: hideLabels,
    };

    if (isListDimension) {
      const listFilterOptions: ListFilterOption[] = (() => {
        if (dimension) return getListFilterOptionsFor(dimension);
        return [];
      })();

      return (
        <WhyLabsMultiSelect
          {...commonProps}
          concatenationToken={{ token: 'OR', position: 'between' }}
          clearable
          data={listFilterOptions}
          loading={isLoadingOptions && !listFilterOptions.length}
          maxInputHeight={36}
          label="Values"
          onChange={(values) => onChangeValue(values.join(','))}
          placeholder={notApplicableValue ? N_A_MESSAGE : `Select ${selectedDimension.label.toLowerCase()}`}
          value={value?.split(',') ?? []}
          withinPortal={false}
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
      <div>
        {!hideLabels && <WhyLabsText className={classes.label}>Filter</WhyLabsText>}
        <div className={classes.filterConditionTextContainer}>
          <WhyLabsText className={classes.filterConditionText}>{filterIndex > 0 ? 'AND' : 'WHERE'}</WhyLabsText>
        </div>
      </div>
      <WhyLabsSelect
        className={classes.dimensionInput}
        clearable
        data={dimensionOptions}
        hideLabel={hideLabels}
        label="Field/Attribute"
        onChange={onChangeDimension}
        placeholder="Select"
        value={dimension}
        withinPortal={false}
      />
      {!hideConditionSelection && (
        <WhyLabsSelect
          className={classes.conditionInput}
          data={conditionOptions ?? []}
          disabled={!shouldChooseCondition}
          hideLabel={hideLabels}
          itemComponent={GenericFlexColumnItemWithoutIcon}
          label="Condition"
          onChange={onChangeCondition}
          placeholder={shouldChooseCondition ? 'Select' : N_A_MESSAGE}
          value={condition}
          withinPortal={false}
        />
      )}

      {valueInput}
      {!!onDelete && (
        <WhyLabsActionIcon className={classes.deleteButton} label="Remove filter" labelAsTooltip onClick={onDelete}>
          <IconTrash color={Colors.secondaryLight1000} size={18} strokeWidth="1.5px" />
        </WhyLabsActionIcon>
      )}
    </div>
  );

  function getValuePlaceholder() {
    if (notApplicableValue) return N_A_MESSAGE;
    if (shouldDisableValueByLackOfCondition) return 'Choose a condition';
    if (dimension) return 'Type something';
    return N_A_MESSAGE;
  }
};
