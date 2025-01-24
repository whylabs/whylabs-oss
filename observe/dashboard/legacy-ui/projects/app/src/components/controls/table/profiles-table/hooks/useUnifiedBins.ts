import { useState, useCallback, useEffect } from 'react';
import {
  BatchProfilesSketchesFragment,
  FeatureSketchResultFragment,
  FullSketchFieldsFragment,
  GetFeatureUnifiedBinsQuery,
  HistogramFieldsFragment,
  StaticProfilesSketchesFragment,
  useGetFeatureUnifiedBinsQuery,
} from 'generated/graphql';
import { createCommonBinsAsync } from 'utils/createCommonBins';
import { NumberOrString } from 'utils/queryUtils';
import { ProfileWithUnifiedHistograms, ProfileData } from '../types';

interface FeatureWithMinAndMax {
  featureName: string;
  profiles: NumberOrString[];
  min: number | undefined;
  max: number | undefined;
}

interface FeatureWithSplitpoints {
  featureName: string;
  profiles: NumberOrString[];
  splitpoints: number[];
  commonBins: number[];
}
interface FeatureWithMetadata {
  featureName: string;
  profiles: NumberOrString[];
  splitpoints: number[] | undefined;
  commonBins: number[] | undefined;
}

interface NonDiscreteFeature {
  profileId: NumberOrString;
  data: FullSketchFieldsFragment;
}

interface UnifiedBinsProps {
  profilesData: ProfileData[] | undefined;
  modelId: string;
}

interface UnifiedBinsReturn {
  profilesWithUnifiedHistograms: (ProfileWithUnifiedHistograms | undefined)[] | undefined;
  loading: boolean;
}

export function useUnifiedBins({ profilesData, modelId }: UnifiedBinsProps): UnifiedBinsReturn {
  const [loading, setLoading] = useState(false);
  const [profilesWithUnifiedHistograms, setProfilesWithUnifiedHistograms] =
    useState<(ProfileWithUnifiedHistograms | undefined)[]>();
  const { refetch: fetchFeatureUnifiedBins } = useGetFeatureUnifiedBinsQuery({
    skip: true, // Loading and error properties do not get updated if we have skip
  });

  const calculateFeaturesMinAndMaxes = useCallback(
    (
      nonDiscreteFeatures: Set<string>,
      profilesFeatures: (Map<string, NonDiscreteFeature> | undefined)[],
    ): FeatureWithMinAndMax[] => {
      const featuresMinAndMaxValues = Array.from(nonDiscreteFeatures).map((featureName): FeatureWithMinAndMax => {
        let min: number | undefined;
        let max: number | undefined;
        const profiles: NumberOrString[] = [];

        profilesFeatures.forEach((profile, i) => {
          if (!profile) return;
          const data = profile.get(featureName);
          const feature = profile.get(featureName)?.data;
          if (!feature || !feature.numberSummary || feature.numberSummary === null) return;
          if (data) profiles.push(data.profileId);
          const { histogram } = feature.numberSummary;
          if (!histogram || histogram.bins.length === 0) return;

          const localMin = histogram.bins[0];
          const localMax = histogram.bins[histogram.bins.length - 1];

          if (!min) min = localMin;
          if (!max) max = localMax;

          if (localMin < min) min = localMin;
          if (localMax > max) max = localMax;
        });

        return {
          featureName,
          profiles,
          min,
          max,
        };
      });

      return featuresMinAndMaxValues;
    },
    [],
  );

  const getNonDiscreteFeaturesOfProfile = useCallback((profile: ProfileData) => {
    if (!profile.sketches.results) return undefined;

    const nonDiscreteFeaturesMap = new Map<string, NonDiscreteFeature>();
    profile.sketches.results.forEach((feature) => {
      if (!feature.numberSummary) return;
      const isDiscrete = !!feature.showAsDiscrete;
      if (isDiscrete) return;

      nonDiscreteFeaturesMap.set(feature.featureName, { data: feature, profileId: profile.profileId });
    });

    return nonDiscreteFeaturesMap;
  }, []);

  const getAllNonDiscreteFeatures = useCallback(
    (profiles: ProfileData[]) => {
      const nonDiscreteFeatures = new Set<string>();
      const profilesFeatures = profiles.map((profile) => {
        const featuresMap = getNonDiscreteFeaturesOfProfile(profile);
        if (!featuresMap) return undefined;

        const featuresNames = Array.from(featuresMap.keys());
        featuresNames.forEach((featureName) => nonDiscreteFeatures.add(featureName));

        return featuresMap;
      });

      return {
        nonDiscreteFeatures,
        profilesFeatures,
      };
    },
    [getNonDiscreteFeaturesOfProfile],
  );

  const calculateSplitpoints = useCallback(async (features: FeatureWithMinAndMax[]) => {
    const commonBinsPromises = features.map((feature) => createCommonBinsAsync(feature.min, feature.max));
    const commonBinsByFeature = await Promise.allSettled(commonBinsPromises);

    const featuresWithSplitpoints: FeatureWithMetadata[] = features.map((feature, i) => {
      const featureCommonBins = commonBinsByFeature[i];
      const commonBins = featureCommonBins.status === 'fulfilled' ? featureCommonBins.value.commonBins : undefined;

      return {
        featureName: feature.featureName,
        profiles: feature.profiles,
        splitpoints: commonBins ? commonBins.slice(1, -1) : undefined, // Removing min and max values, gives us splitpoints
        commonBins,
      };
    });

    return featuresWithSplitpoints;
  }, []);

  const unifyFeatures = useCallback(
    async (features: FeatureWithMetadata[]) => {
      // Filter out undefined splitpoints
      const featuresWithSplitpoints = features.filter(
        (feature): feature is FeatureWithSplitpoints => !!feature.splitpoints && !!feature.commonBins,
      );

      const unifiedFeatures = featuresWithSplitpoints.map(({ featureName, profiles, splitpoints }) => {
        const timestamps = profiles.filter((profile): profile is number => typeof profile === 'number');
        const staticProfileIds = profiles.filter((profile): profile is string => typeof profile === 'string');

        return fetchFeatureUnifiedBins({ modelId, splitpoints, featureId: featureName, timestamps, staticProfileIds });
      });

      const unifiedFeaturesSeattled = await Promise.allSettled(unifiedFeatures);
      return unifiedFeaturesSeattled.map((feature, i) => {
        if (feature.status === 'fulfilled' && feature?.value?.data) return feature.value.data;
        return undefined;
      });
    },
    [fetchFeatureUnifiedBins, modelId],
  );

  /**
   * Deals with type definitions since everything can be undefined
   */
  const getAllfeaturesFromQueryResults = useCallback(
    (unifiedFeaturesResult: (GetFeatureUnifiedBinsQuery | undefined)[]) => {
      const features = unifiedFeaturesResult.map((result) => {
        if (!result?.model) return undefined;
        const featuresFromBatchProfiles = result.model.batches.map((feature) => feature);
        const featuresFromStaticProfiles = result.model.referenceProfiles?.map((feature) => feature);

        if (featuresFromStaticProfiles)
          return [...featuresFromBatchProfiles, ...featuresFromStaticProfiles] as (
            | BatchProfilesSketchesFragment
            | StaticProfilesSketchesFragment
          )[];

        return featuresFromBatchProfiles as BatchProfilesSketchesFragment[];
      });

      // Filter out undefined values
      const filteredFeatures = features.filter(
        (feature): feature is (BatchProfilesSketchesFragment | StaticProfilesSketchesFragment)[] => !!feature,
      );

      return filteredFeatures;
    },
    [],
  );

  // Not 100% "correct" but will work for now
  // eslint-disable-next-line
  const isBatchProfile = useCallback((item: any): item is BatchProfilesSketchesFragment => {
    if (item.timestamp) return true;

    return false;
  }, []);

  // TODO: Consider exporting as util, since we use something like this in profiles table
  const createProfileBuckets = useCallback(() => {
    const profilesBuckets = new Map<NumberOrString, (FeatureSketchResultFragment | undefined)[]>();

    if (profilesData)
      profilesData.forEach((profile) => {
        profilesBuckets.set(profile.profileId, []);
      });

    return profilesBuckets;
  }, [profilesData]);

  const mapFeaturesUnderProfiles = useCallback(
    (featureList: (BatchProfilesSketchesFragment | StaticProfilesSketchesFragment)[][]) => {
      const profileBuckets = createProfileBuckets();

      // Go through each feature and set it under correct profile
      featureList.forEach((feature) => {
        feature.forEach((profile) => {
          if (isBatchProfile(profile)) {
            const featuresData = profileBuckets.get(profile.timestamp);
            profileBuckets.set(
              profile.timestamp,
              featuresData ? [...featuresData, profile.sketches] : [profile.sketches],
            );
          } else {
            const featuresData = profileBuckets.get(profile.id);
            profileBuckets.set(
              profile.id,
              featuresData
                ? [...featuresData, profile.sketches as FeatureSketchResultFragment | undefined]
                : [profile.sketches as FeatureSketchResultFragment | undefined],
            );
          }
        });
      });

      return profileBuckets;
    },
    [createProfileBuckets, isBatchProfile],
  );

  useEffect(() => {
    if (!profilesData) return;
    setLoading(true);

    const { nonDiscreteFeatures, profilesFeatures } = getAllNonDiscreteFeatures(profilesData);
    const featuresMinAndMaxes = calculateFeaturesMinAndMaxes(nonDiscreteFeatures, profilesFeatures);

    calculateSplitpoints(featuresMinAndMaxes).then(async (featuresWithSplitpoints) => {
      const unifiedFeaturesResults = await unifyFeatures(featuresWithSplitpoints);
      const featureList = getAllfeaturesFromQueryResults(unifiedFeaturesResults);
      const profilesWithFeatureData = mapFeaturesUnderProfiles(featureList);
      const featureCommonBins = new Map<string, number[] | undefined>();
      featuresWithSplitpoints.forEach((feature) => featureCommonBins.set(feature.featureName, feature.commonBins));

      // Create final data structure
      const newState: (ProfileWithUnifiedHistograms | undefined)[] = Array.from(profilesWithFeatureData.keys()).map(
        (profileId) => {
          const histograms = new Map<string, HistogramFieldsFragment | undefined>();
          const features = profilesWithFeatureData.get(profileId);

          features?.forEach((res) => {
            if (!res || res.results.length === 0) return;
            const feature = res.results[0];
            const commonBins = featureCommonBins.get(feature.featureName);
            const histogramData: HistogramFieldsFragment = {
              counts: feature.numberSummary?.histogram?.counts ?? [],
              bins: commonBins ?? [],
            };

            if (histogramData.bins.length > 0 && histogramData.counts.length)
              histograms.set(feature.featureName, histogramData);
            else histograms.set(feature.featureName, undefined);
          });

          return {
            profileId,
            histograms,
          };
        },
      );

      setLoading(false);
      setProfilesWithUnifiedHistograms(newState);
    });
  }, [
    profilesData,
    calculateFeaturesMinAndMaxes,
    getAllNonDiscreteFeatures,
    calculateSplitpoints,
    unifyFeatures,
    getAllfeaturesFromQueryResults,
    mapFeaturesUnderProfiles,
  ]);

  return { profilesWithUnifiedHistograms, loading };
}
