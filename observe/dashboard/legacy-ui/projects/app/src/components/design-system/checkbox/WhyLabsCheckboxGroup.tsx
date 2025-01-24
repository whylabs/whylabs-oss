import {
  createStyles,
  Checkbox,
  CheckboxProps,
  CheckboxGroupProps,
  Group,
  Stack,
  MantineNumberSize,
} from '@mantine/core';
import { FC, ReactNode } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { isString } from 'utils/typeGuards';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';
import { InputLabelTooltip } from '../tooltip/InputLabelTooltip';

const useDefaultStyles = createStyles(() => ({
  optionLabel: {
    fontWeight: 400,
    '&[data-disabled] *': {
      color: Colors.secondaryLight700,
    },
  },
  checkbox: {
    '&:checked': {
      backgroundColor: Colors.brandPrimary600,
      borderColor: Colors.brandPrimary600,
    },
  },
  noWrap: {
    whiteSpace: 'nowrap',
  },
}));

export type WhyLabsCheckboxGroupOptions = Pick<CheckboxProps, 'classNames' | 'disabled'> & {
  label: ReactNode;
  value: string;
};

export type WhyLabsCheckboxGroupProps = Pick<
  CheckboxGroupProps,
  'defaultValue' | 'error' | 'onChange' | 'required' | 'value'
> &
  GenericInputProps & {
    options: WhyLabsCheckboxGroupOptions[];
    orientation?: 'row' | 'column';
    spacing?: MantineNumberSize;
    marginTop?: MantineNumberSize;
    noWrap?: boolean;
  };

const WhyLabsCheckboxGroup: FC<WhyLabsCheckboxGroupProps> = ({
  disabled,
  disabledTooltip,
  hideLabel,
  label,
  options,
  orientation,
  spacing = 'xl',
  labelTooltip,
  marginTop = 'xs',
  noWrap,
  ...rest
}) => {
  const { classes, cx } = useDefaultStyles();
  const FlexGroup = orientation === 'column' ? Stack : Group;
  return (
    <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
      <div style={{ width: '100%', position: 'relative' }}>
        <Checkbox.Group
          aria-label={hideLabel && isString(label) ? label : undefined}
          label={hideLabel ? undefined : renderLabel()}
          data-testid="WhyLabsCheckboxGroup"
          size="sm"
          withAsterisk={rest.required}
          {...rest}
        >
          <FlexGroup mt={marginTop} spacing={spacing} noWrap={noWrap}>
            {options.map((o) => renderOption({ ...o, disabled: disabled ?? o.disabled }))}
          </FlexGroup>
        </Checkbox.Group>
      </div>
    </TooltipWrapper>
  );

  function renderLabel() {
    if (hideLabel) return undefined;

    if (labelTooltip) return <InputLabelTooltip label={labelTooltip}>{label}</InputLabelTooltip>;

    return label;
  }

  function renderOption(option: WhyLabsCheckboxGroupOptions) {
    return (
      <Checkbox
        classNames={{ input: classes.checkbox, label: cx(classes.optionLabel, { [classes.noWrap]: noWrap }) }}
        key={option.value}
        {...option}
      />
    );
  }
};

export default WhyLabsCheckboxGroup;
