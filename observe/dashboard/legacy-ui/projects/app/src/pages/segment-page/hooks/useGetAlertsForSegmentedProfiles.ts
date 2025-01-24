import {
  useGetAnomaliesForSpecificSegmentedProfileQuery,
  GetAnomaliesForSpecificSegmentedProfileQuery,
  SegmentTagFilter,
  SortDirection,
} from 'generated/graphql';
import { useEffect, useState, useMemo } from 'react';
import { NumberOrString } from 'utils/queryUtils';
import { useGetBatchesRangeTimestamps } from 'hooks/useGetBatchesRangeTimestamps';

export default function useGetAlertsForSegmentedProfiles(
  modelId: string,
  profiles: readonly NumberOrString[],
  tags: SegmentTagFilter[],
): {
  allAnomalies: GetAnomaliesForSpecificSegmentedProfileQuery[];
} {
  const { refetch: fetchProfileAlerts } = useGetAnomaliesForSpecificSegmentedProfileQuery({ skip: true });
  const [allAnomalies, setAllAnomalies] = useState<GetAnomaliesForSpecificSegmentedProfileQuery[]>([]);
  const batchProfiles = useMemo(
    () => profiles.filter((profile): profile is number => typeof profile === 'number'),
    [profiles],
  ); // Filter out static profiles since they don't have alerts
  const { loading, batches } = useGetBatchesRangeTimestamps({ modelId, timestamps: batchProfiles });

  useEffect(() => {
    if (loading) return;
    (async () => {
      const anomaliesRequest = await Promise.all(
        batchProfiles.map(async (profile, index) =>
          fetchProfileAlerts({
            modelId,
            tags,
            filter: {
              fromTimestamp: batches?.[index]?.from ?? profile,
              toTimestamp: batches?.[index]?.to ?? profile + 1,
              anomaliesOnly: true,
              includeUnhelpful: false,
            },
            sort: SortDirection.Asc,
          }),
        ),
      );
      const anomaliesData = anomaliesRequest.map((request) => request?.data);

      setAllAnomalies(anomaliesData);
    })();
  }, [batchProfiles, batches, fetchProfileAlerts, loading, modelId, tags]);

  return {
    allAnomalies,
  };
}
