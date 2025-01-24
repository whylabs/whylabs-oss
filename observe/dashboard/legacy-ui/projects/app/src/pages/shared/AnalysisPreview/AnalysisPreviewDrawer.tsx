import { WhyLabsDrawer, WhyLabsText } from 'components/design-system';
import React from 'react';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { AnalysisPreviewDrawerProps, useAnalysisPreviewDrawerViewModel } from './useAnalysisPreviewDrawerViewModel';
import { PreviewDrawerContent } from './components/preview/PreviewDrawerContent';
import { BackfillDrawerContent } from './components/backfill/BackfillDrawerContent';

const useStyles = createStyles(() => ({
  drawerHeader: {
    padding: '20px 20px 0 20px',
  },
  drawerBody: {
    padding: '15px 20px 20px 20px !important',
  },
  title: {
    color: Colors.secondaryLight1000,
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 0.93,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 15,
  },
  commonButtonPadding: {
    padding: '8px 17px',
  },
  divider: {
    width: '100%',
    borderTop: `1px solid ${Colors.brandSecondary100}`,
    margin: 0,
  },
  spaceBetweenFlex: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
  },
}));

export const AnalysisPreviewDrawer = (props: AnalysisPreviewDrawerProps): React.ReactElement => {
  const { classes } = useStyles();
  const { targetColumns, loading } = props;

  const viewModel = useAnalysisPreviewDrawerViewModel({ targetColumns, loading });
  const ongoingBackfill =
    viewModel.hasFailedOrCanceledBackfill || viewModel.hasBackfillRunning || viewModel.hasSuccessfullBackfill;
  return (
    <WhyLabsDrawer
      uniqueId="analysis-preview-drawer"
      classNames={{ header: classes.drawerHeader, body: classes.drawerBody }}
      isOpen={viewModel.isDrawerOpened}
      onClose={viewModel.closeDrawer}
      size="420px"
      title={
        <WhyLabsText className={classes.title}>
          {viewModel.activeBackfillJob?.runId
            ? 'Run an analysis backfill on historic data'
            : 'Preview the analysis results'}
        </WhyLabsText>
      }
    >
      <div className={classes.content}>
        {(viewModel.hasAnalysisPreviewData || ongoingBackfill) && viewModel.hasBackfillFlag ? (
          <BackfillDrawerContent {...props} />
        ) : (
          <PreviewDrawerContent {...props} />
        )}
      </div>
    </WhyLabsDrawer>
  );
};
