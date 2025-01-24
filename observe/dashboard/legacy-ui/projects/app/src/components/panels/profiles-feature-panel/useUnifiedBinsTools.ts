import { useCallback, useEffect, useState } from 'react';

import { useSearchProfiles } from 'hooks/useSearchProfiles';
import { createCommonBinsAsync } from 'utils/createCommonBins';
import {
  BatchProfilesSketchesFragment,
  GetFeatureUnifiedBinsQuery,
  HistogramFieldsFragment,
  NumberSummaryFieldsFragment,
  StaticProfilesSketchesFragment,
  useGetFeatureUnifiedBinsQuery,
} from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { TableFeatureData, TableFeatureDataType } from 'components/controls/table/profiles-table/types';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { NumberOrString } from 'utils/queryUtils';
import { Colors } from '@whylabs/observatory-lib';
import {
  generateCommonXAxis,
  generateCommonYAxis,
  HistogramDomain,
} from 'components/visualizations/inline-histogram/histogramUtils';
import { UnifiedHistogramWithMetadata } from 'components/visualizations/OverlaidHistograms/types';
import { ApolloQueryResult } from '@apollo/client/core/types';

function getCountsFromBatchProfileSafely(profile: BatchProfilesSketchesFragment): number[] {
  const { results } = profile.sketches;
  if (results[0] && results[0].numberSummary?.histogram) return results[0].numberSummary.histogram.counts;

  return [];
}

function getCountsFromStaticProfileSafely(profile: StaticProfilesSketchesFragment): number[] {
  const results = profile.sketches?.results ?? [];
  if (results[0] && results[0].numberSummary?.histogram) return results[0].numberSummary.histogram.counts;

  return [];
}

function createXAxis(data: TableFeatureDataType[]): HistogramDomain {
  const featureProfilesValue = data.filter(
    (profile): profile is TableFeatureData => profile?.['inferred-discretion']?.toLowerCase() === 'non-discrete',
  );

  const histogramData = featureProfilesValue
    .filter((fpv): fpv is TableFeatureData => !!fpv && !!fpv.numberSummary?.histogram)
    .map((fp) => (fp.numberSummary as NumberSummaryFieldsFragment).histogram as HistogramFieldsFragment);

  const commonXAxis = generateCommonXAxis(histogramData);
  return commonXAxis;
}

function domainsAreEqual(domain1: HistogramDomain | null, domain2: HistogramDomain | null): boolean {
  if (!domain1 || !domain2) return false;
  return domain1.min === domain2.min && domain1.max === domain2.max && domain1.isValid === domain2.isValid;
}

async function computeCommonBins(min: number, max: number, amountOfBins: number): Promise<number[] | undefined> {
  try {
    const res = await createCommonBinsAsync(min, max, amountOfBins);
    return res.commonBins;
  } catch {
    return undefined;
  }
}

async function getUnifiedHistogramData(
  profileIdKeys: NumberOrString[],
  fetchResponse: ApolloQueryResult<GetFeatureUnifiedBinsQuery>,
  commonBins: number[] | undefined,
): Promise<Map<NumberOrString, HistogramFieldsFragment | undefined> | undefined> {
  if (!fetchResponse.data?.model) return undefined;
  const { batches, referenceProfiles } = fetchResponse.data.model;

  const unifiedHistogramsMap = new Map<NumberOrString, HistogramFieldsFragment | undefined>();
  profileIdKeys.forEach((profileId) => unifiedHistogramsMap.set(profileId, undefined)); // Keeps order of histograms consistent.

  batches.forEach((profile) => {
    const counts = getCountsFromBatchProfileSafely(profile);
    unifiedHistogramsMap.set(
      profile.timestamp,
      counts.length === 0 ? undefined : ({ counts, bins: commonBins } as HistogramFieldsFragment),
    );
  });

  referenceProfiles?.forEach((profile) => {
    const counts = getCountsFromStaticProfileSafely(profile);
    unifiedHistogramsMap.set(
      profile.id,
      counts.length === 0 ? undefined : ({ counts, bins: commonBins } as HistogramFieldsFragment),
    );
  });

  return unifiedHistogramsMap;
}

type UseUnifiedBinsToolsReturnType = {
  amountOfBins: number;
  commonXDomain: HistogramDomain | null;
  unifiedCommonYRange: HistogramDomain | null;
  unifiedBinsLoading: boolean;
  unifiedHistograms: UnifiedHistogramWithMetadata[] | undefined;
  setAmountOfBins: (value: number) => void;
  setData: (value: TableFeatureDataType[]) => void;
};

export function useUnifiedBinsTools(): UseUnifiedBinsToolsReturnType {
  const [amountOfBins, setAmountOfBins] = useState(30);
  const { profiles: profileIds } = useSearchProfiles();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { refetch: fetchFeatureUnifiedBins } = useGetFeatureUnifiedBinsQuery({
    skip: true, // Loading and error properties do not get updated if we have skip
  });
  const { modelId } = usePageTypeWithParams();
  const [unifiedBinsLoading, setUnifiedBinsLoading] = useState(false); // Manual handling since skip:true, does not update loading property
  const [data, setData] = useState<TableFeatureDataType[]>([]);
  const [commonXDomain, setCommonXDomain] = useState<HistogramDomain | null>(null);
  const [unifiedCommonYRange, setUnifiedCommonYrange] = useState<HistogramDomain | null>(null);
  const [unifiedHistograms, setUnifiedHistograms] = useState<UnifiedHistogramWithMetadata[] | undefined>(undefined);

  const fetchUnifiedBins = useCallback(
    async (commonBins: number[], featureId: string) => {
      const splitpoints = commonBins.slice(1, -1);
      const staticProfileIds = profileIds.filter((profile): profile is string => typeof profile === 'string');
      const batchTimestamps = profileIds.filter((profile): profile is number => typeof profile === 'number');

      const response = await fetchFeatureUnifiedBins({
        modelId,
        featureId,
        splitpoints,
        staticProfileIds,
        timestamps: batchTimestamps,
      });

      return response;
    },
    [fetchFeatureUnifiedBins, modelId, profileIds],
  );

  const createUnifiedHistogram = useCallback(
    async (binCount: number): Promise<void> => {
      setUnifiedBinsLoading(true);

      const featureProfilesValue: TableFeatureData[] = data.filter((profile): profile is TableFeatureData => !!profile);
      const originalHistogramData = featureProfilesValue
        .filter((fpv): fpv is TableFeatureData => !!fpv && !!fpv.numberSummary?.histogram)
        .map((fp) => (fp.numberSummary as NumberSummaryFieldsFragment).histogram as HistogramFieldsFragment);

      const { min, max } = generateCommonXAxis(originalHistogramData);
      const commonBins = await computeCommonBins(min, max, binCount);
      if (!commonBins) {
        setUnifiedCommonYrange(null);
        setUnifiedHistograms(undefined);
        setUnifiedBinsLoading(false);
        return;
      }
      const featureId = featureProfilesValue.length > 0 ? featureProfilesValue[0]['feature-name'] : undefined;
      const fetchResponse = commonBins && featureId ? await fetchUnifiedBins(commonBins, featureId) : undefined;
      if (!fetchResponse) return;
      if (!fetchResponse.data?.model) {
        enqueueSnackbar({
          title: 'Failed to compute unified bins, please reload the page or contact whylabs support.',
          variant: 'error',
        });
        console.log('Failed to compute unified bins in feature panel, response:', fetchResponse);
        return;
      }

      const response = await getUnifiedHistogramData(profileIds, fetchResponse, commonBins);

      if (!response) {
        setUnifiedBinsLoading(false);
        console.log('Failed to unify bins in profiles feature panel');
        return;
      }

      const histogramListWithMetadata: UnifiedHistogramWithMetadata[] = Array.from(response.keys()).map(
        (profileId, i) => {
          const profileNum = i + 1;
          const histogram = response.get(profileId);

          return {
            profileNum,
            color: Colors.profilesColorPool[i],
            data: histogram,
          };
        },
      );

      const commonYAxis = generateCommonYAxis(
        histogramListWithMetadata.reduce((acc, curr) => {
          if (curr.data) return acc.concat(curr.data);

          return acc;
        }, [] as HistogramFieldsFragment[]),
      );

      setUnifiedCommonYrange(commonYAxis);
      setUnifiedHistograms(histogramListWithMetadata);
      setUnifiedBinsLoading(false);
    },
    [data, profileIds, fetchUnifiedBins, enqueueSnackbar],
  );

  // Updating the value for `data` will trigger the effect to compute unified bins by triggering a new createXAxis value
  useEffect(() => {
    const commonXAxis = createXAxis(data);
    if (!domainsAreEqual(commonXAxis, commonXDomain)) {
      setCommonXDomain(commonXAxis);
    }
    createUnifiedHistogram(amountOfBins); // We have to compute unified bins again here because bin size might change
  }, [createUnifiedHistogram, data, commonXDomain, amountOfBins]);

  return {
    amountOfBins,
    commonXDomain,
    unifiedCommonYRange,
    unifiedBinsLoading,
    unifiedHistograms,
    setAmountOfBins,
    setData,
  };
}
