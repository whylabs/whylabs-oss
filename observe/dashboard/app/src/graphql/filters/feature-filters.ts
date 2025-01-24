import { AlertCategory, EventType, Feature, Maybe } from '../generated/graphql';

type FeatureFilterFunction = (feature: Feature) => boolean;

export type AlertCount = Map<EventType, number>;

export type AnomalyCategoryMap = Map<AlertCategory, number>;

export interface FeatureAnomalyCategoryMap {
  [featureName: string]: AnomalyCategoryMap;
}

export const getAnomalyMapTotal = (anomalyMap?: AnomalyCategoryMap): number => {
  if (!anomalyMap) return 0;
  return Array.from(anomalyMap.keys()).reduce((sum, type) => sum + (anomalyMap.get(type) ?? 0), 0);
};

const bySubstring =
  (substring?: Maybe<string>): FeatureFilterFunction =>
  (feature) =>
    substring == null || feature.name.toLowerCase().includes(substring.toLowerCase());

const bySubstrings =
  (substrings?: Maybe<string[]>): FeatureFilterFunction =>
  (feature) =>
    substrings === null ||
    substrings === undefined ||
    substrings.some((ss) => feature.name.toLowerCase().includes(ss.toLowerCase()));

const byDiscreteness =
  (includeDiscrete: boolean, includeNonDiscrete: boolean): FeatureFilterFunction =>
  (feature) => {
    // include everything if both filters are True, exclude everything if both are False
    if (includeDiscrete === includeNonDiscrete) return includeDiscrete && includeNonDiscrete;

    const featureIsDiscrete = !!feature.schema?.isDiscrete;
    return (featureIsDiscrete && includeDiscrete) || (!featureIsDiscrete && includeNonDiscrete);
  };

const byAnomalyCategory =
  (anomalyCategoryMap: FeatureAnomalyCategoryMap, anomalyCategories?: Maybe<AlertCategory[]>): FeatureFilterFunction =>
  (feature) =>
    !anomalyCategories?.length ||
    anomalyCategories.some((anomalyCategory) => !!anomalyCategoryMap[feature.name]?.get(anomalyCategory));

export const filterFeatures = (
  features: Feature[],
  anomalyCategoryMap: FeatureAnomalyCategoryMap,
  includeDiscrete: boolean,
  includeNonDiscrete: boolean,
  substring?: Maybe<string>,
  substrings?: Maybe<string[]>,
  anomalyCategories?: Maybe<AlertCategory[]>,
): Feature[] => {
  return features
    .filter(bySubstring(substring))
    .filter(bySubstrings(substrings))
    .filter(byDiscreteness(includeDiscrete, includeNonDiscrete))
    .filter(byAnomalyCategory(anomalyCategoryMap, anomalyCategories));
};
