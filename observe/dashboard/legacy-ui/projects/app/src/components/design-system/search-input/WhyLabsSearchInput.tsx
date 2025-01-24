import { createStyles, TextInput, TextInputProps } from '@mantine/core';
import { useRef } from 'react';
import { IconX, IconSearch } from '@tabler/icons';
import { Colors } from '@whylabs/observatory-lib';
import { isString } from 'utils/typeGuards';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

export type WhyLabsSearchInputProps = Pick<
  TextInputProps,
  'disabled' | 'placeholder' | 'value' | 'defaultValue' | 'className' | 'onBlur' | 'onFocus'
> &
  GenericInputProps & {
    onChange?: (value: string) => void;
    variant?: 'borderless' | 'default' | 'darker-border';
  };

const useSearchStyles = createStyles((_, variant: WhyLabsSearchInputProps['variant']) => ({
  input:
    variant === 'borderless'
      ? {
          borderBottom: `1px solid ${Colors.brandSecondary700}`,
          '&:focus': {
            borderBottom: `2px solid ${Colors.brandPrimary700}`,
          },
        }
      : {
          borderColor: variant === 'darker-border' ? Colors.secondaryLight700 : Colors.mantineLightGray,
        },
  clearButton: {
    cursor: 'pointer',
  },
  icon:
    variant === 'darker-border'
      ? {
          width: 40,
        }
      : {},
}));

const WhyLabsSearchInput = ({
  disabledTooltip,
  hideLabel,
  label,
  onChange,
  tooltipProps,
  defaultValue,
  variant = 'default',
  className,
  ...rest
}: WhyLabsSearchInputProps): JSX.Element => {
  const {
    classes: { input, clearButton, icon },
    cx,
  } = useSearchStyles(variant);
  const ref = useRef<HTMLInputElement>(null);
  const hasData = typeof rest.value !== 'undefined' ? !!rest.value : !!defaultValue;

  return (
    <TooltipWrapper {...tooltipProps} displayTooltip={rest.disabled} label={disabledTooltip}>
      <TextInput
        data-testid="WhyLabsSearchInput"
        {...rest}
        aria-label={hideLabel && isString(label) ? label : undefined}
        label={hideLabel ? undefined : label}
        onChange={({ target }) => handleOnChange(target.value)}
        variant={variant === 'borderless' ? 'unstyled' : 'default'}
        size="sm"
        ref={ref}
        icon={
          <IconSearch
            size={variant === 'darker-border' ? 16 : 18}
            stroke={3}
            color={variant === 'darker-border' ? Colors.secondaryLight1000 : Colors.brandSecondary700}
          />
        }
        defaultValue={defaultValue}
        rightSection={
          hasData && (
            <IconX
              color={Colors.brandSecondary700}
              size={18}
              className={clearButton}
              onClick={(e) => {
                if (ref.current?.value) ref.current.value = '';
                handleOnChange('');
                ref.current?.focus();
              }}
            />
          )
        }
        classNames={{ input: cx(input, className), icon }}
      />
    </TooltipWrapper>
  );

  function handleOnChange(value: string) {
    onChange?.(value);
  }
};

export default WhyLabsSearchInput;
