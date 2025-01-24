import { createStyles } from '@mantine/core';
import { WhyLabsTableKit } from '~/components/design-system';
import { LastUpdatedText } from '~/components/LastUpdatedText/LastUpdatedText';
import { useFlags } from '~/hooks/useFlags';
import { useKeyboardEventListener } from '~/hooks/useKeyboardEventListener';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { ProjectorContentWarningModal } from '~/routes/:orgId/:resourceId/llm-trace/components/ProjectorContentWarningModal';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { TRACES_NAME } from '~/routes/:orgId/:resourceId/llm-trace/utils/tabUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { LlmTraceControls } from './components/LlmTraceControls';
import { LlmTraceTable } from './components/LlmTraceTable';
import { useLlmTraceViewModel } from './useLlmTraceViewModel';

const useStyles = createStyles({
  root: {
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    height: `calc(100% - 54px)`, // screen-height / tabs
  },
  lastRefetchTimeMessage: {
    fontSize: 12,
    margin: 0,
    lineHeight: '14px',
  },
});

const {
  Footer: { Pagination },
} = WhyLabsTableKit;

export const LlmTraceTraces = () => {
  const viewModel = useLlmTraceViewModel();
  const context = useLlmSecureContext();
  const { classes } = useStyles();
  const hasData = !!viewModel.trace.list.length;
  const flags = useFlags();
  const shouldDisplayPagination = hasData && !viewModel.trace.isLoading;
  const [setHtmlTitle] = useSetHtmlTitle(upperCaseFirstLetterOnly(TRACES_NAME));
  useEffect(() => {
    if (!viewModel.selectedTraceId && !viewModel.isEmbeddingsProjector) setHtmlTitle(TRACES_NAME);
  }, [setHtmlTitle, viewModel.selectedTraceId, viewModel.isEmbeddingsProjector]);
  useKeyboardEventListener({
    keydown: {
      ArrowDown: ({ shiftKey }) => {
        if (!shiftKey) return;
        viewModel.onSelectNextTrace();
      },

      ArrowUp: ({ shiftKey }) => {
        if (!shiftKey) return;
        viewModel.onSelectPreviousTrace();
      },
      Escape: viewModel.unselectTrace,
    },
  });

  if (viewModel.isEmbeddingsProjector) return <Outlet context={context} />;

  const renderTable = () => (
    <LlmTraceTable
      data={viewModel.trace.list}
      isLoading={viewModel.trace.isLoading}
      onSelectTraceId={viewModel.onSelectTrace}
      selectedId={viewModel.selectedTraceId}
      totalEntries={viewModel.trace.totalCount}
      totalTracesWithCoords={viewModel.trace.totalWithCoords}
    />
  );

  return (
    <div className={classes.root}>
      <LlmTraceControls viewModel={viewModel} />
      {renderTable()}
      {shouldDisplayPagination && (
        <Pagination
          customSizeOptions={[50, 100, 200, 500]}
          leftChildren={
            <LastUpdatedText className={classes.lastRefetchTimeMessage} updatedAt={viewModel.trace.updatedAt} />
          }
          renderingOutsideTable
          rowCount={viewModel.trace.totalCount}
        />
      )}
      <Outlet context={context} />
      {flags.llmEmbeddingsVisualizer && (
        <ProjectorContentWarningModal onAccept={viewModel.onClickOpenEmbeddingsProjector} />
      )}
    </div>
  );
};
