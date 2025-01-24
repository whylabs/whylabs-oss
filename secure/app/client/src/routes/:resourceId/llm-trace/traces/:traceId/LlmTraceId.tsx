import { createStyles } from '@mantine/core';
import { useClickOutside } from '@mantine/hooks';
import { MouseEvent, useRef, useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { Colors } from '~/assets/Colors';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { ObservationTree } from '~/components/ObservationTree/ObservationTree';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { TRACE_DETAILS_NAME } from '~/routes/:resourceId/llm-trace/utils/tabUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';

import { LlmTraceDetailsHeader } from '../components/LlmTraceDetailsHeader';
import { LlmTraceDetailsDrawer } from './components/LlmTraceDetailsDrawer';
import { useLlmTraceIdViewModel } from './useLlmTraceIdViewModel';

const DIVIDER_WIDTH = 4;
const MIN_LEFT_SECTION_WIDTH = 150;

const useStyles = createStyles((_, { threeWidth }: { threeWidth: number }) => ({
  root: {
    display: 'grid',
    gridTemplateRows: '55px 1fr',
    height: '100%',
  },
  content: {
    position: 'relative',
    backgroundColor: Colors.white,
    display: 'grid',
    gridTemplateColumns: `min(${threeWidth}px, 80%) 1fr`,
    overflow: 'hidden',

    '> *': {
      height: '100%',
      overflow: 'hidden',
    },
  },
  details: {
    padding: 15,
  },
  leftContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  tree: {
    overflow: 'auto',
  },
  colResizer: {
    borderLeft: `1px solid ${Colors.secondaryLight100}`,
    width: DIVIDER_WIDTH,
    minWidth: DIVIDER_WIDTH,
    height: '100%',
    cursor: 'col-resize',
    transition: 'all 100ms ease-out 50ms',
    outline: 'none',
    '&:hover': {
      borderLeft: `1px solid ${Colors.transparent}`,
      transition: 'all 100ms ease-in 300ms',
      backgroundColor: `${Colors.blue} !important`,
    },
  },
  activeResize: {
    borderLeft: `1px solid ${Colors.transparent}`,
    transition: 'unset',
    backgroundColor: `${Colors.blue} !important`,
  },
}));

interface ResizerState {
  isDragging: boolean;
  width: number;
  lastClientX?: number;
}

export const LlmTraceId = () => {
  const [treeResizer, setThreeResizer] = useState<ResizerState>({ isDragging: false, width: 380 });
  const { classes, cx } = useStyles({ threeWidth: Math.max(treeResizer.width, MIN_LEFT_SECTION_WIDTH) });
  const viewModel = useLlmTraceIdViewModel();
  const { isLoading, observations, selectedTrace } = viewModel;
  useSetHtmlTitle(upperCaseFirstLetterOnly(TRACE_DETAILS_NAME));
  const clickOutsideRef = useClickOutside(viewModel.unselectTrace);
  const container = useRef<HTMLDivElement | null>(null);
  const handleResizeMouseDown = (ev?: MouseEvent<HTMLButtonElement>) => {
    if (!ev || !container.current) return;
    setThreeResizer((prev) => {
      return { ...prev, isDragging: true, lastClientX: ev?.clientX };
    });
  };

  const handleResizeMouseUp = (ev?: MouseEvent<HTMLDivElement>) => {
    setThreeResizer((prev) => {
      if (prev.isDragging) return { ...prev, isDragging: false, lastClientX: ev?.clientX };
      return prev;
    });
  };

  const handleResizing = (ev?: MouseEvent<HTMLDivElement>) => {
    if (!treeResizer.isDragging) return;
    setThreeResizer((prev) => {
      if (!container.current || !ev?.clientX) return prev;
      const leftOffset = window.innerWidth - container.current.clientWidth;
      const newWidth = ev.clientX + DIVIDER_WIDTH - leftOffset;
      return { ...prev, lastClientX: ev?.clientX, width: newWidth };
    });
  };

  return (
    <LlmTraceDetailsDrawer>
      <div className={classes.root} ref={clickOutsideRef}>
        <LlmTraceDetailsHeader trace={selectedTrace} />
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          className={classes.content}
          ref={container}
          onMouseMove={handleResizing}
          onMouseUp={handleResizeMouseUp}
          onMouseLeave={handleResizeMouseUp}
        >
          <div className={classes.leftContainer}>
            <div className={classes.tree}>
              <ObservationTree
                isLoading={isLoading}
                observations={observations}
                onChange={viewModel.onSelectTraceItem}
                selectedId={viewModel.selectedItemId}
              />
            </div>
            <InvisibleButton
              className={cx(classes.colResizer, { [classes.activeResize]: treeResizer.isDragging })}
              onMouseDown={handleResizeMouseDown}
            />
          </div>
          <div className={classes.details}>
            <Outlet context={viewModel.selectedTrace} />
          </div>
        </div>
      </div>
    </LlmTraceDetailsDrawer>
  );
};

export function useLlmTraceIdContext() {
  return useOutletContext<ReturnType<typeof useLlmTraceIdViewModel>['selectedTrace']>();
}
