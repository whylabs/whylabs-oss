import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { BackfillJobStatus } from 'generated/graphql';
import { WhyLabsProgressBar, WhyLabsText } from 'components/design-system';
import { CriticalErrorAlert, LoadingBackfillAlert, SuccessAlert } from '../AlertComponents';
import { AnalysisPreviewDrawerProps, useAnalysisPreviewDrawerViewModel } from '../../useAnalysisPreviewDrawerViewModel';
import { renderColumnText, usePreviewDrawerStyles } from '../../utils';

export const RunningBackfillProgress = (props: AnalysisPreviewDrawerProps): JSX.Element => {
  const { classes } = usePreviewDrawerStyles();
  const { pageType } = usePageTypeWithParams();
  const isOutputs = pageType === 'outputFeature' || pageType === 'segmentOutputFeature';
  const { activeBackfillJob, hasSuccessfullBackfill, hasQueuedBackfill } = useAnalysisPreviewDrawerViewModel(props);
  const { status, error, progress } = activeBackfillJob ?? {};

  const columnCount = activeBackfillJob?.columnsCount ?? 0;
  const columnCountText = `${columnCount} ${renderColumnText(isOutputs, columnCount)}`;
  const segmentCount = activeBackfillJob?.segmentsCount;

  if (!activeBackfillJob || status === BackfillJobStatus.Failed || error) {
    return (
      <CriticalErrorAlert message="There was an error running the backfill request, please try again later" displayed />
    );
  }

  if (status === BackfillJobStatus.Canceled || hasSuccessfullBackfill) {
    const message = hasSuccessfullBackfill
      ? 'Backfill completed, refresh the page to view analysis data'
      : `Backfill request was successfully stopped with ${activeBackfillJob.progress ?? 0}% of completion`;

    return <SuccessAlert message={message} displayed />;
  }

  const progressStatus = (() => {
    if (hasQueuedBackfill) return <WhyLabsText className={classes.progressText}>Waiting to start</WhyLabsText>;
    return (
      <WhyLabsText className={classes.progressText}>
        Progress <strong>{progress ?? 0}%</strong>
      </WhyLabsText>
    );
  })();

  return (
    <>
      <LoadingBackfillAlert
        columnCountText={columnCountText}
        segmentCount={segmentCount}
        isQueued={hasQueuedBackfill}
        displayed
      />
      <WhyLabsProgressBar value={hasQueuedBackfill ? 0 : progress ?? 0} bottomText={progressStatus} />
    </>
  );
};
