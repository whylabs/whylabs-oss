import { createStyles } from '@mantine/core';
import { IconCircleX, IconExclamationCircle } from '@tabler/icons';
import { TimePeriod } from 'generated/graphql';
import { useExtraRangePresets } from 'components/super-date-picker/hooks/useExtraRangePresets';
import React, { useContext, useEffect } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsAlert, SkeletonGroup } from 'components/design-system';
import { LabelWithLineBreak } from 'components/design-system/select/custom-items/LabelWithLineBreak';
import { RangePreset, useDynamicTrailingRangePresets } from 'hooks/useDynamicTrailingRangePresets';

import { NEW_GLOBAL_END_RANGE, NEW_GLOBAL_START_RANGE, NEW_GLOBAL_RANGE_PRESET } from 'types/navTags';
import { getFullDateFromISO } from 'utils/dateUtils';
import { getFunctionsForTimePeriod, setEndOfUTCDay, setStartOfUTCDay } from 'utils/batchProfileUtils';
import { useMount } from 'hooks/useMount';
import { isString } from 'utils/typeGuards';
import { BottomActions } from './components/BottomActions';
import { CalendarRangePicker } from './components/CalendarRangePicker';
import { InputsSection } from './components/InputsSection';
import { useDateRangeParams } from './hooks/useDateRangeParams';
import { DatePickerContext } from './PickerContext';
import {
  CUSTOM_RANGE,
  WhyLabsSuperDatePickerProps,
  clearPickerState,
  LIGHT_DATE_RANGE_INPUT_WIDTH,
  DARK_DATE_RANGE_INPUT_WIDTH,
  LINEAGE_RANGE,
  dateConstructorToReadableISOString,
} from './utils';
import { getBatchDaysLimitToTimePeriod } from '../profiles-range-link/rangeLimitHelper';

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
    padding: '0px 12px 8px',
    maxWidth: '565px',
  },
}));

/*
  This component have to be wrapped with the DatePickerContextProvider where used
 */
export const SuperDateRangeSelector = ({
  startDateSearchParamKey = NEW_GLOBAL_START_RANGE,
  endDateSearchParamKey = NEW_GLOBAL_END_RANGE,
  dynamicPresetSearchParamKey = NEW_GLOBAL_RANGE_PRESET,
  presetsListPosition = 'start',
  hideDefaultPresetsList,
  loading,
  extraPresetList = [],
  maxUtcDate,
  maxDaysInRange,
  variant,
  onApply,
  onClose,
  timePeriod = TimePeriod.P1D,
  shouldTruncateRangeIfNeeded,
  informativeText,
}: WhyLabsSuperDatePickerProps): JSX.Element => {
  const [{ invalidMessage, startDate, endDate, endHours, startHours }, datesDispatch] = useContext(DatePickerContext);
  const hasBottomMessage = !!(informativeText || invalidMessage);
  const { classes, cx } = useStyles({ presetsListPosition, variant, hasAlert: hasBottomMessage });
  const commonParams = {
    startDateSearchParamKey,
    endDateSearchParamKey,
    dynamicPresetSearchParamKey,
    timePeriod,
    loading,
    shouldTruncateRangeIfNeeded,
  };
  const { setRangeParams, appliedPreset, startTimestamp, endTimestamp } = useDateRangeParams(commonParams);

  const hasTempSelection = !!(startDate || endDate || endHours || startHours);

  const defaultMaxUtcDate = (() => {
    // Current day in UTC
    if (maxUtcDate) return maxUtcDate;
    const today = new Date();
    return new Date(`${getFullDateFromISO(today.toISOString())}T23:59:59.999Z`);
  })();

  const [usedMinUtcDate, usedMaxUtcDate] = (() => {
    const restrictBatchesInRange = getBatchDaysLimitToTimePeriod(timePeriod);
    const usedMaxDaysInRange = restrictBatchesInRange ?? maxDaysInRange;
    if (usedMaxDaysInRange && startDate) {
      const startLimit = new Date(startDate);
      startLimit.setUTCDate(startDate.getUTCDate() - usedMaxDaysInRange + 1);
      const endLimit = new Date(startDate);
      endLimit.setUTCDate(startDate.getUTCDate() + (usedMaxDaysInRange - 1));
      // if the limit is greater than D+1, then return D+1 to void future dates;
      const usedEndLimit = endLimit.getTime() > defaultMaxUtcDate.getTime() ? defaultMaxUtcDate : endLimit;
      return [startLimit, usedEndLimit];
    }
    return [undefined, defaultMaxUtcDate];
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
    const { setEndOfProfile } = getFunctionsForTimePeriod.get(timePeriod) ?? {};
    const usedEndTimestamp = setEndOfProfile ? setEndOfProfile(endTimestamp ?? 0).getTime() : endTimestamp;
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

  const onPresetSelect = (selected: string) => {
    if (selected === CUSTOM_RANGE) {
      // Click on custom preset would persist the current range as static range
      const currentStart = dateConstructorToReadableISOString(startTimestamp ?? null);
      const currentEnd = dateConstructorToReadableISOString(endTimestamp ?? null);
      setRangeParams({ start: currentStart, end: currentEnd });
      return;
    }
    datesDispatch({ ...clearPickerState, opened: false });
    const presetFound = usedPresets.find((p) => p.value === selected);
    const range = presetFound?.rangeCalculator() ?? [null, null];
    const [newStartDate, newEndDate] = range;
    onClose?.();
    if (newStartDate && newEndDate) {
      onApply?.({ start: newStartDate, end: newEndDate });
      setRangeParams({
        start: dateConstructorToReadableISOString(newStartDate.getTime()),
        end: dateConstructorToReadableISOString(newEndDate.getTime()),
        dynamicPreset: selected,
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
      return isString(informativeText) ? (
        <WhyLabsAlert
          icon={<IconExclamationCircle color={Colors.chartBlue} />}
          backgroundColor={Colors.secondaryLight50}
        >
          {informativeText}
        </WhyLabsAlert>
      ) : (
        informativeText
      );
    return null;
  };

  const dateLimitParams = {
    minUtcDate: usedMinUtcDate ? setStartOfUTCDay(usedMinUtcDate) : undefined,
    maxUtcDate: usedMaxUtcDate ? setEndOfUTCDay(usedMaxUtcDate) : undefined,
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
            <CalendarRangePicker {...dateLimitParams} {...commonParams} />
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
        {...dateLimitParams}
        {...commonParams}
      />
    </div>
  );
};
