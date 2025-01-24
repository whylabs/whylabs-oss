import { Input, InputBase, createStyles } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';
import { useContext } from 'react';
import { Colors } from '~/assets/Colors';
import { WhyLabsDropDown, WhyLabsText } from '~/components/design-system';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { DATE_END_QUERY_NAME, DATE_START_QUERY_NAME, PRESET_RANGE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { TimePeriod } from '~server/types/api';

import { useDateRangeString } from './hooks/useDateRangeString';
import { DatePickerContext, DatePickerContextProvider } from './PickerContext';
import { SuperDateRangeSelector } from './SuperDateRangeSelector';
import {
  DARK_DATE_HOUR_RANGE_INPUT_WIDTH,
  DARK_DATE_RANGE_INPUT_WIDTH,
  LIGHT_DATE_HOUR_RANGE_INPUT_WIDTH,
  LIGHT_DATE_RANGE_INPUT_WIDTH,
  WhyLabsSuperDatePickerProps,
  clearPickerState,
} from './utils';

const useStyles = createStyles((_, variant: WhyLabsSuperDatePickerProps['variant']) => ({
  variantBackground: {
    backgroundColor: 'transparent',
    borderColor: variant === 'light' ? undefined : Colors.brandSecondary800,
  },
  input: {
    cursor: 'pointer',
  },
  label: {
    fontWeight: 600,
    color: variant === 'light' ? Colors.brandSecondary900 : Colors.white,
  },
  inputFlex: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    height: '100%',
  },
  variantColor: {
    color: variant === 'light' ? Colors.darkGray : Colors.white,
    fontSize: variant === 'light' ? 14 : 13,
  },
  dateButton: {
    fontWeight: 400,
    fontFamily: 'Asap',
    color: variant === 'light' ? Colors.darkGray : Colors.white,
    cursor: 'pointer',
    height: 'min-content',
    width: 'auto',
    padding: variant === 'light' ? '5px 6px' : '4px 5px',
    borderRadius: '4px',
    '&:hover': {
      background: variant === 'light' ? Colors.hoverLightGray : Colors.darkHeaderAccent,
    },
  },
}));

type SuperDatePickerProps = WhyLabsSuperDatePickerProps & { uniqueKey?: string };

const SuperDatePicker = ({
  startDateSearchParamKey = DATE_START_QUERY_NAME,
  endDateSearchParamKey = DATE_END_QUERY_NAME,
  presetSizeSearchParamKey = PRESET_RANGE_QUERY_NAME,
  variant = 'light',
  label = 'Date range:',
  presetsListPosition = 'start',
  hideLabel,
  withinPortal,
  onClose,
  uniqueKey,
  timePeriod,
  width,
  position,
  disabled,
  ...rest
}: SuperDatePickerProps) => {
  const { classes, cx } = useStyles(variant);
  const [{ opened }, pickerDispatch] = useContext(DatePickerContext);
  const commonParams = {
    startDateSearchParamKey,
    endDateSearchParamKey,
    presetSizeSearchParamKey,
    presetsListPosition,
    timePeriod,
    onClose,
    variant,
    ...rest,
  };
  const allowHoursSelection = timePeriod === TimePeriod.Pt1H;
  const [rangeString] = useDateRangeString(commonParams);

  const handlePickerToggle = () => {
    const newOpened = !opened;
    if (newOpened) {
      pickerDispatch({ opened: newOpened });
      return;
    }
    onPickerClose();
  };

  const onPickerClose = () => {
    onClose?.();
    pickerDispatch({ ...clearPickerState, opened: false });
  };

  const renderDateButton = () => {
    const [startString, endString] = rangeString.split('-');
    return (
      <div className={classes.inputFlex}>
        <InvisibleButton
          onClick={() => {
            pickerDispatch({ defaultInputFocus: 'start' });
          }}
          className={cx(classes.dateButton, classes.variantColor)}
        >
          {startString.trim()}
        </InvisibleButton>
        <WhyLabsText className={classes.variantColor}>-</WhyLabsText>
        <InvisibleButton
          onClick={() => pickerDispatch({ defaultInputFocus: 'end' })}
          className={cx(classes.dateButton, classes.variantColor)}
        >
          {endString.trim()}
        </InvisibleButton>
        <WhyLabsText className={classes.variantColor}>UTC</WhyLabsText>
      </div>
    );
  };

  const pickerSizes = (() => {
    if (variant === 'dark') {
      const defaultWidth = allowHoursSelection ? DARK_DATE_HOUR_RANGE_INPUT_WIDTH : DARK_DATE_RANGE_INPUT_WIDTH;
      return {
        width: width || defaultWidth,
        inputSize: 'xs',
      };
    }
    const defaultWidth = allowHoursSelection ? LIGHT_DATE_HOUR_RANGE_INPUT_WIDTH : LIGHT_DATE_RANGE_INPUT_WIDTH;
    return {
      width: width || defaultWidth,
      inputSize: 'sm',
    };
  })();

  const renderInput = () => (
    <InputBase
      data-pickerid={uniqueKey ? `${uniqueKey}--input` : undefined}
      component="div"
      label={hideLabel ? undefined : label}
      aria-label={hideLabel ? label : undefined}
      w={pickerSizes.width}
      classNames={{
        label: classes.label,
        root: classes.variantBackground,
        input: cx(classes.variantBackground, classes.input),
      }}
      icon={<IconCalendar color={variant === 'light' ? Colors.grey : Colors.brandSecondary800} size={14} />}
      onClick={handlePickerToggle}
      size={pickerSizes.inputSize}
      role="button"
      tabIndex={0}
      disabled={disabled}
    >
      {rangeString ? renderDateButton() : <Input.Placeholder>Pick date range</Input.Placeholder>}
    </InputBase>
  );

  const fallbackPosition = presetsListPosition === 'start' ? 'bottom-start' : 'bottom-end';
  return (
    <WhyLabsDropDown
      withinPortal={withinPortal}
      target={renderInput()}
      position={position || fallbackPosition}
      opened={opened}
      onClose={() => onPickerClose()}
    >
      <SuperDateRangeSelector {...commonParams} />
    </WhyLabsDropDown>
  );
};

export const WhyLabsSuperDatePicker = (props: WhyLabsSuperDatePickerProps) => {
  return (
    <DatePickerContextProvider>
      <SuperDatePicker {...props} />
    </DatePickerContextProvider>
  );
};
