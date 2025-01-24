import { createStyles } from '@mantine/core';
import { ReactNode } from 'react';

import { LlmTraceHeaderInfoColumns } from '../../components/LlmTraceHeaderInfoColumns';
import { LlmTraceHeaderSeparator } from '../../components/LlmTraceHeaderSeparator';
import { TraceItem } from '../../types/llmTraceTypes';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    height: 'fit-content',
    overflow: 'auto',
    padding: '8px 20px',
  },
}));

type LlmTraceDetailsHeaderProps = {
  trace?: TraceItem;
};

export const LlmTraceDetailsHeader = ({ trace }: LlmTraceDetailsHeaderProps) => {
  const { classes } = useStyles();

  const children = (() => {
    if (!trace) return null;

    return (
      <>
        {renderColumn('Trace ID', trace?.id)}
        <LlmTraceHeaderSeparator />
        {renderColumn('Total policy issues', trace?.totalPolicyIssues)}
        <LlmTraceHeaderSeparator />
        {renderColumn('Latency', trace?.latency)}
        {!!trace?.inputAndCompletionTokens && (
          <>
            <LlmTraceHeaderSeparator />
            {renderColumn('Tokens (total)', trace.inputAndCompletionTokens)}
          </>
        )}
      </>
    );
  })();

  return <div className={classes.root}>{children}</div>;

  function renderColumn(title: string, value: ReactNode) {
    return <LlmTraceHeaderInfoColumns title={title} value={value} />;
  }
};
