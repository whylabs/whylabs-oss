import { TextInput, TextInputProps } from '@mantine/core';
import { isString } from '~/utils/typeGuards';
import { ChangeEvent, forwardRef } from 'react';

import { InputLabelTooltip } from '../tooltip/InputLabelTooltip';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

export type WhyLabsTextInputProps = Pick<
  TextInputProps,
  | 'className'
  | 'defaultValue'
  | 'disabled'
  | 'error'
  | 'icon'
  | 'onFocus'
  | 'placeholder'
  | 'readOnly'
  | 'required'
  | 'value'
  | 'size'
  | 'type'
  | 'onKeyDown'
> &
  GenericInputProps & {
    onChange?: (value: string) => void;
  };

const WhyLabsTextInput = forwardRef<HTMLInputElement, WhyLabsTextInputProps>(
  (
    {
      disabledTooltip,
      hideLabel,
      label,
      labelTooltip,
      required,
      onChange,
      tooltipProps,
      size = 'sm',
      type = 'text',
      ...rest
    },
    ref,
  ) => {
    return (
      <TooltipWrapper {...tooltipProps} displayTooltip={rest.disabled} label={disabledTooltip}>
        <TextInput
          data-testid="WhyLabsTextInput"
          {...rest}
          aria-label={hideLabel && isString(label) ? label : undefined}
          label={hideLabel ? undefined : renderLabel()}
          onChange={onChange ? handleOnChange : undefined}
          radius="sm"
          ref={ref}
          size={size}
          withAsterisk={required}
          styles={{ label: { fontWeight: 600 } }}
          type={type}
        />
      </TooltipWrapper>
    );

    function renderLabel() {
      if (hideLabel) return undefined;

      if (labelTooltip) return <InputLabelTooltip label={labelTooltip}>{label}</InputLabelTooltip>;

      return label;
    }

    function handleOnChange({ target }: ChangeEvent<HTMLInputElement>) {
      onChange?.(target.value);
    }
  },
);

export default WhyLabsTextInput;
