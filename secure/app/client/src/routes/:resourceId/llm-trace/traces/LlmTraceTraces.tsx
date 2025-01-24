import { createStyles } from '@mantine/core';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { WhyLabsTableKit } from '~/components/design-system';
import { LastUpdatedText } from '~/components/LastUpdatedText/LastUpdatedText';
import { useKeyboardEventListener } from '~/hooks/useKeyboardEventListener';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { TRACES_NAME } from '~/routes/:resourceId/llm-trace/utils/tabUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';

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
  const { classes } = useStyles();
  const hasData = !!viewModel.trace.list.length;
  const shouldDisplayPagination = hasData && !viewModel.trace.isLoading;
  const [setHtmlTitle] = useSetHtmlTitle(upperCaseFirstLetterOnly(TRACES_NAME));
  useEffect(() => {
    if (!viewModel.selectedTraceId) {
      setHtmlTitle(TRACES_NAME);
    }
  }, [setHtmlTitle, viewModel.selectedTraceId]);
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

  const renderTable = () => {
    return (
      <LlmTraceTable
        data={viewModel.trace.list}
        isLoading={viewModel.trace.isLoading}
        onSelectTraceId={viewModel.onSelectTrace}
        selectedId={viewModel.selectedTraceId}
        totalEntries={viewModel.trace.totalCount}
      />
    );
  };

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
      <Outlet />
    </div>
  );
};
