import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { loader } from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/useEmbeddingsProjectorViewModel';
import {
  EmbeddingNearestNeighbor,
  TraceEmbeddingCard,
  embeddingsAtom,
  generateNeighborSeriesId,
} from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/utils';
import { filterTagNeighbors } from '~/routes/:orgId/:resourceId/llm-trace/nearestNeighborsUtils';
import { TraceTableFilter } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/utils';
import { LoaderData } from '~/types/LoaderData';
import { NEAREST_NEIGHBORS_DATASET_QUERY_NAME } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { TraceItem } from '~server/trpc/meta/llm-trace/types/llmTraceTypes';
import { useAtom } from 'jotai';
import LogRocket from 'logrocket';
import { useLoaderData, useSearchParams } from 'react-router-dom';

export type InteractiveUiProps = {
  handleNeighbors: (neighbors: EmbeddingNearestNeighbor[]) => void;
  activeNeighbors: EmbeddingNearestNeighbor[];
  removeNeighbors: (traceId: string, spanId: string, neighborSeriesIds: string[] | null) => void;
};

export const useInteractiveUIViewModel = ({
  activeNeighbors,
  removeNeighbors,
  handleNeighbors,
}: InteractiveUiProps) => {
  const [selectedEmbeddings, setSelectedEmbeddings] = useAtom(embeddingsAtom);
  const { orgId, resourceId } = useLoaderData() as LoaderData<typeof loader>;
  const { handleNavigation } = useNavLinkHandler();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [searchParams] = useSearchParams();

  const copyToClipboard = (content: string, label: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        enqueueSnackbar({ title: `${label} copied to clipboard!` });
      })
      .catch((error) => {
        LogRocket.error(`Failed to copy ${label} to clipboard:`, error);
      });
  };

  const mountTraceIdTableFilter = (traceIds: string[]) => {
    const newTraceIdsFilter = [...new Set(traceIds).values()].join(', ');
    return [
      {
        dimension: 'traceId',
        value: newTraceIdsFilter,
      },
    ] satisfies TraceTableFilter[];
  };

  const filterTableWithSelectedEmbeddings = () => {
    const selectedTraceIds = selectedEmbeddings?.map(({ traceId }) => traceId) ?? [];
    handleNavigation({
      page: 'llm-secure',
      llmSecure: { path: 'traces' },
      setParams: [
        { name: 'filter', value: JSON.stringify(mountTraceIdTableFilter(selectedTraceIds)) },
        { name: 'filterTraceId', value: null },
        { name: 'selectedAllTraces', value: 'true' },
      ],
    });
  };

  const embeddingsQueries = trpc.useQueries(
    (t) =>
      selectedEmbeddings?.map((embedding) =>
        t.meta.llmTrace.describeItem({
          // this is pretty cool because TRPC cache will be used, and it will not repeat the previous selected embeddings already fetched
          traceId: embedding.traceId,
          itemId: embedding.spanId,
          orgId,
          resourceId,
        }),
      ) ?? [],
  );

  const unselectEmbedding = (item: TraceItem) => {
    removeNeighbors(item.traceId, item.id, null);
    setSelectedEmbeddings((prev) => {
      const newState =
        prev?.filter((embedding) => embedding.traceId !== item.traceId && embedding.spanId !== item.id) ?? [];
      return [...newState];
    });
  };

  const handleOpenInTraceView = (item: TraceItem) => {
    handleNavigation({ page: 'llm-secure', llmSecure: { path: 'traces', traceId: item.traceId, traceItem: item.id } });
  };

  const stickNeighborsDatasets = searchParams.getAll(NEAREST_NEIGHBORS_DATASET_QUERY_NAME);

  const handleTagWithNeighborsClick = (data: TraceItem, cardData: TraceEmbeddingCard, tag: string) => () => {
    const neighborsData = filterTagNeighbors(data, cardData.embeddingType, [tag], stickNeighborsDatasets);
    if (!neighborsData?.length) return;
    const { traceId, spanId, embeddingType } = cardData;
    const activeNeighborSeries = neighborsData.filter((nn) =>
      activeNeighbors.find(
        (currNN) =>
          currNN.dataset === nn.dataset &&
          currNN.targetEmbedding.embeddingType === embeddingType &&
          currNN.targetEmbedding.traceId === traceId &&
          currNN.targetEmbedding.spanId === spanId,
      ),
    );
    const embeddingNeighbors: EmbeddingNearestNeighbor[] = neighborsData.map((nn) => ({
      ...nn,
      targetEmbedding: cardData,
    }));
    if (activeNeighborSeries.length === neighborsData.length) {
      removeNeighbors(
        traceId,
        spanId,
        embeddingNeighbors.map((nnSeries) => generateNeighborSeriesId(nnSeries)),
      );
      return;
    }

    handleNeighbors(embeddingNeighbors);
  };

  return {
    embeddingsQueries,
    unselectEmbedding,
    handleOpenInTraceView,
    copyToClipboard,
    filterTableWithSelectedEmbeddings,
    handleTagWithNeighborsClick,
    stickNeighborsDatasets,
  };
};
