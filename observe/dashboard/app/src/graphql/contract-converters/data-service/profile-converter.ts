import { v4 as uuid } from 'uuid';

import { getLogger } from '../../../providers/logger';
import {
  DataServiceFeatureType,
  DataServiceInferredType,
  NumberNaNInf,
  defaultQuantileFractions,
} from '../../../services/data/data-service/data-service-types';
import { OperationContext } from '../../../util/misc';
import { StringifiedNumber, parseIfNumber, parseStringifiedNumber, safeParseNumber } from '../../../util/numbers';
import { FeatureSketch, FeatureType, SegmentTag, TypeInference, UniqueCountSummary } from '../../generated/graphql';

const logger = getLogger('DataServiceProfileConverter');

const dataServiceInferredTypeMap = new Map<DataServiceFeatureType, FeatureType>([
  ['UNKNOWN', FeatureType.Unknown],
  ['INTEGRAL', FeatureType.Integer],
  ['FRACTIONAL', FeatureType.Fraction],
  ['STRING', FeatureType.Text],
  ['BOOLEAN', FeatureType.Boolean],
  ['NULL', FeatureType.Null],
]);

export type RequiredTypeSummary = {
  count: number;
  type: FeatureType;
};

const dataServiceInferredTypeToGQL = (featureType: DataServiceFeatureType): FeatureType => {
  return dataServiceInferredTypeMap.get(featureType) ?? FeatureType.Unknown;
};

export const inferredTypeToGQLWithRatio = (
  inferred: DataServiceInferredType,
  typeCounts: RequiredTypeSummary[],
): TypeInference => {
  const inferredType = dataServiceInferredTypeToGQL(inferred?.type ?? 'UNKNOWN');
  const typeCount = typeCounts.find(({ type }) => type === inferredType);
  const count = typeCount?.count ?? 0;
  return { type: inferredType, count, ratio: inferred?.ratio ?? 0 };
};

export const fallbackInferredTypeWithRatio = (
  sortedTypeCounts: RequiredTypeSummary[],
  totalCount: number,
): { type: FeatureType; count: number; ratio: number } => {
  const typeCount =
    // find the first non-null, non-unknown type with a non-zero count from the sorted counts, fall back to unknown
    sortedTypeCounts.find((tc) => tc.count > 0 && tc.type !== FeatureType.Null && tc.type !== FeatureType.Unknown) ?? {
      type: FeatureType.Unknown,
      count: 0,
    };
  return {
    type: typeCount.type,
    count: typeCount.count,
    ratio: totalCount ? typeCount.count / totalCount : 0,
  };
};

// these are the known metric paths within whylogs profiles that we can map to corresponding GraphQL structures
const knownProfileMetrics = [
  'types/boolean',
  'types/fractional',
  'types/integral',
  'types/object',
  'types/string',
  'counts/null',
  'counts/n',
  'distribution/isdiscrete',
  'inferredtype/type',
  'inferredtype/ratio',
  'distribution/kll/quantiles',
  'distribution/kll/histogram',
  'distribution/kll/min',
  'distribution/kll/max',
  'frequent_items/frequent_strings',
  'distribution/kll/n',
  'distribution/mean',
  'distribution/stddev',
  'cardinality/upper_1',
  'cardinality/est',
  'cardinality/lower_1',
  'whylabs/last_upload_ts',
] as const;

export type KnownProfileMetric = (typeof knownProfileMetrics)[number];

type FreqItemEstimates = Partial<{
  lb: number;
  est: number;
  ub: number;
}>;

type DataServiceFrequentItems = Partial<{
  numActive: number;
  mapCapacity: number;
  maxError: number;
  items: { [value: string]: FreqItemEstimates };
}>;

type DataServiceHistogram = Partial<{
  width: number;
  counts: StringifiedNumber[];
  max: number;
  bins: number[];
  n: StringifiedNumber;
}>;

type MetricMapping<T> = { [key in KnownProfileMetric]?: T };

// Temporary type to capture the structure of merged data service profiles. OpenAPI client doesn't have this information yet.
type DataServiceFeatureRollup = Partial<{
  type_long: MetricMapping<StringifiedNumber>;
  type_double: MetricMapping<number>;
  type_string: MetricMapping<string>;
  type_boolean: MetricMapping<boolean>;
  type_quantile: MetricMapping<NumberNaNInf[]>;
  type_frequentstrings: MetricMapping<DataServiceFrequentItems>;
  type_histogram: MetricMapping<DataServiceHistogram>;
  type_unknown: unknown;
}>;

// thin wrapper around merged profile results from the data service, to make them easier to map to GQL profiles
export type DataServiceProfile = {
  // utc millis
  timestamp: number;
  // column/feature that this profile refers to
  columnName: string;
  // rolled up metrics for this timestamp + column
  rollup: DataServiceFeatureRollup;
};

/**
 * Convert a merged data service profile for a given column into its GQL representation
 * @param orgId
 * @param datasetId
 * @param segmentTags
 * @param profile
 * @param quantileFractions Quantile splitpoints. Converter uses the Druid/Postgres KLL aggregator defaults. If custom splitpoints were specified when querying for these profiles, they should be passed to this function.
 */
export const profileToGQL = (
  orgId: string,
  datasetId: string,
  segmentTags: SegmentTag[],
  profile: DataServiceProfile,
  quantileFractions: number[] = defaultQuantileFractions,
): FeatureSketch => {
  const datasetTimestamp = profile.timestamp;
  const lastUploadTimestamp = parseIfNumber(profile.rollup.type_long?.['whylabs/last_upload_ts']);

  // for logging purposes, in case something goes wrong
  const context: OperationContext = {
    orgId,
    datasetId,
    segmentTags,
    featureName: profile.columnName,
    dataType: 'profile',
    datasetTimestamp,
  };

  try {
    const fractionCount = parseStringifiedNumber(profile.rollup.type_long?.['types/fractional'], 0);
    const integerCount = parseStringifiedNumber(profile.rollup.type_long?.['types/integral'], 0);
    const booleanCount = parseStringifiedNumber(profile.rollup.type_long?.['types/boolean'], 0);

    const typeCounts: RequiredTypeSummary[] = [
      {
        type: FeatureType.Unknown, // this includes dates, objects, arrays and other types we don't specifically handle
        count: parseStringifiedNumber(profile.rollup.type_long?.['types/object'], 0),
      },
      { type: FeatureType.Null, count: parseStringifiedNumber(profile.rollup.type_long?.['counts/null'], 0) },
      { type: FeatureType.Fraction, count: fractionCount },
      { type: FeatureType.Integer, count: integerCount },
      { type: FeatureType.Boolean, count: booleanCount },
      { type: FeatureType.Text, count: parseStringifiedNumber(profile.rollup.type_long?.['types/string'], 0) },
    ].sort((l, r) => r.count - l.count);

    const totalCount = parseStringifiedNumber(profile.rollup.type_long?.['counts/n'], 0);
    const nullCount = parseStringifiedNumber(profile.rollup.type_long?.['counts/null'], 0);

    const inferredType: DataServiceInferredType = {
      type: (profile.rollup.type_string?.['inferredtype/type'] as DataServiceFeatureType) ?? FeatureType.Unknown,
      ratio: profile.rollup.type_double?.['inferredtype/ratio'],
    };

    const inference = inferredType
      ? inferredTypeToGQLWithRatio(inferredType, typeCounts)
      : fallbackInferredTypeWithRatio(typeCounts, totalCount);

    const isDiscrete = profile.rollup.type_boolean?.['distribution/isdiscrete'] ?? true;

    const frequentStringItems = profile.rollup.type_frequentstrings?.['frequent_items/frequent_strings']?.items ?? {};
    const histogram = profile.rollup.type_histogram?.['distribution/kll/histogram'];

    const uniqueCount: UniqueCountSummary = {
      estimate: profile.rollup.type_double?.['cardinality/est'],
      lower: profile.rollup.type_double?.['cardinality/lower_1'],
      upper: profile.rollup.type_double?.['cardinality/upper_1'],
    };

    return {
      id: uuid(), // profiles don't have stable IDs in Postgres (yet?)
      featureName: profile.columnName,
      createdAt: datasetTimestamp,
      datasetTimestamp,
      lastUploadTimestamp,
      totalCount,
      nullCount,
      trueCount: 0, // not supported in whylogs v1
      nullRatio: totalCount > 0 ? nullCount / totalCount : 0,
      booleanCount,
      integerCount,
      fractionCount,
      uniqueCount,
      uniqueRatio: uniqueCount.estimate && totalCount > 0 ? uniqueCount.estimate / totalCount : null,
      schemaSummary: { inference, typeCounts },
      showAsDiscrete: isDiscrete,
      frequentItems: Object.keys(frequentStringItems).map((item) => ({
        value: item,
        lower: frequentStringItems[item].lb,
        estimate: frequentStringItems[item].est,
        upper: frequentStringItems[item].ub,
      })),
      numberSummary: {
        count: parseStringifiedNumber(profile.rollup.type_long?.['distribution/kll/n'], 0),
        histogram: {
          bins: histogram?.bins ?? [],
          counts: histogram?.counts?.map((num) => parseStringifiedNumber(num, 0)) ?? [],
        },
        isDiscrete,
        min: safeParseNumber(profile.rollup.type_double?.['distribution/kll/min'], undefined),
        max: safeParseNumber(profile.rollup.type_double?.['distribution/kll/max'], undefined),
        mean: safeParseNumber(profile.rollup.type_double?.['distribution/mean'], undefined),
        stddev: safeParseNumber(profile.rollup.type_double?.['distribution/stddev'], undefined),
        quantiles: {
          bins: quantileFractions,
          counts:
            profile.rollup.type_quantile?.['distribution/kll/quantiles']?.map((v) => safeParseNumber(v) ?? 0) ?? [],
        },
      },
    };
  } catch (err) {
    logger.error(context, 'Failed to parse profile: %s', err);
    throw err;
  }
};
