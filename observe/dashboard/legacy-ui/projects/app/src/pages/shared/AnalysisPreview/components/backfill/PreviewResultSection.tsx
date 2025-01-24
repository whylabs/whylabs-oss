import React from 'react';
import { PreviewResultAlert } from '../AlertComponents';
import { WhyLabsButton } from '../../../../../components/design-system';
import { usePreviewDrawerStyles } from '../../utils';
import { AnalysisPreviewDrawerProps, useAnalysisPreviewDrawerViewModel } from '../../useAnalysisPreviewDrawerViewModel';

export const PreviewResultSection = ({ targetColumns, loading }: AnalysisPreviewDrawerProps): JSX.Element => {
  const { classes } = usePreviewDrawerStyles();
  const viewModel = useAnalysisPreviewDrawerViewModel({ targetColumns, loading });

  return (
    <>
      <PreviewResultAlert
        columnCount={targetColumns.length}
        selectedMonitors={viewModel.selectedMonitors ?? []}
        isComprehensivePreview={viewModel.isComprehensivePreviewWithFlag}
      />
      <div className={classes.spaceBetweenFlex}>
        <WhyLabsButton
          className={classes.commonButtonPadding}
          variant="outline"
          color="gray"
          onClick={viewModel.closePreview}
        >
          Preview another monitor
        </WhyLabsButton>
        <WhyLabsButton
          className={classes.commonButtonPadding}
          variant="outline"
          color="gray"
          onClick={() => {
            viewModel.closePreview();
            viewModel.closeDrawer();
          }}
        >
          Exit preview
        </WhyLabsButton>
      </div>
      <hr className={classes.divider} />
    </>
  );
};
