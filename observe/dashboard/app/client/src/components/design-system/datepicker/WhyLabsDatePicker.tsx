import { DatePickerInput, DatePickerInputProps } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';
import { isString } from '~/utils/typeGuards';

import { InputLabelTooltip } from '../tooltip/InputLabelTooltip';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';
import { useDatePickerStyles } from './useDatePickerStyles';

export type WhyLabsDatePickerProps = Pick<
  DatePickerInputProps,
  | 'className'
  | 'defaultValue'
  | 'disabled'
  | 'error'
  | 'maxDate'
  | 'minDate'
  | 'onFocus'
  | 'onChange'
  | 'required'
  | 'value'
  | 'size'
> &
  GenericInputProps;

const WhyLabsDatePicker = ({
  disabledTooltip,
  hideLabel,
  label,
  labelTooltip,
  required,
  tooltipProps,
  size = 'sm',
  ...rest
}: WhyLabsDatePickerProps) => {
  const { classes } = useDatePickerStyles();
  return (
    <TooltipWrapper {...tooltipProps} displayTooltip={rest.disabled} label={disabledTooltip}>
      <DatePickerInput
        aria-label={hideLabel && isString(label) ? label : undefined}
        classNames={classes}
        data-testid="WhyLabsDatePicker"
        {...rest}
        icon={<IconCalendar size={14} />}
        label={hideLabel ? undefined : renderLabel()}
        // @ts-expect-error - This is a valid prop but TS doesn't know it
        placeholder="MM/DD/YYYY"
        radius="sm"
        size={size}
        styles={{ label: { fontWeight: 600 } }}
        valueFormat="MM/DD/YYYY"
        withAsterisk={required}
      />
    </TooltipWrapper>
  );

  function renderLabel() {
    if (hideLabel) return undefined;

    if (labelTooltip) return <InputLabelTooltip label={labelTooltip}>{label}</InputLabelTooltip>;

    return label;
  }
};

export default WhyLabsDatePicker;
