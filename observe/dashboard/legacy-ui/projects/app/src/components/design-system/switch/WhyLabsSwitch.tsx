import { createStyles, Switch, SwitchProps } from '@mantine/core';
import { FC } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';
import { isString } from '../../../utils/typeGuards';

const useDefaultStyles = createStyles((_, { backgroundColor }: { backgroundColor?: string }) => ({
  root: {
    '& input + label': {
      border: 'unset',
    },
    '& input:checked + label': {
      backgroundColor,
    },
  },
  trackLabel: {
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: 12,
  },
}));

export type WhyLabsSwitchProps = Pick<
  SwitchProps,
  'onChange' | 'checked' | 'disabled' | 'defaultChecked' | 'size' | 'styles' | 'id'
> & {
  backgroundColor?: string;
} & Pick<GenericInputProps, 'disabledTooltip' | 'hideLabel' | 'label'>;

const WhyLabsSwitch: FC<WhyLabsSwitchProps> = ({
  onChange,
  checked,
  disabled,
  disabledTooltip,
  hideLabel,
  label,
  size,
  styles,
  defaultChecked,
  backgroundColor = Colors.brandPrimary600,
  ...rest
}) => {
  const { classes } = useDefaultStyles({ backgroundColor });
  return (
    <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
      <Switch
        classNames={classes}
        checked={checked}
        onChange={onChange}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-label={hideLabel && isString(label) ? label : undefined}
        label={hideLabel ? undefined : label}
        data-testid="WhyLabsSwitch"
        styles={{ label: { fontWeight: 600, ...styles } }}
        size={size}
        onLabel="ON"
        offLabel="OFF"
        {...rest}
      />
    </TooltipWrapper>
  );
};

export default WhyLabsSwitch;
