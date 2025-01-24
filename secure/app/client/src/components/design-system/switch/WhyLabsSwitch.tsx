import { Switch, SwitchProps, createStyles } from '@mantine/core';
import { FC } from 'react';
import { Colors } from '~/assets/Colors';
import { isString } from '~/utils/typeGuards';

import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

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
    fontWeight: 700,
    fontSize: 12,
  },
}));

export type WhyLabsSwitchProps = Pick<
  SwitchProps,
  'onChange' | 'checked' | 'disabled' | 'defaultChecked' | 'size' | 'styles'
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
  size = 'lg',
  styles,
  defaultChecked,
  backgroundColor = Colors.chartPrimary,
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
      />
    </TooltipWrapper>
  );
};

export default WhyLabsSwitch;
