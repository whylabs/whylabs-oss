/* eslint-disable */

export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type DateRange = {
  __typename?: 'DateRange';
  fromTimestamp: Scalars['Float']['output'];
  toTimestamp: Scalars['Float']['output'];
};

export enum TimePeriod {
  All = 'ALL',
  Individual = 'INDIVIDUAL',
  P1D = 'P1D',
  P1M = 'P1M',
  P1W = 'P1W',
  Pt1H = 'PT1H',
  Unknown = 'UNKNOWN',
}

export type ModelMetadataResponse = {
  id: string;
  name: string;
  creationTime: number;
  timePeriod: string;
  modelType?: string | null;
  modelCategory: string;
  active?: boolean | null;
};

export type ResourceWithAvailability = {
  dataAvailability?: DataAvailability;
} & ModelMetadataResponse;

export type DataAvailability = {
  __typename?: 'DataAvailability';
  /** Whether the dataset has any data */
  hasData?: Maybe<Scalars['Boolean']['output']>;
  /** Timestamp of the latest (most recent) available batch of data for the dataset */
  latestTimestamp?: Maybe<Scalars['Float']['output']>;
  /** Timestamp of the oldest available batch of data for the dataset */
  oldestTimestamp?: Maybe<Scalars['Float']['output']>;
};

export type SegmentTag = {
  __typename?: 'SegmentTag';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type SegmentTagFilter = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type SegmentFilter = {
  fromTimestamp?: InputMaybe<Scalars['Float']['input']>;
  substring?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<SegmentTagFilter>>;
  toTimestamp?: InputMaybe<Scalars['Float']['input']>;
};

export enum SegmentScope {
  Batch = 'Batch',
  Both = 'Both',
  Reference = 'Reference',
}

export enum AnalysisMetric {
  /** Fields PROFILE_xxx, INPUT_COUNT, OUTPUT_COUNT, SHAPE_xxx, COLUMN_ROW_COUNT_SUM are not implemented */
  ClassificationAccuracy = 'CLASSIFICATION_ACCURACY',
  ClassificationAuroc = 'CLASSIFICATION_AUROC',
  ClassificationF1 = 'CLASSIFICATION_F1',
  ClassificationFpr = 'CLASSIFICATION_FPR',
  ClassificationPrecision = 'CLASSIFICATION_PRECISION',
  ClassificationRecall = 'CLASSIFICATION_RECALL',
  ColumnRowCountSum = 'COLUMN_ROW_COUNT_SUM',
  Composed = 'COMPOSED',
  Count = 'COUNT',
  CountBool = 'COUNT_BOOL',
  CountBoolRatio = 'COUNT_BOOL_RATIO',
  CountFractional = 'COUNT_FRACTIONAL',
  CountFractionalRatio = 'COUNT_FRACTIONAL_RATIO',
  CountIntegral = 'COUNT_INTEGRAL',
  CountIntegralRatio = 'COUNT_INTEGRAL_RATIO',
  CountNull = 'COUNT_NULL',
  CountNullRatio = 'COUNT_NULL_RATIO',
  CountString = 'COUNT_STRING',
  CountStringRatio = 'COUNT_STRING_RATIO',
  FrequentItems = 'FREQUENT_ITEMS',
  Histogram = 'HISTOGRAM',
  InferredDataType = 'INFERRED_DATA_TYPE',
  InputCount = 'INPUT_COUNT',
  Max = 'MAX',
  Mean = 'MEAN',
  Median = 'MEDIAN',
  Min = 'MIN',
  MissingDatapoint = 'MISSING_DATAPOINT',
  OutputCount = 'OUTPUT_COUNT',
  PredictionCount = 'PREDICTION_COUNT',
  ProfileCount = 'PROFILE_COUNT',
  ProfileFirstIngestionTime = 'PROFILE_FIRST_INGESTION_TIME',
  ProfileLastIngestionTime = 'PROFILE_LAST_INGESTION_TIME',
  Quantile_5 = 'QUANTILE_5',
  Quantile_25 = 'QUANTILE_25',
  Quantile_75 = 'QUANTILE_75',
  Quantile_90 = 'QUANTILE_90',
  Quantile_95 = 'QUANTILE_95',
  Quantile_99 = 'QUANTILE_99',
  RegressionMae = 'REGRESSION_MAE',
  RegressionMse = 'REGRESSION_MSE',
  RegressionRmse = 'REGRESSION_RMSE',
  SecondsSinceLastUpload = 'SECONDS_SINCE_LAST_UPLOAD',
  ShapeColumnCount = 'SHAPE_COLUMN_COUNT',
  ShapeRowCount = 'SHAPE_ROW_COUNT',
  StdDev = 'STD_DEV',
  UniqueEst = 'UNIQUE_EST',
  UniqueEstRatio = 'UNIQUE_EST_RATIO',
  UniqueLower = 'UNIQUE_LOWER',
  UniqueLowerRatio = 'UNIQUE_LOWER_RATIO',
  UniqueUpper = 'UNIQUE_UPPER',
  UniqueUpperRatio = 'UNIQUE_UPPER_RATIO',
  Unknown = 'UNKNOWN',
  Variance = 'VARIANCE',
}

// TODO: Remove this
export enum MembershipRole {
  Admin = 'Admin',
  Member = 'Member',
  Unknown = 'Unknown',
  Viewer = 'Viewer',
}

// TODO: Remove this
export enum Permission {
  ManageActions = 'MANAGE_ACTIONS',
  ManageApiTokens = 'MANAGE_API_TOKENS',
  ManageDashboards = 'MANAGE_DASHBOARDS',
  ManageDatasets = 'MANAGE_DATASETS',
  ManageInternal = 'MANAGE_INTERNAL',
  ManageMonitors = 'MANAGE_MONITORS',
  ManageOrg = 'MANAGE_ORG',
  ViewData = 'VIEW_DATA',
}

export enum AlertCategory {
  DataDrift = 'DataDrift',
  DataQuality = 'DataQuality',
  Ingestion = 'Ingestion',
  Performance = 'Performance',
  Unknown = 'Unknown',
}

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

/** Code used for error identification */
export enum DashbirdErrorCode {
  AdhocMonitorRunError = 'ADHOC_MONITOR_RUN_ERROR',
  ArgumentValue = 'ARGUMENT_VALUE',
  AuthorizationError = 'AUTHORIZATION_ERROR',
  BackfillAnalyzersError = 'BACKFILL_ANALYZERS_ERROR',
  DataQueryValidationError = 'DATA_QUERY_VALIDATION_ERROR',
  GenericError = 'GENERIC_ERROR',
  IllegalArgument = 'ILLEGAL_ARGUMENT',
  InvalidOrganization = 'INVALID_ORGANIZATION',
  InvalidRequest = 'INVALID_REQUEST',
  InvalidTimeRange = 'INVALID_TIME_RANGE',
  MonitorConfigValidationError = 'MONITOR_CONFIG_VALIDATION_ERROR',
  MonitorSchemaValidationError = 'MONITOR_SCHEMA_VALIDATION_ERROR',
  PaginationLimitExceeded = 'PAGINATION_LIMIT_EXCEEDED',
  QueryTooGranular = 'QUERY_TOO_GRANULAR',
  ResourceAlreadyExists = 'RESOURCE_ALREADY_EXISTS',
  ResourceConstraint = 'RESOURCE_CONSTRAINT',
  ValidationError = 'VALIDATION_ERROR',
}

export type DashbirdError = {
  __typename?: 'DashbirdError';
  /** Error code */
  code: DashbirdErrorCode;
  /** Parameter with error */
  parameter?: Maybe<Scalars['String']['output']>;
  /** Message that should be safe to show to users */
  safeErrorMsg: Scalars['String']['output'];
};

export enum AnalysisTargetLevel {
  Column = 'COLUMN',
  Dataset = 'DATASET',
  Unknown = 'UNKNOWN',
}

/**
 * Result of an analyzer run.
 * Field definitions can also be found in the monitor code: https://gitlab.com/whylabs/core/whylabs-processing-core/-/blob/mainline/murmuration/src/main/java/ai/whylabs/core/structures/monitor/events/AnalyzerResult.java
 */
export type AnalysisResult = {
  __typename?: 'AnalysisResult';
  /**
   * Algorithm used to produce the analysis
   * Currently corresponds to DriftConfig[algorithm]  in monitor config schema
   */
  algorithm?: Maybe<Scalars['String']['output']>;
  /**
   * Mode of the algorithm
   * Currently corresponds to ColumnListChangeConfig[mode] or DiffConfig[mode]  in monitor config schema
   */
  algorithmMode?: Maybe<Scalars['String']['output']>;
  /**
   * UUID defining a particular analyzer running on a specific point in time. Similar to 'id', but stable across monitor backfills.
   * When backfilling/overwriting monitor data, this ID will be stable across multiple job runs (unlike the similar 'id' property)
   */
  analysisId?: Maybe<Scalars['String']['output']>;
  /** Version of the analyzer config that produced this analysis */
  analyzerConfigVersion?: Maybe<Scalars['Int']['output']>;
  /** Which analyzer produced the analysis */
  analyzerId?: Maybe<Scalars['String']['output']>;
  /** What type of analyzer result was produced. Determines which fields/columns will be useful to explain the event. */
  analyzerResultType?: Maybe<Scalars['String']['output']>;
  /** The tags associated with the analyzer, e.g. indicating if it is a constraint */
  analyzerTags?: Maybe<Array<Scalars['String']['output']>>;
  /** Currently corresponds to AlgorithmType in monitor config schema */
  analyzerType?: Maybe<Scalars['String']['output']>;
  /** Duration of the calculation */
  calculationRuntimeNano?: Maybe<Scalars['Float']['output']>;
  /** Inferred category of the anomaly, based on its target metric */
  category?: Maybe<AlertCategory>;
  /** For a composed analyzer, identifies the AnalysisResults of the child analyzers */
  childAnalysisIds?: Maybe<Array<Scalars['String']['output']>>;
  /** For a composed analyzer, identifies the child analyzers in the monitor config */
  childAnalyzerIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Name of the target column, if applicable */
  column?: Maybe<Scalars['String']['output']>;
  /** For column_list analysis, how many columns were added */
  columnList_added?: Maybe<Scalars['Float']['output']>;
  /** Sample list of the added columns */
  columnList_addedSample?: Maybe<Array<Scalars['String']['output']>>;
  /** Describes how the column list analyzer was configured (e.g. on add/remove, on add, etc) */
  columnList_mode?: Maybe<Scalars['String']['output']>;
  /** For column_list analysis, how many columns were removed */
  columnList_removed?: Maybe<Scalars['Float']['output']>;
  /** Sample list of the removed columns */
  columnList_removedSample?: Maybe<Array<Scalars['String']['output']>>;
  /** Expected value when performing an equality check */
  comparison_expected?: Maybe<Scalars['String']['output']>;
  /** Observed value when performing an equality check */
  comparison_observed?: Maybe<Scalars['String']['output']>;
  /** When the analysis was produced by monitor */
  creationTimestamp?: Maybe<Scalars['Float']['output']>;
  datasetId?: Maybe<Scalars['String']['output']>;
  /** Timestamp of the profile that this analysis refers to */
  datasetTimestamp?: Maybe<Scalars['Float']['output']>;
  /** For diff analysis, what was the metric value */
  diff_metricValue?: Maybe<Scalars['Float']['output']>;
  /** Diff mode for diff analyzers (DiffConfig[mode]) */
  diff_mode?: Maybe<Scalars['String']['output']>;
  /** Threshold for the diff to trigger an anomaly */
  diff_threshold?: Maybe<Scalars['Float']['output']>;
  /** If the analyzer is run on individual profiles, this will be true */
  disableTargetRollup?: Maybe<Scalars['Boolean']['output']>;
  /** For drift analysis, what was the metric value */
  drift_metricValue?: Maybe<Scalars['Float']['output']>;
  /** ??? TODO */
  drift_minBatchSize?: Maybe<Scalars['Float']['output']>;
  /** For drift analysis, what was the threshold */
  drift_threshold?: Maybe<Scalars['Float']['output']>;
  /**
   * Names of this analysis result's fields that help explain the anomaly.
   * Each value will be in `keyof AnalysisResult`.
   */
  explanationFields?: Maybe<Array<Scalars['String']['output']>>;
  /** If there was a failure computing the analysis, provides additional context on why the analyzer run failed */
  failureExplanation?: Maybe<Scalars['String']['output']>;
  /** If there was a failure computing the analysis, this captures the failure code */
  failureType?: Maybe<Scalars['String']['output']>;
  /** Frequent string comparison operator */
  frequentStringComparison_operator?: Maybe<Scalars['String']['output']>;
  /** Mismatched strings found by frequent string comparison */
  frequentStringComparison_sample?: Maybe<Array<Scalars['String']['output']>>;
  /** Granularity at which the analysis was produced */
  granularity?: Maybe<Scalars['String']['output']>;
  /**
   * UUID/primary key of the analysis result that resulted from a particular monitor run.
   * You will probably want to use 'analysisId', rather than 'id' in most cases.
   */
  id?: Maybe<Scalars['String']['output']>;
  /** Whether the analysis is an anomaly */
  isAnomaly?: Maybe<Scalars['Boolean']['output']>;
  /** Users can mark anomalies as false alarms */
  isFalseAlarm?: Maybe<Scalars['Boolean']['output']>;
  /** Metric targeted by the analysis */
  metric?: Maybe<AnalysisMetric>;
  /** monitorDisplayName */
  monitorDisplayName?: Maybe<Scalars['String']['output']>;
  /** IDs of the monitors that were triggered by the anomaly */
  monitorIds?: Maybe<Array<Scalars['String']['output']>>;
  /** When was the data last modified when this analysis was produced */
  mostRecentDatasetDatalakeWriteTs?: Maybe<Scalars['Float']['output']>;
  /** This is a composed analyzer (e.g. conjunction/disjunction) that combines the results of multiple child analyzers */
  parent?: Maybe<Scalars['Boolean']['output']>;
  /** ID of the monitor run that produced this analysis */
  runId?: Maybe<Scalars['String']['output']>;
  /**
   * Segment tags for which the analysis result was generated.
   * Empty tags = overall segment
   */
  tags: Array<SegmentTag>;
  /** What part of the dataset the analyzer was targeting */
  targetLevel?: Maybe<AnalysisTargetLevel>;
  /** Absolute lower threshold */
  threshold_absoluteLower?: Maybe<Scalars['Float']['output']>;
  /** Absolute upper threshold */
  threshold_absoluteUpper?: Maybe<Scalars['Float']['output']>;
  /** For threshold analysis, what was the baseline metric value */
  threshold_baselineMetricValue?: Maybe<Scalars['Float']['output']>;
  /** For threshold analysis, what was the lower threshold that was used for the calculation */
  threshold_calculatedLower?: Maybe<Scalars['Float']['output']>;
  /** For threshold analysis, what was the upper threshold that was used for the calculation */
  threshold_calculatedUpper?: Maybe<Scalars['Float']['output']>;
  /** When doing stddev, the factor */
  threshold_factor?: Maybe<Scalars['Float']['output']>;
  /** For threshold analysis, what was the metric value */
  threshold_metricValue?: Maybe<Scalars['Float']['output']>;
  /** Minimum number of batches present for this calculation to run */
  threshold_minBatchSize?: Maybe<Scalars['Float']['output']>;
  /** If the analyzer is run on individual profiles, this will contain zero or more traceIds associated with the profile */
  traceIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Weight of the target (importance), as registered in the entity schema */
  weight?: Maybe<Scalars['Float']['output']>;
};

export type FloatDataPoint = {
  __typename?: 'FloatDataPoint';
  lastUploadTimestamp?: Maybe<Scalars['Float']['output']>;
  timestamp: Scalars['Float']['output'];
  value: Scalars['Float']['output'];
};

export type MetricQuery = {
  datasetId: Scalars['String']['input'];
  /** Feature to query. This should be omitted if the metric is a dataset metric. */
  feature?: InputMaybe<Scalars['String']['input']>;
  metric: AnalysisMetric;
};

export type MetricResult = {
  __typename?: 'MetricResult';
  datasetId: Scalars['String']['output'];
  feature: Scalars['String']['output'];
  metric: AnalysisMetric;
  points: Array<FloatDataPoint>;
  /** The specific segment tags queried - none for the full dataset. */
  segment?: Maybe<Array<SegmentTag>>;
  segmentDescription?: Maybe<Scalars['String']['output']>;
};

export type SegmentSort = {
  by: SegmentSortBy;
  direction: SortDirection;
};

export enum SegmentSortBy {
  /** Sort segments by the count of anomalies observed in them (must specify from/to timestamps when querying segments) */
  AnomalyCount = 'AnomalyCount',
  /** Sort segments by name */
  Name = 'Name',
}

export enum MetricSource {
  Llm = 'LLM',
  UserDefined = 'USER_DEFINED',
  Whylabs = 'WHYLABS',
}

export type MetricBounds = {
  __typename?: 'MetricBounds';
  /** Name of metric that is the lower bound, if any */
  lower?: Maybe<AnalysisMetric>;
  /** Name of metric that is the upper bound, if any */
  upper?: Maybe<AnalysisMetric>;
};

export enum MetricDataType {
  Complex = 'COMPLEX',
  Float = 'FLOAT',
  Integer = 'INTEGER',
}

export enum MetricDirection {
  /** The metric improves as its numeric value decreases */
  ImproveDown = 'IMPROVE_DOWN',
  /** The metric improves as its numeric value increases */
  ImproveUp = 'IMPROVE_UP',
}

export enum MetricKind {
  /** An amount can be summed/averaged over time. A rollup query will give the sum over the unit of granularity. */
  Amount = 'AMOUNT',
  /**
   * A distribution shows the distribution of values within a profile.
   * A rollup query will show the distribution over the unit of granularity.
   */
  Distribution = 'DISTRIBUTION',
  /**
   * A rate (including ratios, percents) compares one amount to another. It cannot typically be summed/averaged over time.
   * A rollup query will perform the right calculation to give the rate over the unit of granularity.
   */
  Rate = 'RATE',
}

export type MetricQueryDefinition = {
  __typename?: 'MetricQueryDefinition';
  /** Name of the column to query, if data is not available at the dataset level */
  column?: Maybe<Scalars['String']['output']>;
  /** Which WhyLabs metric to query */
  metric: AnalysisMetric;
  /** The label of the WhyLabs metric to query */
  metricLabel?: Maybe<Scalars['String']['output']>;
  /** Whether to look at a specific column or the entire dataset */
  targetLevel: AnalysisTargetLevel;
};

export type MetricSchema = {
  __typename?: 'MetricSchema';
  /** The related bounding metrics, if any. */
  bounds?: Maybe<MetricBounds>;
  /** The data type of the metric. */
  dataType: MetricDataType;
  /** Description of the metric (particularly LLM metrics). */
  description?: Maybe<Scalars['String']['output']>;
  /** A short label suitable for displaying in a UI. */
  label: Scalars['String']['output'];
  /** Whether this metric improves up or down. Only applies to a subset of metrics such as performance. */
  metricDirection?: Maybe<MetricDirection>;
  /** Whether this metric is a rate or amount. */
  metricKind?: Maybe<MetricKind>;
  /** The name of the metric if it is a built-in metric. */
  name?: Maybe<AnalysisMetric>;
  /** An explanation of how to construct the query for this metric */
  queryDefinition?: Maybe<MetricQueryDefinition>;
  /** Whether this metric is usually shown as a percent. */
  showAsPercent?: Maybe<Scalars['Boolean']['output']>;
  /** The source of the metric. */
  source: MetricSource;
  /** User-assigned tags associated with this metric (particularly LLM metrics). */
  tags?: Maybe<Array<Scalars['String']['output']>>;
  /** Whether this metric is bounded between 0 and 1. */
  unitInterval?: Maybe<Scalars['Boolean']['output']>;
};

export type GroupedAlertBatch = {
  __typename?: 'GroupedAlertBatch';
  /** Counts of alerts by category */
  counts: Array<AlertCategoryCount>;
  /** Alert timestamp */
  timestamp: Scalars['Float']['output'];
};

export type AlertCategoryCount = {
  __typename?: 'AlertCategoryCount';
  category: AlertCategory;
  count: Scalars['Float']['output'];
  metric?: Maybe<AnalysisMetric>;
};

export type AlertCategoryCounts = {
  __typename?: 'AlertCategoryCounts';
  /** Alerts by category and timestamp */
  timeseries: Array<GroupedAlertBatch>;
  /** Total alerts within range, broken down by category */
  totals: Array<AlertCategoryCount>;
};

export type AlertCount = {
  __typename?: 'AlertCount';
  dataType: Scalars['Float']['output'];
  distribution: Scalars['Float']['output'];
  nullFraction: Scalars['Float']['output'];
  thresholdBased: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  uniqueness: Scalars['Float']['output'];
  unknown: Scalars['Float']['output'];
};

export enum EventArchetype {
  DataType = 'DataType',
  Threshold = 'Threshold',
  Unknown = 'Unknown',
}

export enum FeatureType {
  Boolean = 'BOOLEAN',
  Fraction = 'FRACTION',
  Integer = 'INTEGER',
  Null = 'NULL',
  Text = 'TEXT',
  Unknown = 'UNKNOWN',
}

export enum WhyLogsMetric {
  DistributionDistance = 'DistributionDistance',
  InferredDataType = 'InferredDataType',
  Max = 'Max',
  Mean = 'Mean',
  Min = 'Min',
  MissingValuesRatio = 'MissingValuesRatio',
  Quantile50 = 'Quantile50',
  StdDev = 'StdDev',
  TotalCount = 'TotalCount',
  UniqueCount = 'UniqueCount',
  Unknown = 'Unknown',
}

/**
 * What entity the event is targeting
 * (i.e. what was the monitor monitoring when it produced the event)
 */
export enum EventTargetType {
  Dataset = 'Dataset',
  Feature = 'Feature',
  Unknown = 'Unknown',
}

export enum EventType {
  DataType = 'DataType',
  Distribution = 'Distribution',
  MissingRecentData = 'MissingRecentData',
  MissingRecentProfiles = 'MissingRecentProfiles',
  NullFraction = 'NullFraction',
  ThresholdBased = 'ThresholdBased',
  Uniqueness = 'Uniqueness',
  Unknown = 'Unknown',
}

export enum ValueSource {
  Default = 'Default',
  Learned = 'Learned',
  Unknown = 'Unknown',
  User = 'User',
}

export type BaseEventExplanation = {
  __typename?: 'BaseEventExplanation';
  /** Contains JSON body of the explanation that we couldn't parse, if any. */
  jsonBody?: Maybe<Scalars['String']['output']>;
};

export type EventParam = {
  __typename?: 'EventParam';
  source: ValueSource;
  value: Scalars['Float']['output'];
};

export type ThresholdEventExplanation = {
  __typename?: 'ThresholdEventExplanation';
  /** @deprecated Duplicate of event type, do not use */
  eventName: Scalars['String']['output'];
  /** @deprecated Not human interpretable, do not surface in UI */
  expectedValue: Scalars['Float']['output'];
  maxThreshold?: Maybe<EventParam>;
  /** @deprecated Messages will not be populated on the backend going forward. Human-friendly alert descriptions can be generated and localized in the front end. */
  message: Scalars['String']['output'];
  minThreshold?: Maybe<EventParam>;
  observedValue: Scalars['Float']['output'];
};

export type DataTypeEventExplanation = {
  __typename?: 'DataTypeEventExplanation';
  /** @deprecated Duplicate of event type, do not use */
  eventName: Scalars['String']['output'];
  /** @deprecated Messages will not be populated on the backend going forward. Human-friendly alert descriptions can be generated and localized in the front end. */
  message: Scalars['String']['output'];
  previousValue: FeatureType;
  value: FeatureType;
};

export type EventExplanation = BaseEventExplanation | DataTypeEventExplanation | ThresholdEventExplanation;

export type DataQualityEvent = {
  algorithm: Algorithm;
  /** @deprecated Field no longer supported */
  archetype: EventArchetype;
  category: AlertCategory;
  creationTimestamp: Scalars['Float']['output'];
  datasetId: Scalars['String']['output'];
  datasetTimestamp: Scalars['Float']['output'];
  explanation: EventExplanation;
  feature: Scalars['String']['output'];
  id: Scalars['String']['output'];
  /** If the event is an Alert, this flag determines whether it was designated as a False Alarm by a user. */
  isFalseAlarm?: Maybe<Scalars['Boolean']['output']>;
  metric: WhyLogsMetric;
  runId?: Maybe<Scalars['String']['output']>;
  /** @deprecated Segments have no name, use tags instead */
  segment?: Maybe<Scalars['String']['output']>;
  sessionId?: Maybe<Scalars['String']['output']>;
  /** @deprecated Currently not a human-interpretable parameter, do not expose in UI */
  severity: Scalars['Float']['output'];
  tags?: Maybe<Array<SegmentTag>>;
  target: EventTargetType;
  /** @deprecated This field refers to datasetTimestamp. Please use either creationTimestamp or datasetTimestamp explicitly. */
  timestamp: Scalars['Float']['output'];
  /** @deprecated Field no longer supported */
  type: EventType;
};

export type FrequentItem = {
  __typename?: 'FrequentItem';
  estimate?: Maybe<Scalars['Float']['output']>;
  lower?: Maybe<Scalars['Float']['output']>;
  upper?: Maybe<Scalars['Float']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type Histogram = {
  __typename?: 'Histogram';
  bins: Array<Scalars['Float']['output']>;
  counts: Array<Scalars['Float']['output']>;
};

export type Quantile = {
  __typename?: 'Quantile';
  bins: Array<Scalars['Float']['output']>;
  counts: Array<Scalars['Float']['output']>;
};

export type NumberSummary = {
  __typename?: 'NumberSummary';
  count?: Maybe<Scalars['Float']['output']>;
  histogram?: Maybe<Histogram>;
  isDiscrete?: Maybe<Scalars['Boolean']['output']>;
  max?: Maybe<Scalars['Float']['output']>;
  mean?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  quantiles: Quantile;
  stddev?: Maybe<Scalars['Float']['output']>;
};

export type TypeInference = {
  __typename?: 'TypeInference';
  count: Scalars['Float']['output'];
  ratio: Scalars['Float']['output'];
  type: FeatureType;
};

export type TypeSummary = {
  __typename?: 'TypeSummary';
  count?: Maybe<Scalars['Float']['output']>;
  type?: Maybe<FeatureType>;
};

export type SchemaSummary = {
  __typename?: 'SchemaSummary';
  inference?: Maybe<TypeInference>;
  typeCounts: Array<TypeSummary>;
};

export type UniqueCountSummary = {
  __typename?: 'UniqueCountSummary';
  estimate?: Maybe<Scalars['Float']['output']>;
  lower?: Maybe<Scalars['Float']['output']>;
  upper?: Maybe<Scalars['Float']['output']>;
};

export type StringSummary = {
  __typename?: 'StringSummary';
  frequentItems: Array<FrequentItem>;
  stringLength?: Maybe<NumberSummary>;
  tokenCount?: Maybe<NumberSummary>;
  uniqueCount?: Maybe<UniqueCountSummary>;
};

export type FeatureSketch = {
  __typename?: 'FeatureSketch';
  booleanCount: Scalars['Float']['output'];
  /** @deprecated Confusing name - use datasetTimestamp instead */
  createdAt: Scalars['Float']['output'];
  datasetTimestamp?: Maybe<Scalars['Float']['output']>;
  featureName: Scalars['String']['output'];
  fractionCount: Scalars['Float']['output'];
  frequentItems: Array<FrequentItem>;
  id: Scalars['String']['output'];
  integerCount: Scalars['Float']['output'];
  lastUploadTimestamp?: Maybe<Scalars['Float']['output']>;
  nullCount: Scalars['Float']['output'];
  nullRatio: Scalars['Float']['output'];
  numberSummary?: Maybe<NumberSummary>;
  schemaSummary?: Maybe<SchemaSummary>;
  showAsDiscrete: Scalars['Boolean']['output'];
  stringSummary?: Maybe<StringSummary>;
  totalCount: Scalars['Float']['output'];
  /** @deprecated No longer supported in whylogs v1 */
  trueCount: Scalars['Float']['output'];
  uniqueCount?: Maybe<UniqueCountSummary>;
  uniqueRatio?: Maybe<Scalars['Float']['output']>;
};

export type FeatureSchema = {
  __typename?: 'FeatureSchema';
  description?: Maybe<Scalars['String']['output']>;
  inferredType: FeatureType;
  isDiscrete: Scalars['Boolean']['output'];
  tags?: Maybe<Array<Scalars['String']['output']>>;
};

export type FeatureWeight = {
  __typename?: 'FeatureWeight';
  /** Feature's rank by weight, if known. */
  rank?: Maybe<Scalars['Int']['output']>;
  /** Current feature weight, if provided. */
  value?: Maybe<Scalars['Float']['output']>;
};

export type Feature = {
  __typename?: 'Feature';
  /** @deprecated Use alertCountsV2 instead */
  alertCounts?: Maybe<AlertCount>;
  /** @deprecated Use anomalyCounts instead - same query, but clearer naming. */
  alertCountsV2?: Maybe<AlertCategoryCounts>;
  /** @deprecated This query serves Monitor V2 data. Use 'anomalies' query instead */
  alerts: Array<DataQualityEvent>;
  /**
   * Returns analysis results, filtered by the specified filter and scoped to the specific dataset and feature.
   * Note: supplied dataset/tags and feature filters are ignored
   */
  analysisResults?: Maybe<Array<AnalysisResult>>;
  /**
   * Returns analysis results that are anomalous, filtered by the specified filter and scoped to the specific dataset and feature.
   * Note: supplied dataset/tags, anomaliesOnly, and feature filters are ignored
   */
  anomalies?: Maybe<Array<AnalysisResult>>;
  /** Alias for alertCountsV2 */
  anomalyCounts?: Maybe<AlertCategoryCounts>;
  /** @deprecated To get schema information for a feature, please use the new `schema` field. The baseline sketch may not return all fields specified on the FeatureSketch type. */
  baselineSketch?: Maybe<FeatureSketch>;
  /** @deprecated This query serves Monitor V2 data. Use 'analysisResults' query instead */
  events: Array<DataQualityEvent>;
  id: Scalars['String']['output'];
  /** @deprecated This query serves Monitor V2 data. Use 'latestAnomaly' query instead */
  latestAlert?: Maybe<DataQualityEvent>;
  /** @deprecated No longer supported. Use 'latestAnomalyTimestamp' instead */
  latestAnomaly?: Maybe<AnalysisResult>;
  /** Returns the timestamp of the latest anomaly, if one exists */
  latestAnomalyTimestamp?: Maybe<Scalars['Float']['output']>;
  modelId: Scalars['String']['output'];
  modelName: Scalars['String']['output'];
  modelTimePeriod: TimePeriod;
  name: Scalars['String']['output'];
  /** Returns schema information for the feature (type, discreteness, etc) */
  schema?: Maybe<FeatureSchema>;
  /**
   * Returns dataset profiles/sketches associated with the feature.
   *
   * Set histogramSplitPoints to specify the desired histogram bin edges.
   * NOTE: min and max will be added automatically at query time, because they depend on the profile for which the histogram will be generated. These split points should not include min/max.
   * E.g., if you'd like to split data into bins with edges [min, 5, 10, max], set this argument to [5, 10]
   */
  sketches: Array<FeatureSketch>;
  tags: Array<SegmentTag>;
  /** Metadata about the feature's weight/importance. */
  weight?: Maybe<FeatureWeight>;
};

export enum AssetCategory {
  Data = 'DATA',
  Llm = 'LLM',
  Model = 'MODEL',
}

export type CalibrationCurve = {
  __typename?: 'CalibrationCurve';
  values: Array<Array<Maybe<Scalars['Float']['output']>>>;
};

export type ConfusionMatrix = {
  __typename?: 'ConfusionMatrix';
  counts: Array<Array<Scalars['Float']['output']>>;
  labels: Array<Scalars['String']['output']>;
  predictionsField?: Maybe<Scalars['String']['output']>;
  scoreField?: Maybe<Scalars['String']['output']>;
  targetField?: Maybe<Scalars['String']['output']>;
};

export type Roc = {
  __typename?: 'ROC';
  values: Array<Array<Scalars['Float']['output']>>;
};

export type ReferenceProfile = {
  __typename?: 'ReferenceProfile';
  /** Human-readable name for the profile */
  alias: Scalars['String']['output'];
  /** Dataset ID with which it is associated */
  datasetId: Scalars['String']['output'];
  /**
   * Timestamp of the associated data
   * Might be different from actual data timestamp due to these profiles being indexed a little differently in Druid
   */
  datasetTimestamp?: Maybe<Scalars['Float']['output']>;
  /** Reference profile's unique ID */
  id: Scalars['String']['output'];
  /** Model metrics associated with the profile */
  metrics?: Maybe<ModelMetrics>;
  /** Feature sketches associated with the reference profile */
  sketches?: Maybe<FilteredFeatureSketches>;
  /** Segment tags */
  tags?: Maybe<Array<SegmentTag>>;
  /** When the profile was uploaded */
  uploadTimestamp?: Maybe<Scalars['Float']['output']>;
};

export type ModelMetrics = {
  __typename?: 'ModelMetrics';
  calibration?: Maybe<CalibrationCurve>;
  confusion?: Maybe<ConfusionMatrix>;
  fprTpr?: Maybe<Roc>;
  recallPrecision?: Maybe<Roc>;
};

export type FilteredFeatureSketches = {
  __typename?: 'FilteredFeatureSketches';
  results: Array<FeatureSketch>;
  totalCount: Scalars['Float']['output'];
  totalDiscrete: Scalars['Float']['output'];
  totalNonDiscrete: Scalars['Float']['output'];
};

export type BatchMetadata = {
  __typename?: 'BatchMetadata';
  batchFrequency: TimePeriod;
  datasetId: Scalars['String']['output'];
  /** endTimestamp is only available when getting batches by timestamp */
  endTimestamp?: Maybe<Scalars['Float']['output']>;
  inputCount: Scalars['Float']['output'];
  /**
   * Returns model metrics associated with a particular batch of data.
   * Only applicable to ML models.
   */
  metrics: ModelMetrics;
  outputCount: Scalars['Float']['output'];
  /**
   * Gets all the FeatureSketches associated with the given Batch.
   * May be horribly inefficient when the number of batches is large, as it looks up sketches by timestamp match rather than a time range at the moment.
   * Avoid queries like `model > batches(from: 123, to: 123) > sketches` until this flow is optimized. `model > batch(timestamp: 123) > sketches` is ok.
   *
   * Set histogramSplitPoints to specify the desired histogram bin edges.
   * NOTE: min and max will be added automatically at query time, because they depend on the profile for which the histogram will be generated. These split points should not include min/max.
   * E.g., if you'd like to split data into bins with edges [min, 5, 10, max], set this argument to [5, 10]
   */
  sketches: FilteredFeatureSketches;
  tags: Array<SegmentTag>;
  timestamp: Scalars['Float']['output'];
};

export type DistributionValue = {
  __typename?: 'DistributionValue';
  frequentItems?: Maybe<Array<FrequentItem>>;
  lastUploadTimestamp?: Maybe<Scalars['Float']['output']>;
  numberSummary?: Maybe<NumberSummary>;
  timestamp: Scalars['Float']['output'];
};

/** Value of a single value metric at a given point in time */
export type MetricValue = {
  __typename?: 'MetricValue';
  lastUploadTimestamp?: Maybe<Scalars['Float']['output']>;
  timestamp: Scalars['Float']['output'];
  value: Scalars['Float']['output'];
};

export type CustomMetric = {
  __typename?: 'CustomMetric';
  datasetGranularity: TimePeriod;
  datasetId: Scalars['String']['output'];
  /** Distribution values of this metric, over time */
  distributionValues?: Maybe<Array<DistributionValue>>;
  distributionValuesForBatch?: Maybe<Array<DistributionValue>>;
  id: Scalars['String']['output'];
  metadata?: Maybe<MetricSchema>;
  /** Name of the metric */
  name: Scalars['String']['output'];
  /** Numeric values of this metric, over time */
  numericValues?: Maybe<Array<MetricValue>>;
  numericValuesForBatch?: Maybe<Array<MetricValue>>;
  segmentTags: Array<SegmentTag>;
};

export type DataLineage = {
  __typename?: 'DataLineage';
  latestProfileTimestamp?: Maybe<Scalars['Float']['output']>;
  oldestProfileTimestamp?: Maybe<Scalars['Float']['output']>;
};

export type Metric = {
  __typename?: 'Metric';
  datasetGranularity: TimePeriod;
  datasetId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  metadata?: Maybe<MetricSchema>;
  /** Name of the metric */
  name: Scalars['String']['output'];
  segmentTags: Array<SegmentTag>;
  /** Values of this metric, over time */
  values: Array<MetricValue>;
};

export type EntityColumnSchema = {
  __typename?: 'EntityColumnSchema';
  description?: Maybe<Scalars['String']['output']>;
  inferredType: FeatureType;
  isDiscrete: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  tags?: Maybe<Array<Scalars['String']['output']>>;
};

export type EntitySchemaColumnCounts = {
  __typename?: 'EntitySchemaColumnCounts';
  discrete: Scalars['Int']['output'];
  nonDiscrete: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type EntitySchema = {
  __typename?: 'EntitySchema';
  /** Schema for all columns */
  columns?: Maybe<Array<EntityColumnSchema>>;
  /** Whether the dataset has columns */
  hasColumns: Scalars['Boolean']['output'];
  /** Whether the dataset has inputs */
  hasInputs: Scalars['Boolean']['output'];
  /** Whether the dataset has outputs */
  hasOutputs: Scalars['Boolean']['output'];
  /** Counts for input columns */
  inputCounts: EntitySchemaColumnCounts;
  /** Schema for inputs */
  inputs?: Maybe<Array<EntityColumnSchema>>;
  /** Counts for output columns */
  outputCounts: EntitySchemaColumnCounts;
  /** Schema for outputs */
  outputs?: Maybe<Array<EntityColumnSchema>>;
};

export type FeatureCounts = {
  __typename?: 'FeatureCounts';
  discrete: Scalars['Int']['output'];
  nonDiscrete: Scalars['Int']['output'];
};

export type FilteredFeatures = {
  __typename?: 'FilteredFeatures';
  results: Array<Feature>;
  totalCount: Scalars['Float']['output'];
};

export type IndividualProfileItem = {
  __typename?: 'IndividualProfileItem';
  /** Dataset ID with which it is associated */
  datasetId: Scalars['String']['output'];
  /** Timestamp of the associated data */
  datasetTimestamp?: Maybe<Scalars['Float']['output']>;
  /** Individual profile's unique WhyLabs ID */
  retrievalToken: Scalars['String']['output'];
  /** Individual profile's trace ID */
  traceId?: Maybe<Scalars['String']['output']>;
};

export type IndividualProfile = {
  __typename?: 'IndividualProfile';
  /** Dataset ID with which it is associated */
  datasetId: Scalars['String']['output'];
  /** Individual profile's unique WhyLabs ID */
  retrievalToken: Scalars['String']['output'];
  /** Feature sketches associated with the individual profile */
  sketches?: Maybe<FilteredFeatureSketches>;
  /** Segment tags */
  tags?: Maybe<Array<SegmentTag>>;
};

export type InsightMetricResult = {
  __typename?: 'InsightMetricResult';
  counts_null?: Maybe<Scalars['Int']['output']>;
  counts_total?: Maybe<Scalars['Int']['output']>;
  max_value?: Maybe<Scalars['Float']['output']>;
  mean?: Maybe<Scalars['Float']['output']>;
  min_value?: Maybe<Scalars['Float']['output']>;
  most_freq_estimate?: Maybe<Scalars['Int']['output']>;
  most_freq_value?: Maybe<Scalars['String']['output']>;
  types_boolean?: Maybe<Scalars['Int']['output']>;
  types_fractional?: Maybe<Scalars['Int']['output']>;
  types_integral?: Maybe<Scalars['Int']['output']>;
  types_object?: Maybe<Scalars['Int']['output']>;
  types_tensor?: Maybe<Scalars['Int']['output']>;
  uniqueness?: Maybe<Scalars['Float']['output']>;
};

export type InsightEntry = {
  __typename?: 'InsightEntry';
  column: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  metrics: InsightMetricResult;
  name: Scalars['String']['output'];
};

export type CustomTag = {
  __typename?: 'CustomTag';
  backgroundColor?: Maybe<Scalars['String']['output']>;
  color?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Dataset = {
  /** @deprecated Use anomalyCounts instead - same query, but clearer naming. */
  alertCountsV2?: Maybe<AlertCategoryCounts>;
  /** @deprecated This query serves Monitor V2 data. Use 'anomalies' query instead */
  alerts: Array<DataQualityEvent>;
  /**
   * Returns analysis results, filtered by the specified filter and scoped to the specific dataset.
   * Note: supplied dataset/tags filters are ignored
   */
  analysisResults?: Maybe<Array<AnalysisResult>>;
  /**
   * Returns analysis results that are anomalous, filtered by the specified filter and scoped to the specific dataset.
   * Note: supplied dataset/tags and anomaliesOnly filters are ignored
   */
  anomalies?: Maybe<Array<AnalysisResult>>;
  /**
   * Alias for alertCountsV2
   * Returns aggregated anomaly counts over time and broken down by category, for the overall dataset.
   * Much more efficient than fetching anomaly objects directly, because aggregation happens in Druid.
   */
  anomalyCounts?: Maybe<AlertCategoryCounts>;
  assetCategory?: Maybe<AssetCategory>;
  batch?: Maybe<BatchMetadata>;
  batchDateRanges: Array<DateRange>;
  batchFrequency: TimePeriod;
  batches: Array<BatchMetadata>;
  /** Constraints list (analyzers json string config) for this dataset */
  constraintsList?: Maybe<Array<Scalars['String']['output']>>;
  creationTime?: Maybe<Scalars['Float']['output']>;
  customMetrics?: Maybe<Array<CustomMetric>>;
  /** Information about data availability for this dataset */
  dataAvailability?: Maybe<DataAvailability>;
  /** Date range of data lineage for this dataset with start and end timestamps fitting the batch bucket */
  dataLineage?: Maybe<DataLineage>;
  datasetId: Scalars['String']['output'];
  datasetMetric?: Maybe<Metric>;
  datasetMetrics?: Maybe<Array<Metric>>;
  /** Information about entity schema for this dataset */
  entitySchema?: Maybe<EntitySchema>;
  /** @deprecated This query serves Monitor V2 data. Use 'analysisResults' query instead */
  events: Array<DataQualityEvent>;
  feature?: Maybe<Feature>;
  featureCounts?: Maybe<FeatureCounts>;
  /** @deprecated This query returns ALL features in a dataset, which can be thousands. Please use 'filteredFeatures' query instead. */
  features: Array<Feature>;
  filteredFeatures: FilteredFeatures;
  filteredOutputs: FilteredFeatures;
  id: Scalars['String']['output'];
  /** Individual profiles that have been uploaded for this dataset */
  individualProfileList?: Maybe<Array<IndividualProfileItem>>;
  /** Individual profiles that have been uploaded for this dataset */
  individualProfiles?: Maybe<Array<IndividualProfile>>;
  /** Profile insights for this dataset */
  insights?: Maybe<Array<InsightEntry>>;
  /** @deprecated This query serves Monitor V2 data. Use 'latestAnomaly' query instead */
  latestAlert?: Maybe<DataQualityEvent>;
  /** @deprecated No longer supported. Use 'latestAnomalyTimestamp' instead */
  latestAnomaly?: Maybe<AnalysisResult>;
  /** Returns the timestamp of the latest anomaly, if one exists */
  latestAnomalyTimestamp?: Maybe<Scalars['Float']['output']>;
  modelType: 'LLM';
  name: Scalars['String']['output'];
  output?: Maybe<Feature>;
  outputs: Array<Feature>;
  /** Available reference profiles that have been uploaded for this dataset */
  referenceProfiles?: Maybe<Array<ReferenceProfile>>;
  resourceTags: Array<CustomTag>;
  tags: Array<SegmentTag>;
};

export type AuditLog = {
  __typename?: 'AuditLog';
  datasetId: Scalars['String']['output'];
  datasetName: Scalars['String']['output'];
  diff: Scalars['String']['output'];
  feature?: Maybe<Scalars['String']['output']>;
  organizationId: Scalars['String']['output'];
  organizationName: Scalars['String']['output'];
  resource: Scalars['String']['output'];
  segmentTags?: Maybe<Array<SegmentTag>>;
  timestamp: Scalars['Float']['output'];
  userId: Scalars['String']['output'];
  userName: Scalars['String']['output'];
};

/** Information about the weights that were uploaded for the given model */
export type ModelWeightMetadata = {
  __typename?: 'ModelWeightMetadata';
  /** Returns true if any weights have been uploaded for this dataset (in any segment). */
  hasWeights: Scalars['Boolean']['output'];
  /** Timestamp in UTC millis of when the weights were last updated */
  lastUpdatedAt?: Maybe<Scalars['Float']['output']>;
};

export type LlmTraces = {
  __typename?: 'LLMTraces';
  /** Returns the total of blocked interactions in range */
  blockedInteractionsCount: Scalars['Float']['output'];
  /** Returns if the model has traces, checking the last 10 years from now independently of passed range */
  hasTraces: Scalars['Boolean']['output'];
  /** Last trace uploaded timestamp */
  latestTraceTimestamp?: Maybe<Scalars['Float']['output']>;
  /** Returns the total of traces in range */
  totalCount: Scalars['Float']['output'];
  /** Returns the total of policy violations in range */
  violationsCount: Scalars['Float']['output'];
};

export type Segment = Dataset & {
  __typename?: 'Segment';
  /** @deprecated Use anomalyCounts instead - same query, but clearer naming. */
  alertCountsV2?: Maybe<AlertCategoryCounts>;
  /** @deprecated This query serves Monitor V2 data. Use 'anomalies' query instead */
  alerts: Array<DataQualityEvent>;
  /**
   * Returns analysis results, filtered by the specified filter and scoped to the specific dataset.
   * Note: supplied dataset/tags filters are ignored
   */
  analysisResults?: Maybe<Array<AnalysisResult>>;
  /**
   * Returns analysis results that are anomalous, filtered by the specified filter and scoped to the specific dataset.
   * Note: supplied dataset/tags and anomaliesOnly filters are ignored
   */
  anomalies?: Maybe<Array<AnalysisResult>>;
  /**
   * Alias for alertCountsV2
   * Returns aggregated anomaly counts over time and broken down by category for the segment.
   * Much more efficient than fetching anomaly objects directly, because aggregation happens in Druid.
   */
  anomalyCounts?: Maybe<AlertCategoryCounts>;
  assetCategory?: Maybe<AssetCategory>;
  batch?: Maybe<BatchMetadata>;
  batchDateRanges: Array<DateRange>;
  batchFrequency: TimePeriod;
  /**
   * Fetches the dataset-level metadata by time range or from the specified timestamps.
   * If the `timestamps` argument is passed, it will be prioritized over the `from/to` args.
   * We probably shouldn't pass more than a couple timestamps at a time. For large queries, use a time range :)
   */
  batches: Array<BatchMetadata>;
  /** Constraints list (analyzers json string config) for this dataset */
  constraintsList?: Maybe<Array<Scalars['String']['output']>>;
  creationTime?: Maybe<Scalars['Float']['output']>;
  customMetrics?: Maybe<Array<CustomMetric>>;
  /** Information about data availability for this dataset */
  dataAvailability?: Maybe<DataAvailability>;
  /** Date range of data lineage for this dataset with start and end timestamps fitting the batch bucket */
  dataLineage?: Maybe<DataLineage>;
  datasetId: Scalars['String']['output'];
  datasetMetric?: Maybe<Metric>;
  datasetMetrics?: Maybe<Array<Metric>>;
  /** Information about entity schema for this dataset */
  entitySchema?: Maybe<EntitySchema>;
  /** @deprecated This query serves Monitor V2 data. Use 'analysisResults' query instead */
  events: Array<DataQualityEvent>;
  feature?: Maybe<Feature>;
  featureCounts?: Maybe<FeatureCounts>;
  /** @deprecated This query returns ALL features in a dataset, which can be thousands. Please use 'filteredFeatures' query instead. */
  features: Array<Feature>;
  filteredFeatures: FilteredFeatures;
  filteredOutputs: FilteredFeatures;
  id: Scalars['String']['output'];
  /** Individual profiles that have been uploaded for this dataset */
  individualProfileList?: Maybe<Array<IndividualProfileItem>>;
  /** Individual profiles that have been uploaded for this dataset */
  individualProfiles?: Maybe<Array<IndividualProfile>>;
  /** Profile insights for this model */
  insights?: Maybe<Array<InsightEntry>>;
  /** @deprecated This query serves Monitor V2 data. Use 'latestAnomaly' query instead */
  latestAlert?: Maybe<DataQualityEvent>;
  /** @deprecated No longer supported. Use 'latestAnomalyTimestamp' instead */
  latestAnomaly?: Maybe<AnalysisResult>;
  /** Returns the timestamp of the latest anomaly, if one exists */
  latestAnomalyTimestamp?: Maybe<Scalars['Float']['output']>;
  modelId: Scalars['String']['output'];
  modelName: Scalars['String']['output'];
  modelType: 'LLM';
  /** @deprecated Segments don't have names, use tags instead */
  name: Scalars['String']['output'];
  output?: Maybe<Feature>;
  outputs: Array<Feature>;
  /** Available reference profiles that have been uploaded for this dataset */
  referenceProfiles?: Maybe<Array<ReferenceProfile>>;
  resourceTags: Array<CustomTag>;
  tags: Array<SegmentTag>;
};

export type Model = Dataset & {
  __typename?: 'Model';
  /** @deprecated Use anomalyCounts instead - same query, but clearer naming. */
  alertCountsV2?: Maybe<AlertCategoryCounts>;
  /** @deprecated This query serves Monitor V2 data. Use 'anomalies' query instead */
  alerts: Array<DataQualityEvent>;
  /** Returns aggregated anomaly counts over time and broken down by category, for all segments and the overall dataset. */
  allAnomalyCounts?: Maybe<AlertCategoryCounts>;
  /**
   * Returns analysis results, filtered by the specified filter and scoped to the specific dataset.
   * Note: supplied dataset/tags filters are ignored
   */
  analysisResults?: Maybe<Array<AnalysisResult>>;
  /**
   * Returns analysis results that are anomalous, filtered by the specified filter and scoped to the specific dataset.
   * Note: supplied dataset/tags and anomaliesOnly filters are ignored
   */
  anomalies?: Maybe<Array<AnalysisResult>>;
  /**
   * Alias for alertCountsV2
   * Returns aggregated anomaly counts over time and broken down by category.
   * Much more efficient than fetching anomaly objects directly, because aggregation happens in Druid.
   */
  anomalyCounts?: Maybe<AlertCategoryCounts>;
  assetCategory?: Maybe<AssetCategory>;
  batch?: Maybe<BatchMetadata>;
  batchDateRanges: Array<DateRange>;
  batchFrequency: TimePeriod;
  /**
   * Fetches the dataset-level metadata by time range or from the specified timestamps.
   * If the `timestamps` argument is passed, it will be prioritized over the `from/to` args.
   * We probably shouldn't pass more than a couple timestamps at a time. For large queries, use a time range :)
   */
  batches: Array<BatchMetadata>;
  /** Constraints list (analyzers json string config) for this dataset */
  constraintsList?: Maybe<Array<Scalars['String']['output']>>;
  creationTime?: Maybe<Scalars['Float']['output']>;
  customMetrics?: Maybe<Array<CustomMetric>>;
  /** Information about data availability for this dataset */
  dataAvailability?: Maybe<DataAvailability>;
  /** Date range of data lineage for this dataset with start and end timestamps fitting the batch bucket */
  dataLineage?: Maybe<DataLineage>;
  datasetId: Scalars['String']['output'];
  datasetMetric?: Maybe<Metric>;
  datasetMetrics?: Maybe<Array<Metric>>;
  /** Information about entity schema for this dataset */
  entitySchema?: Maybe<EntitySchema>;
  /** @deprecated This query serves Monitor V2 data. Use 'analysisResults' query instead */
  events: Array<DataQualityEvent>;
  feature?: Maybe<Feature>;
  /** @deprecated Use entitySchema */
  featureCounts?: Maybe<FeatureCounts>;
  /** @deprecated This query returns ALL features in a dataset, which can be thousands. Please use 'filteredFeatures' query instead. */
  features: Array<Feature>;
  filteredFeatures: FilteredFeatures;
  filteredOutputs: FilteredFeatures;
  /**
   * Returns true if any weights have been uploaded for this dataset (in any segment).
   * @deprecated use model > weightMetadata > hasWeights instead
   */
  hasWeights?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['String']['output'];
  /** Individual profiles that have been uploaded for this dataset */
  individualProfileList?: Maybe<Array<IndividualProfileItem>>;
  /** Individual profiles that have been uploaded for this dataset */
  individualProfiles?: Maybe<Array<IndividualProfile>>;
  /** Profile insights for this model */
  insights?: Maybe<Array<InsightEntry>>;
  /** @deprecated This query serves Monitor V2 data. Use 'latestAnomaly' query instead */
  latestAlert?: Maybe<DataQualityEvent>;
  /** @deprecated No longer supported. Use 'latestAnomalyTimestamp' instead */
  latestAnomaly?: Maybe<AnalysisResult>;
  /** Returns the timestamp of the latest anomaly, if one exists */
  latestAnomalyTimestamp?: Maybe<Scalars['Float']['output']>;
  modelType: 'LLM';
  /** @deprecated These are Monitor V2 audit logs. These don't work with MV3. */
  monitorConfigAuditLogs: Array<AuditLog>;
  /** Monitor coverage information for the given dataset */
  monitoredCategories?: Maybe<Array<AlertCategory>>;
  name: Scalars['String']['output'];
  output?: Maybe<Feature>;
  outputs: Array<Feature>;
  /** Available reference profiles that have been uploaded for this dataset */
  referenceProfiles?: Maybe<Array<ReferenceProfile>>;
  resourceTags: Array<CustomTag>;
  segment?: Maybe<Segment>;
  segments: Array<Segment>;
  tags: Array<SegmentTag>;
  /** @deprecated Use entitySchema */
  totalFeatures: Scalars['Int']['output'];
  totalFilteredSegments: Scalars['Int']['output'];
  totalSegments: Scalars['Int']['output'];
  /** Data used in the LLM Secure summary card */
  tracesSummary?: Maybe<LlmTraces>;
  weightMetadata?: Maybe<ModelWeightMetadata>;
};

export type LimitSpec = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sortDirection?: InputMaybe<SortDirection>;
};

export type TraceDataRangeRequest = {
  resourceId?: string;
};

export type TraceDataRangeResponse = {
  resourceId: string;
  hasTraceData: boolean;
  minStartTime: number;
  maxStartTime: number;
};

export type TraceDetailRequest = {
  resourceId?: string;
  traceId?: string;
  asc?: boolean;
};

export type TraceDetailResponse = {
  id: string;
  resourceAttributes: string;
  startTime: string;
  endTime: string;
  latency: number;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
  tags: Array<string>;
  entries: Array<string>;
};

export enum Condition {
  And = 'and',
  Or = 'or',
}

export type TraceListFilter = {
  tags?: Array<string> | null;
  tagCondition?: Condition | null;
  excludeTags?: Array<string> | null;
  minPolicyIssues?: number | null;
  maxPolicyIssues?: number | null;
  minTotalTokens?: number | null;
  maxTotalTokens?: number | null;
  minLatencyMillis?: number | null;
  maxLatencyMillis?: number | null;
  onlyActions?: boolean | null;
  traceIds?: Array<string> | null;
  excludeIds?: Array<string> | null;
  traceIdSubstring?: string | null;
  searchTerm?: string | null;
  serviceName?: string | null;
};

export enum TracesSortBy {
  Timestamp = 'timestamp',
  Traceid = 'traceid',
  Issues = 'issues',
  Applicationid = 'applicationid',
  Latency = 'latency',
  Tokens = 'tokens',
  Version = 'version',
}

export type TraceListRequest = {
  resourceId?: string;
  interval: string;
  filter: TraceListFilter;
  offset: number;
  limit: number;
  asc?: boolean;
  sortCondition: TracesSortBy;
};

export type TraceQueryRequestKeyValuePair = {
  key: string;
  value: string;
};

export type TraceQueryRequestFilter = {
  tags?: Array<string> | null;
  tagCondition?: Condition | null;
  excludeTags?: Array<string> | null;
  serviceName?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  parentId?: string | null;
};

export type TraceQueryRequest = {
  resourceId?: string;
  interval: string;
  filter: TraceQueryRequestFilter;
  resourceAttributeFilters?: Array<TraceQueryRequestKeyValuePair> | null;
  attributeFilters?: Array<TraceQueryRequestKeyValuePair> | null;
  offset: number;
  limit: number;
  asc?: boolean;
};

export type TraceQueryResponse = {
  entries: Array<string>;
  nextOffset: number;
  partial: boolean;
  total: number;
};

export enum Granularity {
  Individual = 'individual',
  Pt15M = 'PT15M',
  Hourly = 'hourly',
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
}

export enum DataGranularity {
  Individual = 'individual',
  Pt15M = 'PT15M',
  Hourly = 'hourly',
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  All = 'all',
}

export type TraceSummaryRequest = {
  resourceId?: string;
  interval: string;
  granularity: Granularity;
};

export type TraceSummaryResponse = {
  entries: Array<string>;
};

export type TraceDataRangeEntry = {
  resourceId: string;
  minStartTime: number;
  maxStartTime: number;
};
