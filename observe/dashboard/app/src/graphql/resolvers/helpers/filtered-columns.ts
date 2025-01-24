import { GetActiveColumnsRequest } from '../../../services/data/data-service/api-wrappers/columns';
import { CategoricalAnomalyCountRequest } from '../../../services/data/data-service/queries/analysis-queries';
import { sortFeatures } from '../../../util/feature-utils';
import { notNullish } from '../../../util/misc';
import { FullGraphQLContext } from '../../context';
import { FeatureAnomalyCategoryMap, filterFeatures } from '../../filters/feature-filters';
import {
  AlertCategory,
  Dataset,
  Feature,
  FeatureFilter,
  FeatureSortBy,
  FilteredFeaturesSort,
  GranularityInclusion,
  InputMaybe,
} from '../../generated/graphql';
import { getAnomalyCountTotals } from './anomaly-counts';

/**
 * Creates anomaly/alert maps for the features in the dataset.
 * Useful for filtering or sorting the features by anomaly type, category, or count
 * @param dataset Dataset to look for features on
 * @param fromTimestamp Starting time for the anomaly queries
 * @param toTimestamp Ending time for the anomaly queries
 * @param columnNames List of column names to get anomaly counts for
 * @param context GQL request context
 */
const getColumnAnomalyMap = async (
  dataset: Dataset,
  fromTimestamp: InputMaybe<number> | undefined,
  toTimestamp: InputMaybe<number> | undefined,
  columnNames: string[],
  context: FullGraphQLContext,
): Promise<FeatureAnomalyCategoryMap> => {
  const { datasetId, tags, batchFrequency } = dataset;
  const getFeatureAlertCountResults = async (featureName?: string) => {
    const req: CategoricalAnomalyCountRequest = {
      key: {
        orgId: context.resolveUserOrgID(),
        fromTimestamp: fromTimestamp ?? 0,
        toTimestamp: toTimestamp ?? context.requestTime,
        segmentTags: tags,
        timePeriod: batchFrequency,
        granularityInclusion: GranularityInclusion.RollupOnly,
      },
      params: { featureName, datasetId },
    };

    return context.dataSources.dataService.getCategoricalAnomalyCounts(req);
  };

  // this should result in only one (giant) query due to batching in the datasource
  // TODO: it would be more efficient to have a special query just for this use case that includes a breakdown of anomaly counts for all features in the dataset, so we don't have to get the *list* of all features beforehand from the model baseline
  const alertCountsByFeature = await Promise.all(
    columnNames.map(async (feature) => {
      return {
        feature,
        results: await getFeatureAlertCountResults(feature),
      };
    }),
  );

  const anomalyCategoryMap: FeatureAnomalyCategoryMap = alertCountsByFeature.reduce((map, alertCounts) => {
    const { feature, results } = alertCounts;

    if (!feature) {
      return map;
    }

    const categoryCounts = new Map<AlertCategory, number>();
    const totalCounts = getAnomalyCountTotals(results);
    for (const totalCount of totalCounts) {
      const { category, count } = totalCount;
      categoryCounts.set(category, count);
    }
    map[feature] = categoryCounts;
    return map;
  }, {} as FeatureAnomalyCategoryMap);

  return anomalyCategoryMap;
};

export const getNonEmptyColumns = async (
  params: GetActiveColumnsRequest,
  context: FullGraphQLContext,
): Promise<string[]> => {
  return context.dataSources.dataService.getActiveColumns(params);
};

export const getFilteredColumns = async (
  parent: Dataset,
  columns: Feature[],
  context: FullGraphQLContext,
  filter: FeatureFilter,
  sort?: FilteredFeaturesSort,
  allowWeights = true,
): Promise<Feature[]> => {
  const { substring, substrings, includeDiscrete, includeNonDiscrete, toTimestamp, anomalyCategories } = filter;
  // default to dataset timestamp if there's nothing else to go on (including 0 as a value)
  const fromTimestamp: number = (filter.fromTimestamp || parent.creationTime) ?? 0;

  // deliberately not supporting use of getNonEmptyColumns here because the endpoint has very restricted range support

  // determine whether to fetch additional information about this dataset in order to filter/sort the columns
  const shouldGetAlertMap = !!(anomalyCategories?.length || sort?.by === FeatureSortBy.AlertCount);

  const anomalyCategoryMap = shouldGetAlertMap
    ? await getColumnAnomalyMap(
        parent,
        fromTimestamp,
        toTimestamp,
        columns.map((c) => c.name),
        context,
      )
    : {};

  const shouldGetWeightsMap =
    allowWeights &&
    sort?.by &&
    [FeatureSortBy.AbsoluteWeight, FeatureSortBy.Weight, FeatureSortBy.WeightRank].includes(sort.by);

  const weightsMap = shouldGetWeightsMap
    ? await context.dataSources.featureWeights.getFeatureWeights({
        orgId: context.resolveUserOrgID(),
        datasetId: parent.datasetId,
        tags: parent.tags,
      })
    : null;

  // enhance the columns with any applicable information that we just fetched,
  // so we don't refetch it later
  if (notNullish(weightsMap)) {
    columns.forEach((f) => {
      const featureWeight = weightsMap.weights.get(f.name);
      // fall back to an empty object here, so we don't try to fetch the weight for this feature again - it doesn't exist
      f.weight = featureWeight ?? {};
    });
  }

  // filter the columns
  const filteredColumns = filterFeatures(
    columns,
    anomalyCategoryMap,
    includeDiscrete ?? true,
    includeNonDiscrete ?? true,
    substring,
    substrings,
    anomalyCategories,
  );

  if (sort) {
    sortFeatures(filteredColumns, sort, anomalyCategoryMap, anomalyCategories ?? undefined);
  }

  return filteredColumns;
};
