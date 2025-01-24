import { createStyles } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { WhyLabsLoadingOverlay } from '~/components/design-system';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { ProjectorContentWarningModal } from '~/routes/:orgId/:resourceId/llm-trace/components/ProjectorContentWarningModal';
import { EmbeddingsVersionModal } from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/components/EmbeddingsVersionModal';
import { useEmbeddingsProjectorViewModel } from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/useEmbeddingsProjectorViewModel';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { ReactElement } from 'react';

import { InteractiveUI } from './components/InteractiveUI';
import { ScatterPlotWrapper } from './components/ScatterPlotWrapper';

const useStyles = createStyles({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 300,
    background: 'white',
    paddingTop: 14,
    position: 'relative',
    overflow: 'hidden',
  },
});

export const EmbeddingsProjector = (): ReactElement => {
  useSetHtmlTitle('Embeddings projector');
  const { ref, width, height } = useElementSize();
  const {
    isLoadingWhylabsDatasets,
    isLoadingSelectedTraces,
    scatterPlotData,
    handleNeighborsData,
    handleLegendClick,
    removeEmbeddingsNeighbors,
    activeNeighbors,
    closeProjectorWarning,
  } = useEmbeddingsProjectorViewModel();
  const loadingEmbeddings = isLoadingWhylabsDatasets;

  const {
    embeddingsProjector: { spaceVersionsState },
  } = useLlmSecureContext();

  const { classes } = useStyles();

  const loadingData = loadingEmbeddings || isLoadingSelectedTraces;

  const renderProjectorVersionsManager = () => {
    if ((spaceVersionsState.value?.size ?? 0) < 2) return null;
    return <EmbeddingsVersionModal />;
  };

  return (
    <div className={classes.root} ref={ref}>
      <WhyLabsLoadingOverlay visible={loadingData} overlayOpacity={0.25} />
      <InteractiveUI
        handleNeighbors={handleNeighborsData}
        activeNeighbors={activeNeighbors}
        removeNeighbors={removeEmbeddingsNeighbors}
      />
      <ScatterPlotWrapper data={scatterPlotData} height={height} width={width} legendClickHandler={handleLegendClick} />
      {renderProjectorVersionsManager()}
      <ProjectorContentWarningModal onCancel={closeProjectorWarning} avoidDismiss />
    </div>
  );
};
