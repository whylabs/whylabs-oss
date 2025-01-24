import { Box, Group, MantineNumberSize, Radio, RadioGroupProps, RadioProps, Stack, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { isString } from '~/utils/typeGuards';
import { ReactElement, ReactNode } from 'react';

import { InputLabelTooltip } from '../tooltip/InputLabelTooltip';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';

const useDefaultStyles = createStyles(() => ({
  radio: {
    cursor: 'pointer',
    '&:checked': {
      background: Colors.brandPrimary700,
      borderColor: Colors.brandPrimary700,
    },
  },
  inner: {
    alignSelf: 'center',
  },
  label: {
    cursor: 'pointer',
    fontWeight: 400,
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
  },
  groupLabel: {
    fontWeight: 600,
    color: Colors.secondaryLight900,
    fontFamily: 'Asap',
    lineHeight: 1.55,
  },
}));

export type WhyLabsRadioGroupOptions = Pick<RadioProps, 'classNames'> & {
  label: ReactNode;
  value: string;
};

export type WhyLabsRadioGroupProps = Pick<
  RadioGroupProps,
  'defaultValue' | 'error' | 'onChange' | 'required' | 'value' | 'size'
> &
  GenericInputProps & {
    options: WhyLabsRadioGroupOptions[];
    orientation?: 'row' | 'column';
    spacing?: MantineNumberSize;
    marginTop?: MantineNumberSize;
  };

const WhyLabsRadioGroup = ({
  disabled,
  disabledTooltip,
  hideLabel,
  label,
  options,
  orientation,
  spacing = 'xl',
  labelTooltip,
  marginTop = 'xs',
  size = 'xs',
  ...rest
}: WhyLabsRadioGroupProps): ReactElement => {
  const { classes } = useDefaultStyles();
  const FlexGroup = orientation === 'column' ? Stack : Group;
  return (
    <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
      <Box pos="relative" style={{ width: '100%' }}>
        <Radio.Group
          withAsterisk={rest.required}
          data-testid="WhyLabsRadioGroup"
          {...rest}
          aria-label={hideLabel && isString(label) ? label : undefined}
          label={hideLabel ? undefined : renderLabel()}
          classNames={{ label: classes.groupLabel }}
        >
          <FlexGroup mt={marginTop} spacing={spacing}>
            {options.map((n) => (
              <Radio key={n.value} classNames={classes} disabled={disabled} value={n.value} label={n.label} />
            ))}
          </FlexGroup>
        </Radio.Group>
      </Box>
    </TooltipWrapper>
  );

  function renderLabel() {
    if (hideLabel) return undefined;

    if (labelTooltip) return <InputLabelTooltip label={labelTooltip}>{label}</InputLabelTooltip>;

    return label;
  }
};

export default WhyLabsRadioGroup;
