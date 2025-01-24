import {
  useGetAnomaliesForSpecificProfileQuery,
  GetAnomaliesForSpecificProfileQuery,
  SortDirection,
} from 'generated/graphql';
import { useState, useMemo } from 'react';
import { NumberOrString } from 'utils/queryUtils';
import { useGetBatchesRangeTimestamps } from 'hooks/useGetBatchesRangeTimestamps';
import { useDeepCompareEffect } from 'hooks/useDeepCompareEffect';

export default function useGetAlertsForProfiles(
  modelId: string,
  profiles: readonly NumberOrString[],
): {
  allAnomalies: GetAnomaliesForSpecificProfileQuery[];
} {
  const { refetch: fetchProfileAnomalies } = useGetAnomaliesForSpecificProfileQuery({ skip: true });
  const [allAnomalies, setAllAnomalies] = useState<GetAnomaliesForSpecificProfileQuery[]>([]);
  const batchProfiles = useMemo(
    () => profiles.filter((profile): profile is number => typeof profile === 'number'),
    [profiles],
  ); // Filter out static profiles since they don't have alerts
  const { loading, batches } = useGetBatchesRangeTimestamps({ modelId, timestamps: batchProfiles });

  useDeepCompareEffect(() => {
    if (loading) return;
    (async () => {
      const anomaliesRequest = await Promise.all(
        batchProfiles.map(async (profile, index) =>
          fetchProfileAnomalies({
            modelId,
            filter: {
              fromTimestamp: batches?.[index]?.from ?? profile,
              toTimestamp: batches?.[index]?.to ?? profile + 1,
              anomaliesOnly: true,
              includeUnhelpful: false,
            }, // timestamp to timestamp does not work, we have to add one ms to end of the range
            sort: SortDirection.Asc,
          }),
        ),
      );
      const anomaliesData = anomaliesRequest.filter(Boolean).map((request) => request.data);

      setAllAnomalies(anomaliesData);
    })();
  }, [batchProfiles, batches, fetchProfileAnomalies, loading, modelId]);

  return {
    allAnomalies,
  };
}
