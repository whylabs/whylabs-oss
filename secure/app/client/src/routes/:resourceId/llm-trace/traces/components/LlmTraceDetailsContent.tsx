import { createStyles } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { ReactNode } from 'react';
import { Colors } from '~/assets/Colors';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { JsonViewer } from '~/components/JsonViewer/JsonViewer';
import { timeLong } from '~/utils/dateUtils';

import { TraceContent, TraceItem } from '../types/llmTraceTypes';
import { LlmTraceHeaderInfoColumns } from './LlmTraceHeaderInfoColumns';
import { LlmTraceHeaderSeparator } from './LlmTraceHeaderSeparator';
import { LlmTraceObservationItem } from './LlmTraceObservationItem';

const HEADER_MARGIN_BOTTOM = 30;

const useStyles = createStyles(() => ({
  root: {
    height: '100%',
    overflow: 'auto',
  },
  contentsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  content: {
    background: Colors.secondaryLight50,
    border: `1px solid ${Colors.secondaryLight200}`,
    borderRadius: 4,
    color: Colors.linkColor,
    fontFamily: 'Inconsolata',
    fontSize: 14,
    padding: 20,
  },
  contentTitle: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
    marginBottom: 5,
    marginTop: 0,
  },
  headerContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'space-between',
    marginBottom: HEADER_MARGIN_BOTTOM,
  },
  headerColumns: {
    display: 'flex',
    flexDirection: 'row',
  },
  headerTitle: {
    color: Colors.secondaryLight1000,
  },
  headerValue: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 400,
  },
}));

type LlmTraceDetailsContentProps = {
  trace?: TraceItem | null;
};

export const LlmTraceDetailsContent = ({ trace }: LlmTraceDetailsContentProps) => {
  const { classes } = useStyles();
  const rootElement = useElementSize();
  const headerContainerElement = useElementSize();
  const contentsWrapperElement = useElementSize();

  if (!trace) return null;

  const contentWrapperMinHeight = Math.max(
    rootElement.height - headerContainerElement.height - HEADER_MARGIN_BOTTOM,
    0,
  );

  return (
    <div className={classes.root} ref={rootElement.ref}>
      <div className={classes.headerContainer} ref={headerContainerElement.ref}>
        <LlmTraceObservationItem name={trace.id} type={trace.type} />
        <div className={classes.headerColumns}>
          {renderColumn('Timestamp', timeLong(trace.startTime))}
          <LlmTraceHeaderSeparator />
          {renderColumn('Latency', trace.latency)}
          {!!trace.inputAndCompletionTokens && (
            <>
              <LlmTraceHeaderSeparator />
              {renderColumn('Tokens (total)', trace.inputAndCompletionTokens)}
            </>
          )}
        </div>
      </div>
      <div
        className={classes.contentsWrapper}
        ref={contentsWrapperElement.ref}
        style={{ minHeight: contentWrapperMinHeight }}
      >
        {renderContents()}
      </div>
    </div>
  );

  function renderContents() {
    if (trace?.contents.length) {
      return trace.contents.map(({ content, title }) => (
        <div key={title}>
          <p className={classes.contentTitle}>{title}</p>
          <div className={classes.content}>{renderContent(content)}</div>
        </div>
      ));
    }

    return (
      <SimpleEmptyStateMessage
        minHeight={contentsWrapperElement.height}
        subtitle="Try selecting another trace"
        title="No content found for the selected trace"
      />
    );
  }

  function renderContent(content: TraceContent['content']) {
    if (!content) return 'null';

    return <JsonViewer src={content} />;
  }

  function renderColumn(title: string, value: ReactNode) {
    return (
      <LlmTraceHeaderInfoColumns
        classNames={{
          title: classes.headerTitle,
          value: classes.headerValue,
        }}
        title={title}
        value={value}
      />
    );
  }
};
