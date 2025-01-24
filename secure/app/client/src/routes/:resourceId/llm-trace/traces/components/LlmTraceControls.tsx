import { createStyles, Skeleton } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsText } from '~/components/design-system';
import { WhyLabsVerticalDivider } from '~/components/design-system/layout/WhyLabsVerticalDivider';
import { RangeLink } from '~/components/range-link/RangeLink';
import { useMarkedTracesSearchParams } from '~/routes/:resourceId/llm-trace/traces/components/useMarkedTracesSearchParams';

import { useLlmTraceViewModel } from '../useLlmTraceViewModel';
import { LlmTraceCustomFilters } from './LlmTraceCustomFilters';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: 15,
    padding: 15,
    paddingTop: 10,
    overflow: 'auto',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    whiteSpace: 'nowrap',
    gap: 12,
  },
  title: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.55,
    margin: 0,
    marginTop: 2,
  },
  value: {
    color: Colors.linkColor,
    fontSize: 16,
    lineHeight: 1.25,
    margin: 0,
    whiteSpace: 'nowrap',
  },
  link: {
    textDecorationLine: 'underline',
  },
  filterInput: {
    width: 320,
  },
  noGapContainer: {
    gap: 0,
  },
  openEmbeddingsButton: {
    padding: '0 17px',
    '&:disabled': {
      border: `1px solid ${Colors.secondaryLight200}`,
      background: Colors.disabledInputGray,
    },
  },
}));

type LlmTraceControlsProps = {
  viewModel: ReturnType<typeof useLlmTraceViewModel>;
};

export const LlmTraceControls = ({ viewModel }: LlmTraceControlsProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const { lineage, selectedTab, trace, violationTags } = viewModel;
  const startLineage = lineage.data?.start;
  const endLineage = lineage.data?.end;
  const { calculateSelectedTraces } = useMarkedTracesSearchParams();
  const totalTracesSelected = Math.min(calculateSelectedTraces(trace.totalCount), trace.totalCount);
  const renderTotal = () => {
    if (trace.isLoading) return <Skeleton height={18} width={20} />;

    return (
      <WhyLabsText className={classes.value}>
        {!!totalTracesSelected && `${calculateSelectedTraces(trace.totalCount)} of `}
        {trace.totalCount}
      </WhyLabsText>
    );
  };

  return (
    <div className={classes.root}>
      <div className={cx(classes.container, classes.noGapContainer)}>
        <WhyLabsText className={classes.title}>Filters</WhyLabsText>
        <LlmTraceCustomFilters violationTagsOptions={violationTags.data} />
      </div>

      <div className={classes.container}>
        <WhyLabsText className={classes.title}>
          {totalTracesSelected ? 'Selected' : 'Total'} {selectedTab?.toLowerCase()}
        </WhyLabsText>
        {renderTotal()}
      </div>

      <div className={cx(classes.container, classes.noGapContainer)}>
        <WhyLabsText className={classes.title}>Bulk actions</WhyLabsText>
        <WhyLabsButton
          disabled={!totalTracesSelected}
          disabledTooltip="Select at least one trace to view in the embeddings projector"
          variant="outline"
          color="gray"
          className={classes.openEmbeddingsButton}
          onClick={viewModel.onClickOpenEmbeddingsProjector}
        >
          Open in embeddings projector
        </WhyLabsButton>
      </div>
      <WhyLabsVerticalDivider height={40} />

      <div className={classes.container}>
        <WhyLabsText className={classes.title}>Trace lineage</WhyLabsText>
        <RangeLink
          className={cx(classes.value)}
          isHeaderWidget
          isLoading={lineage.isLoading}
          notFoundMessage="No trace found"
          range={startLineage && endLineage ? [startLineage, endLineage] : null}
          includeHours
        />
      </div>
    </div>
  );
};
