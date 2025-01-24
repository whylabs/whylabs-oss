import { TraceItem } from '~server/trpc/meta/llm-trace/types/llmTraceTypes';
import { NearestNeighborData } from '~server/trpc/meta/llm-trace/utils/llmTraceUtils';
import { mapViolationTagsToNeighborsDatasets } from '~server/trpc/meta/llm-trace/utils/whylabsSecureMappers';

export const filterTagNeighbors = (
  data: TraceItem,
  type: string | null,
  tags: string[],
  excludedDatasets?: string[],
): NearestNeighborData[] | undefined => {
  const { nearestNeighborsData } = data;
  const tagNeighborsDatasets = tags
    .flatMap((tag) => mapViolationTagsToNeighborsDatasets.get(tag) || [])
    .filter((t) => !excludedDatasets?.includes(t));
  return nearestNeighborsData?.filter(
    (nn) => (type === null || nn.type === type) && tagNeighborsDatasets?.includes(nn.dataset),
  );
};
