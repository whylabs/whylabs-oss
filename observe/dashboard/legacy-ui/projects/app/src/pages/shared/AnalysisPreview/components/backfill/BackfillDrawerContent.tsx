import { WhyLabsButton, WhyLabsCheckboxGroup, WhyLabsSubmitButton, WhyLabsText } from 'components/design-system';
import React, { useState } from 'react';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyLabsSuperDatePicker } from 'components/super-date-picker/WhyLabsSuperDatePicker';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { useExtraRangePresets } from 'components/super-date-picker/hooks/useExtraRangePresets';
import { BackfillInfoAlert } from '../AlertComponents';
import { AnalysisPreviewDrawerProps, useAnalysisPreviewDrawerViewModel } from '../../useAnalysisPreviewDrawerViewModel';
import { backfillRangePickerParams, usePreviewDrawerStyles } from '../../utils';
import { BackfillMonitorSection } from './BackfillMonitorSection';
import { PreviewResultSection } from './PreviewResultSection';
import { RunningBackfillProgress } from './RunningBackfillProgress';

const checked = 'checked';
export const BackfillDrawerContent = (props: AnalysisPreviewDrawerProps): JSX.Element => {
  const { classes } = usePreviewDrawerStyles();
  const { modelId, segment } = usePageTypeWithParams();
  const { targetColumns, loading } = props;
  const viewModel = useAnalysisPreviewDrawerViewModel({ targetColumns, loading });
  const [acknowledge, setAcknowledge] = useState(viewModel.hasBackfillRunning);
  const {
    resourceState: { resource },
    loading: resourceContextLoading,
  } = useResourceContext();
  const {
    presets: { lineage },
  } = useExtraRangePresets(modelId, segment.tags);

  const renderFirstSection = () => {
    if (viewModel?.activeBackfillJob?.runId) {
      return <RunningBackfillProgress {...props} />;
    }
    return <PreviewResultSection {...props} />;
  };

  const checkbox = {
    label: (
      <WhyLabsText className={classes.checkboxLabel}>I have read and acknowledge the backfill details</WhyLabsText>
    ),
    value: checked,
  };

  const toggleCheckbox = (value: string[] | null) => {
    setAcknowledge(value?.[0] === checked);
  };

  const renderButtons = () => {
    if (viewModel.hasSuccessfullBackfill) {
      return (
        <>
          <WhyLabsButton variant="outline" color="gray" onClick={() => window.location.reload()}>
            Refresh to view analysis
          </WhyLabsButton>
          <WhyLabsButton variant="outline" color="gray" onClick={viewModel.clearBackfillState}>
            Back to preview
          </WhyLabsButton>
        </>
      );
    }

    return (
      <>
        <WhyLabsSubmitButton
          disabled={viewModel.isLoading || viewModel.hasBackfillRunning || !acknowledge}
          className={classes.commonButtonPadding}
          onClick={viewModel.handleBackfillButton}
        >
          Start the analysis backfill
        </WhyLabsSubmitButton>
        {viewModel.hasBackfillRunning && (
          <WhyLabsButton
            onClick={viewModel.handleStopBackfill}
            className={classes.commonButtonPadding}
            variant="outline"
            color="gray"
            disabled={viewModel.cancelBackfillMutationLoading}
          >
            Stop
          </WhyLabsButton>
        )}
        {viewModel.hasFailedOrCanceledBackfill && (
          <WhyLabsButton variant="outline" color="gray" onClick={viewModel.clearBackfillState}>
            Back to preview
          </WhyLabsButton>
        )}
      </>
    );
  };

  const usedMonitorsList = (() => {
    if (viewModel.activeBackfillJob?.monitors?.length) {
      return viewModel.activeBackfillJob.monitors;
    }
    return viewModel.selectedMonitors?.map(({ displayName, id }) => displayName || id || 'Unkknown') ?? [];
  })();

  return (
    <>
      {renderFirstSection()}
      <BackfillMonitorSection
        selectedMonitors={usedMonitorsList}
        isComprehensivePreview={viewModel.isComprehensivePreviewWithFlag}
        isQueued={viewModel.hasQueuedBackfill}
      />
      <WhyLabsSuperDatePicker
        timePeriod={resource?.batchFrequency}
        loading={resourceContextLoading}
        presetsListPosition="end"
        label="Backfill range:"
        extraPresetList={[lineage]}
        withinPortal
        position="left"
        width="100%"
        disabled={viewModel.hasBackfillRunning || viewModel.hasSuccessfullBackfill}
        {...backfillRangePickerParams}
      />
      {!viewModel.hasSuccessfullBackfill && (
        <>
          <BackfillInfoAlert />
          <WhyLabsCheckboxGroup
            value={acknowledge ? [checked] : []}
            disabled={viewModel.isLoading || viewModel.hasBackfillRunning}
            label="Run on all monitors"
            hideLabel
            options={[checkbox]}
            onChange={toggleCheckbox}
          />
        </>
      )}

      <div className={classes.spaceBetweenFlex}>{renderButtons()}</div>
    </>
  );
};
