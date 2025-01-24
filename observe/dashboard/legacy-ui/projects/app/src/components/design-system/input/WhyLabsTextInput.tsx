import { TextInput, TextInputProps } from '@mantine/core';
import { ChangeEvent, forwardRef } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { isString } from 'utils/typeGuards';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

export type WhyLabsTextInputProps = Pick<
  TextInputProps,
  | 'defaultValue'
  | 'disabled'
  | 'error'
  | 'placeholder'
  | 'readOnly'
  | 'required'
  | 'value'
  | 'icon'
  | 'minLength'
  | 'maxLength'
  | 'size'
  | 'type'
  | 'onKeyDown'
> &
  GenericInputProps & {
    onChange?: (value: string) => void;
  };

const WhyLabsTextInput = forwardRef<HTMLInputElement, WhyLabsTextInputProps>(
  (
    { disabledTooltip, hideLabel, label, size = 'sm', required, onChange, tooltipProps, type = 'text', ...rest },
    ref,
  ) => {
    return (
      <TooltipWrapper {...tooltipProps} displayTooltip={rest.disabled} label={disabledTooltip}>
        <TextInput
          data-testid="WhyLabsTextInput"
          {...rest}
          aria-label={hideLabel && isString(label) ? label : undefined}
          label={hideLabel ? undefined : label}
          onChange={onChange ? handleOnChange : undefined}
          radius="sm"
          ref={ref}
          size={size}
          withAsterisk={required}
          styles={{ input: { color: Colors.brandSecondary900, fontSize: size === 'lg' ? 16 : '' } }}
          type={type}
        />
      </TooltipWrapper>
    );

    function handleOnChange({ target }: ChangeEvent<HTMLInputElement>) {
      onChange?.(target.value);
    }
  },
);

export default WhyLabsTextInput;
