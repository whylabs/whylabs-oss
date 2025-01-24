import { useResourceSegmentAnalysisViewModel } from '~/routes/:orgId/:resourceId/segment-analysis/useResourceSegmentAnalysisViewModel';
import { trpc } from '~/utils/trpc';

type AggregatedGraphsContainerViewModelProps = Pick<ReturnType<typeof useResourceSegmentAnalysisViewModel>, 'meta'>;
export const useAggregatedGraphsContainerViewModel = ({ meta }: AggregatedGraphsContainerViewModelProps) => {
  const { orgId, resourceId } = meta;
  const { data: segmentKeys, isLoading: isLoadingSegmentKeys } = trpc.meta.segments.listKeys.useQuery({
    orgId,
    resourceId,
    tags: [],
  });

  return {
    segmentInfo: {
      segmentKeys,
      isLoadingSegmentKeys,
    },
  };
};
