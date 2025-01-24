import { Divider } from '@mantine/core';
import { WhyLabsNumberInput, WhyLabsSelect, WhyLabsSelectWithButtons, WhyLabsSwitch } from '~/components/design-system';
import { ControlsSection } from '~/components/layout/header/ControlsSection';
import { WhyLabsSuperDatePicker } from '~/components/super-date-picker/WhyLabsSuperDatePicker';
import { TimePeriod } from '~server/graphql/generated/graphql';

import { useResourceSingleProfileViewModel } from './ResourceSingleProfileViewModel';
import { useResourceSingleProfileStyles } from './useResourceSingleProfileStyles';

export const ResourceSingleProfileControls = (): JSX.Element => {
  const { classes } = useResourceSingleProfileStyles();
  const viewModel = useResourceSingleProfileViewModel();
  const hasColumnSelected = !!viewModel.selectedColumn;
  const hasMetricSelected = !!viewModel.selectedMetric;

  return (
    <ControlsSection>
      <WhyLabsSuperDatePicker timePeriod={TimePeriod.Pt1H} />
      <Divider orientation="vertical" />
      <WhyLabsSelectWithButtons
        autoFocus={!hasColumnSelected}
        clearable={false}
        data={viewModel.columnsData}
        label="Column:"
        onChange={viewModel.onChangeColumn}
        value={viewModel.selectedColumn}
      />
      <WhyLabsSelectWithButtons
        autoFocus={hasColumnSelected && !hasMetricSelected}
        clearable={false}
        data={viewModel.metricsData}
        label="Metric:"
        onChange={viewModel.onChangeMetric}
        value={viewModel.selectedMetric?.value ?? null}
      />
      <Divider orientation="vertical" />
      <div className={classes.thresholdContainer}>
        <span className={classes.thresholdLabel}>Threshold preview:</span>
        <div className={classes.thresholdInputsContainer}>
          <WhyLabsNumberInput
            hideLabel
            label="Min threshold"
            min={0}
            onChange={viewModel.onChangeThresholdMin}
            placeholder="min"
            precision={2}
            value={viewModel.threshold.min}
          />
          <span>to</span>
          <WhyLabsNumberInput
            hideLabel
            label="Max threshold"
            min={viewModel.threshold.min}
            onChange={viewModel.onChangeThresholdMax}
            placeholder="max"
            precision={2}
            value={viewModel.threshold.max}
          />
          <WhyLabsSwitch
            checked={viewModel.threshold.isActive}
            hideLabel
            label="Enable threshold"
            onChange={viewModel.toggleThresholdIsActive}
          />
        </div>
      </div>
      <WhyLabsSelect
        clearable
        data={viewModel.referenceProfile.data}
        label="Reference profile overlay:"
        loading={viewModel.referenceProfile.isLoading}
        onChange={viewModel.referenceProfile.onChange}
        placeholder="Select a reference profile"
        value={viewModel.referenceProfile.selected}
      />
    </ControlsSection>
  );
};
