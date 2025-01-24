import {
  changeTypeOptions,
  DataDriftOption,
  DiscreteTypeOption,
  isDriftConfig,
  MetricTypeInUse,
  MonitorBaselineOption,
  monitorBaselineOptions,
  TrailingWindowOption,
  useCaseOptions,
} from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';
import {
  Analyzer,
  ColumnMatrix,
  ComparisonConfig,
  DatasetMatrix,
  DiffConfig,
  DiffMode,
  DriftConfig,
  FixedThresholdsConfig,
  ReferenceProfileId,
  StddevConfig,
  TimeRange,
  TimeRangeBaseline,
  TrailingWindowBaseline,
} from 'generated/monitor-schema';
import { FeatureSelection } from 'components/panels/monitoring/monitor-manager/custom-monitor/phase-cards/analysis/data-drift/FeatureTypeSelectCard/featureOptions';
import { CustomMonitorState, DateTimeRange, getAnalyzerMetric, SegmentItem } from './monitorUtils';
import { AnalyzerDiscretenessTag, AnalyzerSelectionTag } from './analyzerTags';

type GetBaselineObjParams = {
  usedBaseline: MonitorBaselineOption;
  baselineWindowSize?: TrailingWindowOption;
  baselineProfileId?: string;
  baselineRange: DateTimeRange;
};
type GetBaselineObj = TrailingWindowBaseline | ReferenceProfileId | TimeRangeBaseline | undefined;
export const getBaselineObj = ({
  usedBaseline,
  baselineRange,
  baselineProfileId = '',
  baselineWindowSize,
}: GetBaselineObjParams): GetBaselineObj => {
  switch (usedBaseline) {
    case monitorBaselineOptions[0].value:
      return { type: usedBaseline, size: Number(baselineWindowSize) };
    case monitorBaselineOptions[1].value:
      return { type: usedBaseline, profileId: baselineProfileId };
    case monitorBaselineOptions[2].value:
    default: {
      const { start, end } = baselineRange;
      const startString = new Date(start).toISOString();
      const endString = new Date(end).toISOString();
      const newRange: TimeRange = {
        start: startString,
        end: endString,
      };
      return { type: usedBaseline, range: newRange };
    }
  }
};

export type IncludeAllType = '*' | 'group:discrete' | 'group:continuous';
export const getIncludeAllTypeFromDiscreteType = (type: DiscreteTypeOption): IncludeAllType => {
  switch (type) {
    case 'both':
      return '*';
    case 'discrete':
      return 'group:discrete';
    case 'non-discrete':
      return 'group:continuous';
    default:
      return '*';
  }
};

export const getExcludeByDriftOption = (driftOption: DataDriftOption): string[] => {
  if (driftOption === 'both') return [];
  if (driftOption === 'input') return ['group:output'];
  return ['group:input'];
};

type AnalyzerConfig = Analyzer['config'];
type GetNewAnalyzerTargetMatrixParams = {
  includedFeatures: string[];
  discreteType: DiscreteTypeOption;
  newConfig: AnalyzerConfig;
  segments: SegmentItem[];
  driftOption: DataDriftOption;
  metricMetadata: CustomMonitorState['metricMetadata'];
};
export const getNewAnalyzerTargetMatrix = ({
  includedFeatures,
  discreteType,
  newConfig,
  segments,
  driftOption,
  metricMetadata: perfMetricMetadata,
}: GetNewAnalyzerTargetMatrixParams): ColumnMatrix | DatasetMatrix => {
  const getIncludedFeatures = (): string[] => {
    return includedFeatures.length ? [...includedFeatures] : [getIncludeAllTypeFromDiscreteType(discreteType)];
  };
  if (perfMetricMetadata) {
    return {
      type: 'column',
      include: [perfMetricMetadata.queryDefinition?.column ?? getAnalyzerMetric(newConfig)],
      segments: segments.map((s) => ({ tags: s.tags })),
    };
  }
  if (
    isDriftConfig(newConfig) ||
    ['count_null', 'count_null_ratio', 'unique_est', 'unique_est_ratio', 'inferred_data_type'].includes(
      getAnalyzerMetric(newConfig),
    )
  ) {
    return {
      type: 'column',
      include: getIncludedFeatures(),
      exclude: getExcludeByDriftOption(driftOption),
      segments: segments.map((s) => ({ tags: s.tags })),
    };
  }

  return {
    type: 'dataset',
    segments: segments.map((s) => ({ tags: s.tags })),
  };
};

export const getNewAnalyzerSelectionTags = (featureSelection?: FeatureSelection): AnalyzerSelectionTag[] => {
  const tags: AnalyzerSelectionTag[] = [];
  if (featureSelection) {
    tags.push(`featureSelection:${featureSelection}`);
  }
  return tags;
};

export const getNewAnalyzerDiscretenessTags = (discreteType?: DiscreteTypeOption): AnalyzerDiscretenessTag[] => {
  const tags: AnalyzerDiscretenessTag[] = [];
  if (discreteType) {
    tags.push(`discreteness:${discreteType}`);
  }
  return tags;
};

const getMetricValue = ({ metric, metricMetadata }: Partial<CustomMonitorState>) => {
  if (!metricMetadata) return metric;
  return metricMetadata.queryDefinition?.metric ?? metric;
};

export const getNewAnalyzerConfig = ({
  usedBaseline,
  baselineRange,
  baselineProfileId,
  baselineWindowSize,
  useCase,
  metric,
  metricMetadata,
  modelPerformanceConfig,
  thresholdPct,
  thresholdAbs,
  driftThreshold,
  driftAlgorithm,
  factor,
  upper,
  lower,
}: CustomMonitorState): AnalyzerConfig => {
  const configObj: {
    metric?: MetricTypeInUse;
    type?: Analyzer['config']['type'];
    mode?: DiffMode;
    threshold?: number;
    upper?: number;
    lower?: number;
    factor?: number;
    baseline: TrailingWindowBaseline | ReferenceProfileId | TimeRangeBaseline | undefined;
    algorithm?: string;
    operator?: string;
  } = {
    baseline: getBaselineObj({ usedBaseline, baselineRange, baselineProfileId, baselineWindowSize }),
  };

  configObj.metric = getMetricValue({ metric, metricMetadata })?.toLowerCase();

  if (useCase === useCaseOptions[1].value && metric === 'inferred_data_type') {
    configObj.type = 'comparison';
    configObj.operator = 'eq';
    return configObj as ComparisonConfig;
  }
  if (useCase === useCaseOptions[2].value) {
    switch (modelPerformanceConfig) {
      case changeTypeOptions[0].label:
      case changeTypeOptions[1].label:
        configObj.type = 'diff';
        configObj.mode = modelPerformanceConfig === 'percentage change' ? 'pct' : 'abs';
        configObj.threshold = modelPerformanceConfig === 'percentage change' ? thresholdPct : thresholdAbs;
        return configObj as DiffConfig;
    }
  }
  if (useCase === useCaseOptions[1].value || useCase === useCaseOptions[2].value) {
    switch (modelPerformanceConfig) {
      case changeTypeOptions[2].label:
        configObj.type = 'fixed';
        configObj.upper = upper;
        configObj.lower = lower;
        delete configObj.baseline;
        return configObj as FixedThresholdsConfig;
      case changeTypeOptions[3].label:
        configObj.type = 'stddev';
        configObj.factor = factor;
        return configObj as StddevConfig;
    }
  }
  // if (useCase === useCaseOptions[1].value)
  configObj.type = 'drift';
  configObj.algorithm = driftAlgorithm ?? 'hellinger';
  configObj.threshold = driftThreshold;
  return configObj as DriftConfig;
};

export const getFeatureSelection = (a: Analyzer): Partial<CustomMonitorState> => {
  if (a.targetMatrix?.type === 'column' && a.targetMatrix.include) {
    const tags: string[] = a.tags ?? [];
    const hasSelection = tags.find((t) => t.includes('featureSelection:'));
    switch (hasSelection) {
      case 'featureSelection:all':
        return { featureSelection: 'all' };
      case 'featureSelection:selected':
        return { featureSelection: 'selected' };
      case 'featureSelection:top_k':
        return { featureSelection: 'top_k' };
    }
    // monitors created before this change doesn't have tags
    const includeArray = a.targetMatrix.include;
    const allSelected = ['*', 'group:'].some((group) => includeArray[0]?.includes(group));
    if (allSelected) return { featureSelection: 'all' };
    return { featureSelection: 'selected' };
  }
  return { featureSelection: undefined };
};

export const getDiscretenessSelection = (a: Analyzer): Partial<CustomMonitorState> => {
  if (a.targetMatrix?.type === 'column' && a.targetMatrix.include) {
    const tags: string[] = a.tags ?? [];
    const hasSelection = tags.find((t) => t.includes('discreteness:'));
    switch (hasSelection) {
      case 'discreteness:both':
        return { discreteType: 'both' };
      case 'discreteness:discrete':
        return { discreteType: 'discrete' };
      case 'discreteness:non-discrete':
        return { discreteType: 'non-discrete' };
    }
  }
  return {};
};
