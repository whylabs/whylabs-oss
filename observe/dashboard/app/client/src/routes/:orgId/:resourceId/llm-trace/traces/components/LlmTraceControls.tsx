import { Skeleton, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton } from '~/components/design-system';
import { WhyLabsVerticalDivider } from '~/components/design-system/layout/WhyLabsVerticalDivider';
import { TitleValueWidget, useTitleValueWidgetStyles } from '~/components/header-widgets/TitleValueWidget';
import { RangeLink } from '~/components/range-link/RangeLink';
import { useFlags } from '~/hooks/useFlags';
import { useMarkedTracesSearchParams } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/useMarkedTracesSearchParams';

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
  link: {
    textDecorationLine: 'underline',
  },
  filterInput: {
    width: 320,
  },
  openEmbeddingsButton: {
    padding: '0 17px',
    fontWeight: 500,
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
  const { classes } = useStyles();
  const { classes: titleValueWidgetClasses } = useTitleValueWidgetStyles();
  const { lineage, trace, violationTags } = viewModel;
  const flags = useFlags();
  const startLineage = lineage.data?.start;
  const endLineage = lineage.data?.end;
  const { calculateSelectedTraces } = useMarkedTracesSearchParams();
  const totalTracesSelected = calculateSelectedTraces(trace.totalWithCoords);
  const renderTotal = () => {
    if (trace.isLoading) return <Skeleton height={18} width={20} />;

    if (totalTracesSelected) return `${totalTracesSelected} of ${trace.totalCount}`;
    return trace.totalCount;
  };

  return (
    <div className={classes.root}>
      <LlmTraceCustomFilters violationTagsOptions={violationTags.data} />
      <TitleValueWidget title={<>{totalTracesSelected ? 'Selected' : 'Total'} traces</>}>
        {renderTotal()}
      </TitleValueWidget>

      {flags.llmEmbeddingsVisualizer ? (
        <>
          <TitleValueWidget title="Bulk actions">
            <WhyLabsButton
              disabled={!totalTracesSelected || !trace.totalWithCoords}
              disabledTooltip={
                trace.totalWithCoords
                  ? 'Select at least one trace to view in the embeddings projector'
                  : 'The listed traces have no computed coordinates to view in the embedding projector'
              }
              variant="outline"
              color="gray"
              className={classes.openEmbeddingsButton}
              onClick={viewModel.onClickOpenEmbeddingsProjector}
            >
              Open in embeddings projector
            </WhyLabsButton>
          </TitleValueWidget>
          <WhyLabsVerticalDivider height={40} />
        </>
      ) : null}

      <TitleValueWidget title="Trace lineage">
        <RangeLink
          className={titleValueWidgetClasses.value}
          isHeaderWidget
          isLoading={lineage.isLoading}
          notFoundMessage="No trace found"
          range={startLineage && endLineage ? [startLineage, endLineage] : null}
          includeHours
        />
      </TitleValueWidget>
    </div>
  );
};
