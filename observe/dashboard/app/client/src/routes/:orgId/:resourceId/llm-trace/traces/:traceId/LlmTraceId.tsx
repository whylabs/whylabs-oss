import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { CustomComposedFilters } from '~/components/composed-filter/CustomComposedFilters';
import { TitleValueWidget } from '~/components/header-widgets/TitleValueWidget';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { ObservationTree } from '~/components/ObservationTree/ObservationTree';
import { useFlags } from '~/hooks/useFlags';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { TRACE_DETAILS_NAME } from '~/routes/:orgId/:resourceId/llm-trace/utils/tabUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { MouseEvent, useRef, useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';

import { readableTraceTagNameConverter } from '../../utils/llm-trace-composed-filter-utils';
import { LlmTraceDetailsDrawer } from './components/LlmTraceDetailsDrawer';
import { LlmTraceDetailsHeader } from './components/LlmTraceDetailsHeader';
import { useLlmTraceIdViewModel } from './useLlmTraceIdViewModel';

const DIVIDER_WIDTH = 4;
const LEFT_SECTION_DEFAULT_WIDTH = 350;
const LEFT_SECTION_MIN_WIDTH = 100;

const BORDER_COLOR = Colors.secondaryLight100;
const SEPARATOR_BORDER = `1px solid ${BORDER_COLOR}`;

const useStyles = createStyles((_, { threeWidth }: { threeWidth: number }) => ({
  root: {
    display: 'grid',
    gridTemplateRows: '55px auto 1fr',
    height: '100%',
  },
  filtersContainer: {
    background: Colors.white,
    padding: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  content: {
    borderTop: SEPARATOR_BORDER,
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
  leftContainer: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.55,
    margin: 0,
    marginTop: 2,
  },
  tree: {
    overflow: 'auto',
    width: '100%',
  },
  colResizer: {
    borderLeft: SEPARATOR_BORDER,
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
  const [treeResizer, setThreeResizer] = useState<ResizerState>({
    isDragging: false,
    width: LEFT_SECTION_DEFAULT_WIDTH,
  });
  const { classes, cx } = useStyles({ threeWidth: Math.max(treeResizer.width, LEFT_SECTION_MIN_WIDTH) });
  const viewModel = useLlmTraceIdViewModel();
  const flags = useFlags();

  const { isLoading, observations, selectedTrace } = viewModel;
  useSetHtmlTitle(upperCaseFirstLetterOnly(TRACE_DETAILS_NAME));

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
    <LlmTraceDetailsDrawer onClose={viewModel.unselectTrace}>
      <div className={classes.root}>
        <LlmTraceDetailsHeader trace={selectedTrace} />
        {flags.traceDetailViewFilter && (
          <div className={classes.filtersContainer}>
            <TitleValueWidget title="Filters" filterId="traceIdFilter">
              <CustomComposedFilters
                filterId="traceIdFilter"
                getListFilterOptionsFor={(dimension) => {
                  if (dimension === 'violationTags') return viewModel.violationTagsOptions;

                  if (dimension === 'type') {
                    return [
                      { label: 'COMPLETION', value: 'completion' },
                      { label: 'INTERACTION', value: 'interaction' },
                      { label: 'SPAN', value: 'span' },
                      { label: 'GUARDRAILS', value: 'guardrails' },
                    ];
                  }
                  return [];
                }}
                composedFilterViewModel={viewModel.composedFilterViewModel}
                createListDisplayName={(values) => `any of ${values.length} selected tags`}
                convertListValueToReadableName={readableTraceTagNameConverter}
              />
            </TitleValueWidget>
          </div>
        )}
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
          <Outlet context={viewModel.selectedTrace} />
        </div>
      </div>
    </LlmTraceDetailsDrawer>
  );
};

export function useLlmTraceIdContext() {
  return useOutletContext<ReturnType<typeof useLlmTraceIdViewModel>['selectedTrace']>();
}
