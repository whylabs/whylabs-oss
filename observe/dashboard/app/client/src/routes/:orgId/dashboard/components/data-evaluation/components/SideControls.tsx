import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsRadioGroup, WhyLabsText } from '~/components/design-system';
import { useExtraRangePresets } from '~/components/super-date-picker/hooks/useExtraRangePresets';
import { WhyLabsSuperDatePicker } from '~/components/super-date-picker/WhyLabsSuperDatePicker';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { EvaluationAggregationType } from '~server/trpc/dashboard/types/data-evalutation-types';
import React, { Fragment, ReactElement } from 'react';

import { useDataEvaluationBuilderViewModel } from '../useDataEvaluationBuilderViewModel';
import { DAILY_BATCHES_LIMIT, HOURLY_BATCHES_LIMIT, getSideControlsWidth } from '../utils';
import { useEvaluationCommonStyles } from './utils';

const useStyles = createStyles((_, { sideControlsWidth }: { sideControlsWidth?: number }) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: sideControlsWidth,
    minWidth: sideControlsWidth,
  },
  controlsContainer: {
    display: 'flex',
    flexDirection: 'column',
    background: Colors.brandSecondary100,
    padding: 10,
    borderRadius: 4,
    gap: 10,
    height: 'fit-content',
    width: '100%',
  },
  title: {
    color: Colors.secondaryLight1000,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1,
    height: 18,
  },
  bottomButton: {
    color: Colors.secondaryLight1000,
    fontWeight: 600,
    lineHeight: 1.53,
    fontSize: 13,
    '&:disabled': {
      color: Colors.brandSecondary600,
      background: Colors.secondaryLight200,
    },
  },
  pickerLabel: {
    height: 28,
  },
}));

export type SideControlsProps = {
  title: string;
  queryDefinitionControls: Array<{
    label?: string;
    children: ReactElement;
  }>;
  bottomButton: {
    onClick: () => void;
    disabled?: boolean;
  };
  parentViewModel: ReturnType<typeof useDataEvaluationBuilderViewModel>;
};

export const SideControls = ({
  title,
  queryDefinitionControls,
  bottomButton,
  parentViewModel,
}: SideControlsProps): ReactElement => {
  const { dataControlsPickerTimePeriod, tempControlsErrorState, tempControlsState, onChangeAggregationType, orgId } =
    parentViewModel;
  const sideControlsWidth = getSideControlsWidth(dataControlsPickerTimePeriod);
  const { classes } = useStyles({ sideControlsWidth });
  const { classes: commonStyles } = useEvaluationCommonStyles();
  const selectedAggregationType = tempControlsState?.type;
  const {
    presets: { lineage },
  } = useExtraRangePresets(orgId, tempControlsState.resourceId);
  const daysLimit = dataControlsPickerTimePeriod === TimePeriod.Pt1H ? HOURLY_BATCHES_LIMIT : DAILY_BATCHES_LIMIT;
  const isMissingResource = tempControlsErrorState.value.has('resourceId');
  const hasDateRangeError = tempControlsErrorState.value.has('dateRange');
  return (
    <div className={classes.root}>
      <div className={classes.controlsContainer}>
        <WhyLabsText className={classes.title}>{title}</WhyLabsText>
        <div className={commonStyles.sectionWrapper}>
          {isMissingResource && <div className={commonStyles.errorIndicator} />}
          <div className={commonStyles.flexSection}>
            {parentViewModel.commonSelectComponents.resourceSelector}
            {isMissingResource && (
              <WhyLabsText className={commonStyles.errorMessage}>Please select a resource</WhyLabsText>
            )}
          </div>
        </div>
        <div className={commonStyles.sectionWrapper}>
          <WhyLabsRadioGroup
            label="Load data from:"
            orientation="column"
            value={selectedAggregationType ?? undefined}
            onChange={onChangeAggregationType}
            spacing={6}
            marginTop={2}
            options={[
              { label: 'Date range', value: EvaluationAggregationType.DateRange },
              { label: 'Reference profiles', value: EvaluationAggregationType.ReferenceProfile },
            ]}
          />
        </div>
        {selectedAggregationType === EvaluationAggregationType.DateRange && (
          <div className={commonStyles.sectionWrapper}>
            {hasDateRangeError && <div className={commonStyles.errorIndicator} />}
            <div className={commonStyles.flexSection}>
              <WhyLabsSuperDatePicker
                width="100%"
                externalStateManager={parentViewModel.datePickerState}
                label="Merged from date range:"
                timePeriod={dataControlsPickerTimePeriod}
                extraPresetList={[lineage]}
                maxDaysInRange={daysLimit}
                informativeText={`You can select a date range of up to ${daysLimit} days for this hourly resource`}
              />
              {hasDateRangeError && (
                <WhyLabsText className={commonStyles.errorMessage}>Select a valid date range</WhyLabsText>
              )}
            </div>
          </div>
        )}
        {queryDefinitionControls.map(({ label, children }) => (
          <Fragment key={label}>
            {label && <WhyLabsText className={commonStyles.sectionLabel}>{label}</WhyLabsText>}
            {children}
          </Fragment>
        ))}
      </div>
      <WhyLabsButton
        variant="filled"
        color="gray"
        onClick={bottomButton.onClick}
        disabled={bottomButton.disabled || !parentViewModel.hasNotAppliedChanges}
        width="full"
        className={classes.bottomButton}
        loading={parentViewModel.loadingSideControlsData}
      >
        Apply data controls
      </WhyLabsButton>
    </div>
  );
};
