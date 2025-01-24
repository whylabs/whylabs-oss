import { createStyles } from '@mantine/core';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { TRACE_SUMMARY_NAME } from '~/routes/:orgId/:resourceId/llm-trace/utils/tabUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';

import { LlmTraceInteractionsColumnChart } from './components/LlmTraceInteractionsColumnChart';
import { LlmTraceLatencyInteractionChart } from './components/LlmTraceLatencyInteractionChart';
import { LlmTracePolicyActivityColumnChart } from './components/LlmTracePolicyActivityColumnChart';
import { LlmTraceTotalInteractionsPieChart } from './components/LlmTraceTotalInteractionsPieChart';
import { LlmTraceTotalPolicyActivityPieChart } from './components/LlmTraceTotalPolicyActivityPieChart';
import { LlmTraceTotalTokensChart } from './components/LlmTraceTotalTokensChart';
import { useLlmTraceSummaryViewModel } from './useLlmTraceSummaryViewModel';

const DEFAULT_GAP = 15;

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  scrollContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: DEFAULT_GAP,
    overflow: 'auto',
    padding: 15,
  },
  row: {
    display: 'grid',
    gap: DEFAULT_GAP,
    gridTemplateColumns: '2fr 1fr',
  },
}));

export const LlmTraceSummary = () => {
  const { classes } = useStyles();
  const viewModel = useLlmTraceSummaryViewModel();
  useSetHtmlTitle(upperCaseFirstLetterOnly(TRACE_SUMMARY_NAME));
  return (
    <div className={classes.root}>
      <div className={classes.scrollContainer}>
        <div className={classes.row}>
          <LlmTraceInteractionsColumnChart viewModel={viewModel} />
          <LlmTraceTotalInteractionsPieChart viewModel={viewModel} />
        </div>
        <div className={classes.row}>
          <LlmTracePolicyActivityColumnChart viewModel={viewModel} />
          <LlmTraceTotalPolicyActivityPieChart viewModel={viewModel} />
        </div>
        <LlmTraceTotalTokensChart viewModel={viewModel} />
        <LlmTraceLatencyInteractionChart viewModel={viewModel} />
      </div>
    </div>
  );
};
