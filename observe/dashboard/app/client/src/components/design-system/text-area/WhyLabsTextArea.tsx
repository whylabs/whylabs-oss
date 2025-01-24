import { Textarea, TextareaProps, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { isString } from '~/utils/typeGuards';
import { ChangeEvent, forwardRef } from 'react';

import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

export type WhyLabsTextareaProps = Pick<
  TextareaProps,
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
  | 'minRows'
  | 'maxRows'
  | 'className'
> &
  GenericInputProps & {
    onChange?: (value: string) => void;
  };

const useStyles = createStyles((_, { size }: { size: WhyLabsTextareaProps['size'] }) => ({
  input: { color: Colors.brandSecondary900, fontSize: size === 'lg' ? 16 : '' },
}));

const WhyLabsTextarea = forwardRef<HTMLTextAreaElement, WhyLabsTextareaProps>(
  ({ className, disabledTooltip, hideLabel, label, size = 'sm', required, onChange, tooltipProps, ...rest }, ref) => {
    const { classes, cx } = useStyles({ size });
    return (
      <TooltipWrapper {...tooltipProps} displayTooltip={rest.disabled} label={disabledTooltip}>
        <Textarea
          data-testid="WhyLabsTextarea"
          {...rest}
          aria-label={hideLabel && isString(label) ? label : undefined}
          label={hideLabel ? undefined : label}
          onChange={onChange ? handleOnChange : undefined}
          radius="sm"
          ref={ref}
          size={size}
          withAsterisk={required}
          classNames={{ input: cx(classes.input, className) }}
        />
      </TooltipWrapper>
    );

    function handleOnChange({ target }: ChangeEvent<HTMLTextAreaElement>) {
      onChange?.(target.value);
    }
  },
);

export default WhyLabsTextarea;
