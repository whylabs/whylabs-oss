import { createStyles } from '@mantine/core';
import { IconCircleX, IconExclamationCircle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { SkeletonGroup, WhyLabsAlert } from '~/components/design-system';
import { LabelWithLineBreak } from '~/components/design-system/select/custom-items/LabelWithLineBreak';
import { useExtraRangePresets } from '~/components/super-date-picker/hooks/useExtraRangePresets';
import { RangePreset, useDynamicTrailingRangePresets } from '~/hooks/useDynamicTrailingRangePresets';
import { useMount } from '~/hooks/useMount';
import { rangeTranslatorByTimePeriod } from '~/utils/dateRangeUtils';
import { getFullDateFromISO } from '~/utils/dateUtils';
import { DATE_END_QUERY_NAME, DATE_START_QUERY_NAME, PRESET_RANGE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { TimePeriod } from '~server/graphql/generated/graphql';
import React, { useContext, useEffect } from 'react';

import { BottomActions } from './components/BottomActions';
import { CalendarRangePicker } from './components/CalendarRangePicker';
import { InputsSection } from './components/InputsSection';
import { useDateRangeParams } from './hooks/useDateRangeParams';
import { DatePickerContext } from './PickerContext';
import {
  CUSTOM_RANGE,
  DARK_DATE_RANGE_INPUT_WIDTH,
  LIGHT_DATE_RANGE_INPUT_WIDTH,
  LINEAGE_RANGE,
  NullableDateConstructor,
  WhyLabsSuperDatePickerProps,
  clearPickerState,
  dateConstructorToReadableISOString,
} from './utils';

type StyleProps = Pick<WhyLabsSuperDatePickerProps, 'presetsListPosition' | 'variant'> & {
  hasAlert: boolean;
};
const useStyles = createStyles((_, { presetsListPosition, variant, hasAlert }: StyleProps) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  controlsWrapper: {
    display: 'flex',
  },
  presetsList: {
    width: variant === 'light' ? LIGHT_DATE_RANGE_INPUT_WIDTH : DARK_DATE_RANGE_INPUT_WIDTH,
    display: 'flex',
    flexDirection: 'column',
    padding: '6px',
    borderRight: presetsListPosition === 'start' ? `1px solid ${Colors.lightGrayBorder}` : 'none',
    borderLeft: presetsListPosition === 'end' ? `1px solid ${Colors.lightGrayBorder}` : 'none',
    overflow: 'auto',
    maxHeight: hasAlert ? '441px' : '391px',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  presetItem: {
    fontWeight: 600,
  },
  presetRoot: {
    padding: '12px 10px',
    borderRadius: 4,
  },
  presetHoverBackground: {
    '&:hover': {
      background: Colors.hoverLightGray,
    },
  },
  validationDiv: {
    padding: '0px 16px 4px',
  },
}));

/*
  This component have to be wrapped with the DatePickerContextProvider where used
 */
export const SuperDateRangeSelector = ({
  startDateSearchParamKey = DATE_START_QUERY_NAME,
  endDateSearchParamKey = DATE_END_QUERY_NAME,
  dynamicPresetSearchParamKey = PRESET_RANGE_QUERY_NAME,
  presetsListPosition = 'start',
  hideDefaultPresetsList,
  loading,
  extraPresetList = [],
  minUtcDate,
  maxUtcDate,
  maxDaysInRange,
  variant,
  onApply,
  onClose,
  timePeriod = TimePeriod.P1D,
  informativeText,
  externalStateManager,
}: WhyLabsSuperDatePickerProps) => {
  const [{ invalidMessage, startDate, endDate, endHours, startHours }, datesDispatch] = useContext(DatePickerContext);
  const { setRangeParams, appliedPreset, startTimestamp, endTimestamp } = useDateRangeParams({
    startDateSearchParamKey,
    endDateSearchParamKey,
    dynamicPresetSearchParamKey,
    timePeriod,
    externalStateManager,
    loading,
  });
  const hasBottomMessage = !!(informativeText || invalidMessage);
  const { classes, cx } = useStyles({ presetsListPosition, variant, hasAlert: hasBottomMessage });

  const hasTempSelection = !!(startDate || endDate || endHours || startHours);

  const defaultMaxUtcDate = (() => {
    // Today in UTC
    if (maxUtcDate) return maxUtcDate;
    const today = new Date();
    return new Date(`${getFullDateFromISO(today.toISOString())}T23:59:59.999Z`);
  })();

  const usedMaxUtcDate = (() => {
    if (maxDaysInRange && startDate && !endDate) {
      const limitDate = new Date(startDate);
      limitDate.setUTCDate(startDate.getUTCDate() + (maxDaysInRange - 1));
      // Don't allow future dates;
      return limitDate.getTime() > defaultMaxUtcDate.getTime() ? defaultMaxUtcDate : limitDate;
    }
    return defaultMaxUtcDate;
  })();

  const { presetOptions } = useDynamicTrailingRangePresets(timePeriod);
  const { presets: extraPresets } = useExtraRangePresets();

  const usedPresets = (() => {
    const presets: RangePreset[] = [];
    if (!hideDefaultPresetsList) presets.push(...presetOptions, extraPresets.custom);
    presets.push(...extraPresetList);
    return presets;
  })();

  useEffect(() => {
    // When switching between resources with lineage preset selected we have to change selected preset to custom
    const isLineagePresetSelected = appliedPreset === LINEAGE_RANGE;
    if (!isLineagePresetSelected) return;
    const lineagePresetFound = usedPresets.find((p) => p.value === LINEAGE_RANGE);
    const lineageRange = lineagePresetFound?.rangeCalculator();
    const { endFn } = rangeTranslatorByTimePeriod.get(timePeriod) ?? {};
    const usedEndTimestamp = endFn ? endFn(endTimestamp ?? 0).getTime() : endTimestamp;
    if (
      lineagePresetFound &&
      (lineageRange?.[0]?.getTime() !== startTimestamp || lineageRange?.[1]?.getTime() !== usedEndTimestamp)
    ) {
      setRangeParams({ dynamicPreset: CUSTOM_RANGE });
    }
  }, [appliedPreset, endTimestamp, setRangeParams, startTimestamp, timePeriod, usedPresets]);

  useMount(() => {
    // making sure we have the selected preset visible if we have a scrollable list
    const selectedPreset = document.getElementById('picker-presets')?.querySelector('div[data-selected="true"]');
    if (selectedPreset) {
      selectedPreset.scrollIntoView();
    }
  });

  const commonParams = {
    startDateSearchParamKey,
    endDateSearchParamKey,
    dynamicPresetSearchParamKey,
    timePeriod,
    loading,
    externalStateManager,
  };

  const persistRangeHandler = ({
    start,
    end,
    preset,
  }: {
    start: NullableDateConstructor;
    end: NullableDateConstructor;
    preset?: string;
  }) => {
    if (externalStateManager?.setter) {
      externalStateManager.setter({
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
        preset,
      });
      return;
    }
    setRangeParams({
      start: dateConstructorToReadableISOString(start),
      end: dateConstructorToReadableISOString(end),
      dynamicPreset: preset,
    });
  };

  const onPresetSelect = (selected: string) => {
    if (selected === CUSTOM_RANGE) {
      // Click on custom preset would persist the current range as static range
      persistRangeHandler({
        start: startTimestamp ?? null,
        end: endTimestamp ?? null,
        preset: selected,
      });
      return;
    }
    datesDispatch({ ...clearPickerState, opened: false });
    const presetFound = usedPresets.find((p) => p.value === selected);
    const range = presetFound?.rangeCalculator() ?? [null, null];
    const [newStartDate, newEndDate] = range;
    onClose?.();
    if (newStartDate && newEndDate) {
      onApply?.({ start: newStartDate, end: newEndDate });
      persistRangeHandler({
        start: newStartDate.getTime(),
        end: newEndDate.getTime(),
        preset: selected,
      });
    }
  };

  const renderPresetsSection = !!usedPresets?.length;

  const renderPresets = () => {
    if (loading) {
      return <SkeletonGroup count={5} height={40} mb={2} />;
    }
    return usedPresets.map(({ description, value, disabled, disabledTooltip, loading: presetLoading, bottomText }) => {
      const foundPresetValue =
        usedPresets.find(({ value: presetValue }) => appliedPreset === presetValue)?.value ?? CUSTOM_RANGE;
      const usedValue = hasTempSelection ? CUSTOM_RANGE : foundPresetValue;
      const allowHover = !disabled && !loading;
      return (
        <LabelWithLineBreak
          key={`${description}--${value}`}
          value={value}
          label={description}
          isActive={value === usedValue}
          onClick={() => onPresetSelect(value)}
          classNames={{
            label: classes.presetItem,
            root: cx(classes.presetRoot, { [classes.presetHoverBackground]: allowHover }),
          }}
          disabled={disabled}
          disabledTooltip={disabledTooltip}
          loading={presetLoading}
          bottomText={bottomText}
        />
      );
    });
  };

  const renderBottomMessage = () => {
    if (invalidMessage)
      return (
        <WhyLabsAlert
          dismissible
          icon={<IconCircleX color={Colors.red} />}
          backgroundColor={Colors.lightRed}
          onClose={() => datesDispatch({ invalidMessage: undefined })}
        >
          {invalidMessage}
        </WhyLabsAlert>
      );
    if (informativeText)
      return (
        <WhyLabsAlert
          icon={<IconExclamationCircle color={Colors.chartBlue} size={14} />}
          backgroundColor={Colors.secondaryLight50}
        >
          {informativeText}
        </WhyLabsAlert>
      );
    return null;
  };

  return (
    <div className={classes.root}>
      <div className={classes.controlsWrapper}>
        {renderPresetsSection && presetsListPosition === 'start' && (
          <div className={classes.presetsList} id="picker-presets">
            {renderPresets()}
          </div>
        )}
        <div>
          <div className={classes.flexColumn}>
            <InputsSection {...commonParams} />
            <CalendarRangePicker minUtcDate={minUtcDate} maxUtcDate={usedMaxUtcDate} {...commonParams} />
            {hasBottomMessage && <div className={classes.validationDiv}>{renderBottomMessage()}</div>}
          </div>
        </div>
        {renderPresetsSection && presetsListPosition === 'end' && (
          <div className={classes.presetsList} id="picker-presets">
            {renderPresets()}
          </div>
        )}
      </div>
      <BottomActions
        onApplyCallback={(p) => {
          onApply?.(p);
          onClose?.();
        }}
        maxUtcDate={usedMaxUtcDate}
        maxDaysInRange={maxDaysInRange}
        {...commonParams}
      />
    </div>
  );
};
