import {
  Box,
  Checkbox,
  CheckboxGroupProps,
  CheckboxProps,
  Group,
  MantineNumberSize,
  Stack,
  createStyles,
} from '@mantine/core';
import { FC, ReactNode } from 'react';
import { Colors } from '~/assets/Colors';
import { isString } from '~/utils/typeGuards';

import { InputLabelTooltip } from '../tooltip/InputLabelTooltip';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

const useDefaultStyles = createStyles(() => ({
  optionLabel: {
    fontWeight: 400,
  },
  icon: {
    color: 'white',
  },
  input: {
    '&:checked': {
      backgroundColor: Colors.brandPrimary700,
      borderColor: Colors.brandPrimary700,
    },
  },
  inputBackground: {
    backgroundColor: Colors.brandPrimary700,
    borderColor: Colors.brandPrimary700,
  },
}));

export type WhyLabsCheckboxGroupOptions = Pick<CheckboxProps, 'classNames' | 'indeterminate'> & {
  label: ReactNode;
  value: string;
};

export type WhyLabsCheckboxGroupProps = Pick<
  CheckboxGroupProps,
  'classNames' | 'defaultValue' | 'error' | 'onChange' | 'required' | 'value' | 'size'
> &
  GenericInputProps & {
    options: WhyLabsCheckboxGroupOptions[];
    orientation?: 'row' | 'column';
    spacing?: MantineNumberSize;
    marginTop?: MantineNumberSize;
  };

const WhyLabsCheckboxGroup: FC<WhyLabsCheckboxGroupProps> = ({
  darkBackground,
  disabled,
  disabledTooltip,
  hideLabel,
  label,
  options,
  orientation,
  spacing = 'xl',
  labelTooltip,
  marginTop = 'xs',
  size = 'sm',
  ...rest
}) => {
  const { classes, cx } = useDefaultStyles();
  const FlexGroup = orientation === 'column' ? Stack : Group;

  return (
    <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
      <Box pos="relative" style={{ width: '100%' }}>
        <Checkbox.Group
          aria-label={hideLabel && isString(label) ? label : undefined}
          label={hideLabel ? undefined : renderLabel()}
          data-testid="WhyLabsCheckboxGroup"
          size={size}
          withAsterisk={rest.required}
          {...rest}
        >
          <FlexGroup mt={marginTop} spacing={spacing}>
            {options.map(renderOption)}
          </FlexGroup>
        </Checkbox.Group>
      </Box>
    </TooltipWrapper>
  );

  function renderLabel() {
    if (hideLabel) return undefined;

    if (labelTooltip) return <InputLabelTooltip label={labelTooltip}>{label}</InputLabelTooltip>;

    return label;
  }

  function renderOption({ classNames, indeterminate, ...optionProps }: WhyLabsCheckboxGroupOptions) {
    const indeterminateStyle = indeterminate ? classes.inputBackground : undefined;
    return (
      <Checkbox
        disabled={disabled}
        indeterminate={indeterminate}
        classNames={{
          ...classNames,
          input: cx(classes.input, indeterminateStyle, classNames?.input),
          label: cx(classes.optionLabel, classNames?.label),
          icon: cx(classes.icon, classNames?.icon),
        }}
        key={optionProps.value}
        {...optionProps}
      />
    );
  }
};

export default WhyLabsCheckboxGroup;
