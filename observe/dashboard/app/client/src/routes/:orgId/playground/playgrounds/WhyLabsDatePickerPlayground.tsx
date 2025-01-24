import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { useExtraRangePresets } from '~/components/super-date-picker/hooks/useExtraRangePresets';
import { WhyLabsSuperDatePicker } from '~/components/super-date-picker/WhyLabsSuperDatePicker';
import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { TimePeriod } from '~server/graphql/generated/graphql';
import React, { JSX } from 'react';

const useStyles = createStyles(() => ({
  root: {
    padding: '15px',
    backgroundColor: 'white',
    display: 'flex',
    gap: '40px',
  },
  justifyEnd: {
    justifyContent: 'end',
  },
}));
const SECOND_PICKER_START = 'secondPickerStart';
const SECOND_PICKER_END = 'secondPickerEnd';
const SECOND_PICKER_PRESET = 'secondPickerPreset';
const RANGE_PICKER_START = 'rangePickerStart';
const RANGE_PICKER_END = 'rangePickerEnd';
const RANGE_PICKER_PRESET = 'rangePickerPreset';
export const WhyLabsDatePickerPlayground = (): JSX.Element => {
  const { batchFrequency, loading } = useResourceBatchFrequency({ orgId: 'org-0', resourceId: 'model-0' });
  const {
    dateRange: { from: rangeStartTimestamp, to: rangeEndTimestamp },
    appliedPreset,
  } = useSuperGlobalDateRange({
    startDateSearchParamKey: RANGE_PICKER_START,
    endDateSearchParamKey: RANGE_PICKER_END,
    dynamicPresetSearchParamKey: RANGE_PICKER_PRESET,
    timePeriod: TimePeriod.P1M,
  });
  const {
    dateRange: { from: secondStartTimestamp, to: secondEndTimestamp },
  } = useSuperGlobalDateRange({
    startDateSearchParamKey: SECOND_PICKER_START,
    endDateSearchParamKey: SECOND_PICKER_END,
    dynamicPresetSearchParamKey: SECOND_PICKER_PRESET,
    timePeriod: batchFrequency,
    loading,
  });
  const { classes, cx } = useStyles();
  const { presets: extraPresets } = useExtraRangePresets('org-0', 'model-0', []);
  return (
    <>
      <p>With hours selection (applied preset: {appliedPreset})</p>
      <div className={classes.root}>
        <p> startTimestamp: {rangeStartTimestamp ?? '-'}</p>
        <p> start date: {rangeStartTimestamp ? new Date(Number(rangeStartTimestamp)).toISOString() : '-'}</p>
        <p> endTimestamp: {rangeEndTimestamp ?? '-'}</p>
        <p> end date: {rangeEndTimestamp ? new Date(Number(rangeEndTimestamp)).toISOString() : '-'}</p>
      </div>
      <div className={classes.root}>
        <WhyLabsSuperDatePicker
          dynamicPresetSearchParamKey={RANGE_PICKER_PRESET}
          startDateSearchParamKey={RANGE_PICKER_START}
          endDateSearchParamKey={RANGE_PICKER_END}
          timePeriod={TimePeriod.P1M}
        />
      </div>
      <hr />
      <p>No hours selection (emulating org-0 | model-0)</p>
      <div className={classes.root}>
        <p> startTimestamp: {secondStartTimestamp ?? '-'}</p>
        <p> start date: {secondStartTimestamp ? new Date(Number(secondStartTimestamp)).toISOString() : '-'}</p>
        <p> endTimestamp: {secondEndTimestamp ?? '-'}</p>
        <p> end date: {secondEndTimestamp ? new Date(Number(secondEndTimestamp)).toISOString() : '-'}</p>
      </div>
      <div className={cx(classes.root, classes.justifyEnd)} style={{ backgroundColor: Colors.darkHeader }}>
        <WhyLabsSuperDatePicker
          presetsListPosition="end"
          dynamicPresetSearchParamKey={SECOND_PICKER_PRESET}
          startDateSearchParamKey={SECOND_PICKER_START}
          endDateSearchParamKey={SECOND_PICKER_END}
          timePeriod={batchFrequency}
          loading={loading}
          variant="dark"
          hideLabel
          extraPresetList={[extraPresets.lineage]}
        />
      </div>
    </>
  );
};
