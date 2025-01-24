import { WhyLabsSubmitButton } from 'components/design-system';
import React from 'react';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { LoadingPreviewAlert, PreviewInfoAlert, LightErrorAlert } from '../AlertComponents';
import { ComprehensivePreviewSection } from './ComprehensivePreviewSection';
import { PreviewMonitorSelector } from './PreviewMonitorSelector';
import { AnalysisPreviewDrawerProps, useAnalysisPreviewDrawerViewModel } from '../../useAnalysisPreviewDrawerViewModel';
import { renderColumnText, usePreviewDrawerStyles } from '../../utils';

export const PreviewDrawerContent = ({ targetColumns, loading }: AnalysisPreviewDrawerProps): JSX.Element => {
  const { classes } = usePreviewDrawerStyles();
  const { modelId, segment, pageType, featureId, outputName } = usePageTypeWithParams();
  const usedColumnId = featureId || outputName;
  const viewModel = useAnalysisPreviewDrawerViewModel({ targetColumns, loading });
  const columnCountText = () => {
    const isOutput = pageType === 'outputFeature' || pageType === 'segmentOutputFeature';
    return `${targetColumns?.length ?? 0} ${renderColumnText(isOutput, targetColumns?.length ?? 0)}`;
  };
  return (
    <>
      <LoadingPreviewAlert columnCountText={columnCountText()} displayed={viewModel.runningAdHoc} />
      {viewModel.hasComprehensivePreviewFlag && (
        <ComprehensivePreviewSection
          disabled={viewModel.runningAdHoc}
          enabled={viewModel.isComprehensivePreviewWithFlag}
          setEnabled={viewModel.setComprehensivePreview}
        />
      )}
      {!viewModel.isComprehensivePreviewWithFlag && (
        <PreviewMonitorSelector
          selectedMonitor={viewModel.selectedMonitors?.[0]?.id}
          setSelectedMonitor={viewModel.setSelectedMonitor}
          resourceId={modelId}
          columnId={usedColumnId}
          segment={segment}
          disabled={viewModel.runningAdHoc}
        />
      )}
      <PreviewInfoAlert
        hasBackfillFlag={viewModel.hasBackfillFlag}
        editRange={viewModel.editRangeHandler}
        dateRange={viewModel.dateRange}
      />
      <LightErrorAlert
        message={viewModel.validationErrorMessage}
        displayed={!!viewModel.validationErrorMessage}
        onClose={viewModel.clearValidationMessage}
      />
      <WhyLabsSubmitButton
        disabled={viewModel.isLoading}
        className={classes.commonButtonPadding}
        onClick={viewModel.handlePreviewButton}
      >
        Preview now
      </WhyLabsSubmitButton>
    </>
  );
};
