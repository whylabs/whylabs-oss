import { TextInput, TextInputProps, createStyles } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { isString } from '~/utils/typeGuards';
import { useRef } from 'react';

import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

export type WhyLabsSearchInputProps = Pick<
  TextInputProps,
  'className' | 'disabled' | 'placeholder' | 'value' | 'defaultValue' | 'error' | 'onKeyDown'
> &
  GenericInputProps & {
    onChange?: (value: string) => void;
    variant?: 'borderless' | 'default';
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
      : {},
  clearButton: {
    cursor: 'pointer',
  },
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
    classes: { input, clearButton },
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
        icon={<IconSearch size={18} stroke={3} color={Colors.brandSecondary700} />}
        defaultValue={defaultValue}
        rightSection={
          <IconX
            color={Colors.brandSecondary700}
            size={18}
            visibility={hasData ? 'visible' : 'hidden'}
            className={clearButton}
            onClick={() => {
              if (ref.current?.value) ref.current.value = '';
              handleOnChange('');
            }}
          />
        }
        classNames={{ input: cx(input, className) }}
      />
    </TooltipWrapper>
  );

  function handleOnChange(value: string) {
    onChange?.(value);
  }
};

export default WhyLabsSearchInput;
