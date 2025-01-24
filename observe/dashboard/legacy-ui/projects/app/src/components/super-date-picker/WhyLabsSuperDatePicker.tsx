import { InputBase, Input, createStyles } from '@mantine/core';
import { IconCalendar } from '@tabler/icons';
import React, { useContext } from 'react';
import { WhyLabsDropDown, WhyLabsText } from 'components/design-system';
import { NEW_GLOBAL_END_RANGE, NEW_GLOBAL_START_RANGE, NEW_GLOBAL_RANGE_PRESET } from 'types/navTags';
import { Colors } from '@whylabs/observatory-lib';
import { TimePeriod } from 'generated/graphql';
import { DatePickerContext, DatePickerContextProvider } from './PickerContext';
import {
  clearPickerState,
  DARK_DATE_HOUR_RANGE_INPUT_WIDTH,
  DARK_DATE_RANGE_INPUT_WIDTH,
  LIGHT_DATE_HOUR_RANGE_INPUT_WIDTH,
  LIGHT_DATE_RANGE_INPUT_WIDTH,
  WhyLabsSuperDatePickerProps,
} from './utils';
import { SuperDateRangeSelector } from './SuperDateRangeSelector';
import { useDateRangeString } from './hooks/useDateRangeString';

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
    lineHeight: 1,
  },
  targetWrapper: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
}));

type SuperDatePickerProps = WhyLabsSuperDatePickerProps & { uniqueKey?: string };

const SuperDatePicker = ({
  startDateSearchParamKey = NEW_GLOBAL_START_RANGE,
  endDateSearchParamKey = NEW_GLOBAL_END_RANGE,
  dynamicPresetSearchParamKey = NEW_GLOBAL_RANGE_PRESET,
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
    dynamicPresetSearchParamKey,
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
        <div
          onClick={() => {
            pickerDispatch({ defaultInputFocus: 'start' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.code === 'Space') {
              pickerDispatch({ defaultInputFocus: 'end' });
            }
          }}
          tabIndex={0}
          role="button"
          className={cx(classes.dateButton, classes.variantColor)}
        >
          {startString.trim()}
        </div>
        <WhyLabsText className={classes.variantColor}>-</WhyLabsText>
        <div
          onClick={() => pickerDispatch({ defaultInputFocus: 'end' })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.code === 'Space') {
              pickerDispatch({ defaultInputFocus: 'end' });
            }
          }}
          tabIndex={0}
          role="button"
          className={cx(classes.dateButton, classes.variantColor)}
        >
          {endString.trim()}
        </div>
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
      component="button"
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

export const WhyLabsSuperDatePicker = (props: SuperDatePickerProps): JSX.Element => {
  return (
    <DatePickerContextProvider>
      <SuperDatePicker {...props} />
    </DatePickerContextProvider>
  );
};
