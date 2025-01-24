import { SegmentTagFilter, useGetProfileInsightInfoQuery } from 'generated/graphql';
import { useMemo } from 'react';
import { isNumber, isString } from 'utils/typeGuards';
import { dateTimeFull } from 'utils/dateUtils';
import { createProfileInsights, Insight, ProfileData } from 'components/controls/table/profiles-table/insights';

export interface UseProfileData {
  profileData?: ProfileData[];
  loading: boolean;
  error?: Error;
}

function useInsightProfileData(
  profileIds: (number | string)[],
  modelId: string,
  tags: SegmentTagFilter[],
): UseProfileData {
  const referenceProfileIds = useMemo(() => profileIds.filter(isString), [profileIds]);
  const batchProfileIds = useMemo(() => profileIds.filter(isNumber), [profileIds]);

  const { data, loading, error } = useGetProfileInsightInfoQuery({
    variables: {
      modelId,
      referenceProfileIds,
      batchProfileIds,
      tags,
    },
  });

  const batches = data?.model?.segment?.batches;
  const refs = data?.model?.segment?.referenceProfiles;
  const profileData = useMemo(() => {
    if (refs === undefined || batches === undefined) {
      return [];
    }

    const batchProfileData = batches.map((batch) => {
      const convertedBatch: ProfileData = {
        id: batch.timestamp.toString(),
        alias: dateTimeFull(batch.timestamp),
        ...batch,
      };
      return convertedBatch;
    });

    return [...(batchProfileData || []), ...(refs || [])];
  }, [batches, refs]);

  if (loading || error) {
    return { loading, error };
  }

  return { profileData, loading };
}

export interface SortedInsight {
  alias: string;
  featureName: string;
  insight: Insight;
}

export interface UseSortedInsights {
  // alias, featureName, insight []
  allInsights?: SortedInsight[];
  profileData: ProfileData[];
  loading: boolean;
  error?: Error;
}

function sortInsights(insight1: SortedInsight, insight2: SortedInsight) {
  if (insight1.featureName < insight2.featureName) {
    return -1;
  }
  if (insight1.featureName === insight2.featureName) {
    return 0;
  }
  return 1;
}

export function useSortedInsights(
  profileIds: (number | string)[],
  modelId: string,
  tags: SegmentTagFilter[],
): UseSortedInsights {
  const { profileData, loading, error } = useInsightProfileData(profileIds, modelId, tags);

  const allInsights = useMemo(() => {
    if (loading || !profileData || error) {
      return [];
    }

    const aliasInsights = profileData.map((it) => [it.alias, createProfileInsights(it)] as const);
    const flatInsights = aliasInsights.flatMap(([alias, insights]) => {
      return Object.entries(insights).flatMap(([featureName, featureInsights]) => {
        return featureInsights.map((insight) => ({ alias, featureName, insight }));
      });
    });

    return flatInsights.sort(sortInsights);
  }, [profileData, loading, error]);

  if (loading || !profileData || error) {
    return { loading, profileData: [], error };
  }

  return { allInsights, profileData, loading };
}
