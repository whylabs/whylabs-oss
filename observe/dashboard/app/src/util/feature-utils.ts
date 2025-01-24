import { AnomalyCategoryMap, FeatureAnomalyCategoryMap, getAnomalyMapTotal } from '../graphql/filters/feature-filters';
import {
  AlertCategory,
  Feature,
  FeatureSortBy,
  FilteredFeaturesSort,
  SortDirection,
} from '../graphql/generated/graphql';
import { SortableValue, fnThrow, sortAsc, sortDesc, sortItemsByName } from './misc';

const unknownDirection = (direction: SortDirection): never => fnThrow(`Unknown sort direction ${direction}`);

const getAlertSumForSpecificEventTypes = (
  featureAlerts?: AnomalyCategoryMap,
  alertCategories?: AlertCategory[],
): number => {
  if (!featureAlerts || !alertCategories?.length) return getAnomalyMapTotal(featureAlerts);

  return alertCategories.reduce((sum, category) => sum + (featureAlerts.get(category) ?? 0), 0);
};

// extract a sortable value from the given feature
type FeatureAccessor = (f: Feature) => SortableValue;

// given 2 features, compare them for sorting purposes
type FeatureSorter = (a: Feature, b: Feature) => number;

const getFeatureSorter = (
  direction: SortDirection,
  accessFeatureA: FeatureAccessor,
  accessFeatureB: FeatureAccessor,
): FeatureSorter => {
  switch (direction) {
    case SortDirection.Asc:
      return (a, b) => sortAsc(accessFeatureA(a), accessFeatureB(b));
    case SortDirection.Desc:
      return (a, b) => sortDesc(accessFeatureA(a), accessFeatureB(b));
    default:
      return unknownDirection(direction);
  }
};

const sortFeaturesByAlertCount = (
  features: Feature[],
  direction: SortDirection,
  anomalyCategories: AlertCategory[] | undefined,
  featureAnomalyMap: FeatureAnomalyCategoryMap,
): void => {
  const sorter = getFeatureSorter(
    direction,
    (featureA) => getAlertSumForSpecificEventTypes(featureAnomalyMap[featureA.name], anomalyCategories),
    (featureB) => getAlertSumForSpecificEventTypes(featureAnomalyMap[featureB.name], anomalyCategories),
  );

  features.sort(sorter);
};

const sortFeaturesByWeight = (features: Feature[], direction: SortDirection): void => {
  const sorter = getFeatureSorter(
    direction,
    (a) => a.weight?.value ?? 0,
    (b) => b.weight?.value ?? 0,
  );

  features.sort(sorter);
};

const sortFeaturesByWeightRank = (features: Feature[], direction: SortDirection): void => {
  const sorter = getFeatureSorter(
    direction,
    (a) => a.weight?.rank ?? Number.MAX_SAFE_INTEGER,
    (b) => b.weight?.rank ?? Number.MAX_SAFE_INTEGER,
  );

  features.sort(sorter);
};

const sortFeaturesByAbsoluteWeight = (features: Feature[], direction: SortDirection): void => {
  const substitute = direction === SortDirection.Desc ? 0 : Number.MAX_SAFE_INTEGER;
  const sorter = getFeatureSorter(
    direction,
    (a) => Math.abs(a.weight?.value ?? substitute),
    (b) => Math.abs(b.weight?.value ?? substitute),
  );

  features.sort(sorter);
};
/**
 * Sorts features (in place)
 * @param features The features to sort
 * @param sort Sort direction and type
 * @param featuresWithAnomalies Map of features to alert counts
 * @param anomalyCategories Alert types to filter on
 */
export const sortFeatures = (
  features: Feature[],
  sort: FilteredFeaturesSort,
  featuresWithAnomalies: FeatureAnomalyCategoryMap,
  anomalyCategories: AlertCategory[] | undefined,
): void => {
  switch (sort.by) {
    case FeatureSortBy.Name:
      sortItemsByName(features, sort.direction);
      break;
    case FeatureSortBy.AlertCount:
      sortFeaturesByAlertCount(features, sort.direction, anomalyCategories, featuresWithAnomalies);
      break;
    case FeatureSortBy.AbsoluteWeight:
      sortFeaturesByAbsoluteWeight(features, sort.direction);
      break;
    case FeatureSortBy.Weight:
      sortFeaturesByWeight(features, sort.direction);
      break;
    case FeatureSortBy.WeightRank:
      sortFeaturesByWeightRank(features, sort.direction);
      break;
    default:
      throw new Error(`Unknown sort type ${sort.by}`);
  }
};
