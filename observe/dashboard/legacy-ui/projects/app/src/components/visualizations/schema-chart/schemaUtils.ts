import {
  FeatureType,
  GetSchemasForFeatureQuery,
  GetSchemasForOutputQuery,
  GetSchemasForSegmentedFeatureQuery,
  GetSchemasForSegmentedOutputQuery,
  SchemaFieldsFragment,
  useGetInferredDataAnalysisQuery,
  useGetSchemasForFeatureQuery,
  useGetSchemasForOutputQuery,
  useGetSchemasForSegmentedFeatureQuery,
  useGetSchemasForSegmentedOutputQuery,
} from 'generated/graphql';
import { createFlexibleDatedSchemas, DatedSchema } from 'utils/createDatedSchemas';
import { MonitoringPageType } from '../vizutils/dataUtils';

export interface DatedTypeData {
  dateInMillis: number;
  count: number;
  type: FeatureType;
}

function getTypeData(datum: DatedSchema | null, type: FeatureType): DatedTypeData | null {
  if (!datum) {
    return null;
  }
  const correctTypes = datum.typeCounts.filter((tc) => tc.type === type);
  const count = correctTypes.length > 0 ? correctTypes[0].count : 0;
  return {
    dateInMillis: datum.dateInMillis,
    count,
    type,
  };
}

export function getSingleTypeData(data: (DatedSchema | null)[], type: FeatureType): (DatedTypeData | null)[] {
  return data.map((datum) => getTypeData(datum, type));
}

type GetSchemasTypes = {
  HookType:
    | typeof useGetSchemasForFeatureQuery
    | typeof useGetSchemasForSegmentedFeatureQuery
    | typeof useGetSchemasForOutputQuery
    | typeof useGetSchemasForSegmentedOutputQuery;
  ReturnType?:
    | GetSchemasForFeatureQuery
    | GetSchemasForSegmentedFeatureQuery
    | GetSchemasForOutputQuery
    | GetSchemasForSegmentedOutputQuery;
};

interface QueriesObj {
  getAnalysisData: typeof useGetInferredDataAnalysisQuery;
  getValueData: GetSchemasTypes['HookType'];
}
export const getSchemasQueriesByPageType = (pageType: MonitoringPageType): QueriesObj => {
  const queriesByPageType = new Map<MonitoringPageType, QueriesObj>([
    [
      'feature',
      {
        getAnalysisData: useGetInferredDataAnalysisQuery,
        getValueData: useGetSchemasForSegmentedFeatureQuery,
      },
    ],
    [
      'segmentFeature',
      {
        getAnalysisData: useGetInferredDataAnalysisQuery,
        getValueData: useGetSchemasForSegmentedFeatureQuery,
      },
    ],
    [
      'outputFeature',
      {
        getAnalysisData: useGetInferredDataAnalysisQuery,
        getValueData: useGetSchemasForSegmentedOutputQuery,
      },
    ],
    [
      'segmentOutputFeature',
      {
        getAnalysisData: useGetInferredDataAnalysisQuery,
        getValueData: useGetSchemasForSegmentedOutputQuery,
      },
    ],
  ]);

  return queriesByPageType.get(pageType)!;
};

interface TranslateSchemas {
  data: GetSchemasTypes['ReturnType'];
  isOutput: boolean;
}

export const getSchemasSketches = ({ data, isOutput }: TranslateSchemas): SchemaFieldsFragment[] => {
  if (!data) return [];
  const feature = isOutput
    ? (data as GetSchemasForSegmentedOutputQuery).model?.segment?.output
    : (data as GetSchemasForSegmentedFeatureQuery).model?.segment?.feature;

  return feature?.sketches ?? [];
};

export function translateSchemas({ data, isOutput }: TranslateSchemas): DatedSchema[] {
  const sketches = getSchemasSketches({ data, isOutput });
  return createFlexibleDatedSchemas({ sketches });
}
