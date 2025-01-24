import { NumberInput, NumberInputProps } from '@mantine/core';
import { isString } from '~/utils/typeGuards';
import { FC } from 'react';

import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

const LOADING_MESSAGE = 'Loading...';

export type WhyLabsInputNumberProps = Pick<
  NumberInputProps,
  | 'onChange'
  | 'placeholder'
  | 'disabled'
  | 'min'
  | 'max'
  | 'step'
  | 'precision'
  | 'value'
  | 'defaultValue'
  | 'required'
  | 'styles'
> &
  GenericInputProps;

const WhyLabsNumberInput: FC<WhyLabsInputNumberProps> = ({
  onChange,
  placeholder,
  disabledTooltip,
  hideLabel,
  label,
  loading,
  required,
  ...rest
}) => {
  return (
    <TooltipWrapper displayTooltip={rest.disabled} label={disabledTooltip}>
      <NumberInput
        placeholder={getPlaceholder()}
        onChange={onChange}
        aria-label={hideLabel && isString(label) ? label : undefined}
        label={hideLabel ? undefined : label}
        data-testid="WhyLabsNumberInput"
        withAsterisk={required}
        {...rest}
        radius="sm"
        size="sm"
        styles={{ label: { fontWeight: 600 } }}
      />
    </TooltipWrapper>
  );

  function getPlaceholder() {
    if (loading) return LOADING_MESSAGE;
    return placeholder || `Insert ${isString(label) ? label.toLowerCase() : ''}`;
  }
};

export default WhyLabsNumberInput;
