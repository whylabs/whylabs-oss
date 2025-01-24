import { ReactElement } from 'react';
import { createStyles } from '@mantine/core';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { HeaderControls } from './HeaderControls';
import { useSegmentAnalysisViewModel } from './useSegmentAnalysisViewModel';
import { SegmentAnalysisIframeWrapper } from './SegmentAnalysisIframeWrapper';

const useStyles = createStyles({
  root: {
    backgroundColor: 'white',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
});
export const SegmentAnalysisPage = (): ReactElement => {
  useSetHtmlTitle('Segment analysis');
  const { classes } = useStyles();
  const pageViewModel = useSegmentAnalysisViewModel();

  return (
    <div className={classes.root}>
      <HeaderControls pageViewModel={pageViewModel} />
      <SegmentAnalysisIframeWrapper pageViewModel={pageViewModel} />
    </div>
  );
};
