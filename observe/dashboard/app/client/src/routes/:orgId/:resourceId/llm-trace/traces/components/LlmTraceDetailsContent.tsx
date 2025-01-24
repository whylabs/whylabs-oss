import { createStyles } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsContextMenu } from '~/components/design-system';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { JsonViewer } from '~/components/JsonViewer/JsonViewer';
import { useFlags } from '~/hooks/useFlags';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { filterTagNeighbors } from '~/routes/:orgId/:resourceId/llm-trace/nearestNeighborsUtils';
import { timeLong } from '~/utils/dateUtils';
import { ReactElement, ReactNode } from 'react';

import { TraceContent, TraceItem } from '../types/llmTraceTypes';
import { LlmTraceHeaderInfoColumns } from './LlmTraceHeaderInfoColumns';
import { LlmTraceHeaderSeparator } from './LlmTraceHeaderSeparator';
import { LlmTraceObservationItem } from './LlmTraceObservationItem';

const HEADER_MARGIN_BOTTOM = 30;

const useStyles = createStyles(() => ({
  root: {
    height: '100%',
    overflow: 'auto',
    padding: '15px',
  },
  contentsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    position: 'relative',
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
  spanButtonControls: {
    display: 'flex',
    justifyContent: 'end',
    position: 'absolute',
    width: '100%',
    top: 0,
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
  const flags = useFlags();
  const { handleNavigation } = useNavLinkHandler();

  if (!trace) return null;

  const onClickOpenEmbeddingsProjector = (neighborsDataset?: string[]) => {
    handleNavigation({
      page: 'llm-secure',
      llmSecure: { path: 'traces', page: 'embeddings-projector' },
      setParams: [
        { name: 'trace', value: trace.traceId },
        { name: 'span', value: trace.id },
        { name: 'neighborsDataset', value: neighborsDataset?.length ? neighborsDataset : null },
      ],
    });
  };

  const contentWrapperMinHeight = Math.max(
    rootElement.height - headerContainerElement.height - HEADER_MARGIN_BOTTOM,
    0,
  );

  const hasEmbeddingCoordinates = flags.llmEmbeddingsVisualizer && !!trace?.hasPcaCoords;

  const renderProjectorButton = () => {
    const renderButton = (): ReactElement => {
      const violationNearestNeighbors = filterTagNeighbors(
        trace,
        null,
        trace?.parsedTags?.map(({ name }) => name) ?? [],
      );
      const neighborDatasets = new Set<string>(violationNearestNeighbors?.map(({ dataset }) => dataset) ?? []);
      const datasetsArray = [...neighborDatasets];
      if (datasetsArray?.length > 1) {
        const items = datasetsArray.map((dataset) => {
          return {
            label: `With nearest neighbors for ${dataset}`,
            onClick: () => onClickOpenEmbeddingsProjector(datasetsArray),
          };
        });
        return (
          <WhyLabsContextMenu
            items={items}
            position="bottom-end"
            withinPortal={false}
            target={
              <WhyLabsButton variant="outline" color="gray">
                Open in embeddings projector
              </WhyLabsButton>
            }
          />
        );
      }
      return (
        <WhyLabsButton variant="outline" color="gray" onClick={() => onClickOpenEmbeddingsProjector(datasetsArray)}>
          Open in embeddings projector
        </WhyLabsButton>
      );
    };
    return <div className={classes.spanButtonControls}>{renderButton()}</div>;
  };

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
        style={{ minHeight: contentWrapperMinHeight, paddingTop: hasEmbeddingCoordinates ? 18 : 0 }}
      >
        {hasEmbeddingCoordinates && renderProjectorButton()}
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
