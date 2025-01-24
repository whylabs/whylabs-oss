import {
  AnalyzerConfig,
  BaselineAnalyzerConfig,
  ChangeTypeOption,
  changeTypeOptions,
  DataDriftOption,
  dataDriftOptions,
  DataQualityOption,
  DataQualityTypeOfChange,
  DiscreteTypeOption,
  getMetricCategory,
  isDiffConfig,
  isDriftConfig,
  isFixedThresholdsConfig,
  isStddevConfig,
  MetricTypeInUse,
  MonitorBaselineOption,
  monitorBaselineOptions,
  NotificationsModeOption,
  SeverityOption,
  TrailingWindowOption,
  trailingWindowOptions,
  UseCaseOption,
} from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';
import { subMilliseconds } from 'date-fns';
import { GetIoFeaturesQuery, MetricMetadataFragment, SegmentTag, TimePeriod } from 'generated/graphql';
import { FeatureSelection } from 'components/panels/monitoring/monitor-manager/custom-monitor/phase-cards/analysis/data-drift/FeatureTypeSelectCard/featureOptions';
import { getSegmentTags } from 'pages/page-types/pageUrlQuery';
import { ONE_MONTH_IN_MILLIS } from 'ui/constants';
import {
  Analyzer,
  DatasetMetric,
  DriftConfig,
  GlobalAction,
  Granularity,
  Monitor,
  RawWebhook,
  SendEmail,
  SimpleColumnMetric,
  SlackWebhook,
  TimeRange,
} from 'generated/monitor-schema';
import { EmptyObject } from 'types/genericTypes';
import { getFunctionsForTimePeriod } from 'utils/batchProfileUtils';

export interface SegmentItem {
  id: string;
  label: string;
  tags: SegmentTag[];
}

export interface CustomMonitorState {
  monitorId: string;
  analyzerId: string;
  monitorDisplayName: string;
  // monitor schema
  granularity: Granularity;
  segments: SegmentItem[];

  // Analyzer
  useCase: UseCaseOption;
  metricMetadata?: MetricMetadataFragment; // used with perf metrics
  metric: MetricTypeInUse; // DatasetMetric;

  // based on it, ColumnMatrix -> include prop will include "group:continuous" | "group:discrete"
  discreteType: DiscreteTypeOption;
  driftOption: DataDriftOption;
  driftThreshold: number;
  driftAlgorithm?: DriftConfig['algorithm'] | string;
  featuresQueryData: GetIoFeaturesQuery | undefined;
  includedFeatures: string[];
  featureSelection?: FeatureSelection;

  modelPerformanceConfig: ChangeTypeOption;
  thresholdPct: number;
  thresholdAbs: number | undefined;
  // metric == FixedThresholdsConfig
  upper: number | undefined;
  lower: number | undefined;
  // metric == StddevConfig
  factor: number | undefined;

  usedBaseline: MonitorBaselineOption; // TrailingWindowBaseline | ReferenceProfileId | TimeRangeBaseline
  // baseline == TrailingWindowBaseline
  baselineWindowSize: TrailingWindowOption | undefined;
  // baseline == ReferenceProfileId
  baselineProfileId: string | undefined;
  // baseline == TimeRangeBaseline
  baselineRange: DateTimeRange;

  // monitor
  alertSeverity: SeverityOption;
  actions: (GlobalAction | SendEmail | SlackWebhook | RawWebhook)[];
  notificationsMode: NotificationsModeOption;
  dataQualityOption: DataQualityOption;
  dataQualityChange: DataQualityTypeOfChange;
}

export interface DateTimeRange {
  start: Date;
  end: Date;
}

type NotificationModeConfig = Monitor['mode'];
export const getNotificationsMode = (
  type: NotificationsModeOption,
  granularity: Granularity,
): NotificationModeConfig => {
  if (type === 'DIGEST') {
    return {
      type,
      datasetTimestampOffset: getDatasetTimestampOffset(granularity),
    };
  }
  return { type };
};

export const getDefaultTimeRange = (timerange?: TimeRange): DateTimeRange => {
  if (timerange && timerange.start && timerange.end) {
    const range = {
      start: new Date(timerange.start),
      end: new Date(timerange.end),
    };
    return range;
  }
  // Fallback to a month range
  const now = new Date();
  const { setStartOfProfile: startOfUtcDay, setEndOfProfile: endOfUtcDay } =
    getFunctionsForTimePeriod.get(TimePeriod.P1D) ?? {};
  const oneMonthAgo = subMilliseconds(new Date(), ONE_MONTH_IN_MILLIS);
  const start = startOfUtcDay?.(oneMonthAgo) ?? oneMonthAgo;
  const end = endOfUtcDay?.(now) ?? now;
  return {
    start,
    end,
  };
};

type DriftConfigProps = {
  driftThreshold: number;
  driftAlgorithm: string;
};
type StddevConfigProps = {
  modelPerformanceConfig: typeof changeTypeOptions[3]['label'];
  factor?: number;
};
type FixedFixedThresholdProps = {
  modelPerformanceConfig: typeof changeTypeOptions[2]['label'];
  upper?: number;
  lower?: number;
};
type DiffProps = {
  modelPerformanceConfig: typeof changeTypeOptions[0 | 1]['label'];
  thresholdPct?: number;
  thresholdAbs?: number;
};
type GetTypeBasedConfigProps =
  | DriftConfigProps
  | StddevConfigProps
  | FixedFixedThresholdProps
  | DiffProps
  | EmptyObject;
export const getTypeBasedConfigProps = (analyzerConfig: AnalyzerConfig): GetTypeBasedConfigProps => {
  if (isDiffConfig(analyzerConfig)) {
    const { mode, threshold } = analyzerConfig;
    return {
      modelPerformanceConfig: mode === 'pct' ? changeTypeOptions[0].label : changeTypeOptions[1].label,
      [mode === 'pct' ? 'thresholdPct' : 'thresholdAbs']: threshold,
    };
  }
  if (isFixedThresholdsConfig(analyzerConfig)) {
    const { upper, lower } = analyzerConfig;
    return { modelPerformanceConfig: changeTypeOptions[2].label, upper, lower };
  }
  if (isStddevConfig(analyzerConfig)) {
    const { factor } = analyzerConfig;
    return { modelPerformanceConfig: changeTypeOptions[3].label, factor };
  }
  if (isDriftConfig(analyzerConfig)) {
    return {
      driftThreshold: analyzerConfig.threshold ?? 0.7,
      driftAlgorithm: analyzerConfig?.algorithm ?? 'hellinger',
    };
  }
  return {};
};

type BaselineConfig = {
  usedBaseline: MonitorBaselineOption;
};
type TrailingWindowBaseline = {
  baselineWindowSize: TrailingWindowOption;
};
type ReferenceBaseline = {
  baselineProfileId: string;
};
type TimeRangeBaseline = {
  baselineRange: DateTimeRange;
};
type GetBaselineReturnType =
  | ((BaselineConfig | TrailingWindowBaseline | ReferenceBaseline | TimeRangeBaseline) & BaselineConfig)
  | EmptyObject;

export const analyzerHasBaseline = (analyzerConfig: AnalyzerConfig): analyzerConfig is BaselineAnalyzerConfig => {
  if (!('baseline' in analyzerConfig)) return false;
  return !!analyzerConfig.baseline;
};

export const getBaseline = (analyzerConfig: AnalyzerConfig, granularity: Granularity): GetBaselineReturnType => {
  if (analyzerConfig.type === 'fixed' || !analyzerHasBaseline(analyzerConfig)) return {}; // TODO: handle properly
  const usedBaseline = analyzerConfig.baseline;
  const trailingWindowOptionsForGranularity = [...trailingWindowOptions?.[granularity]];
  switch (usedBaseline?.type) {
    case monitorBaselineOptions[0].value: {
      const windowSize = trailingWindowOptionsForGranularity.find(
        ({ value }) => value === usedBaseline.size.toString(),
      )?.value;
      const fallback = trailingWindowOptionsForGranularity[0].value;
      return {
        usedBaseline: usedBaseline.type,
        baselineWindowSize: windowSize ?? fallback,
      };
    }
    case monitorBaselineOptions[1].value:
      return {
        usedBaseline: usedBaseline.type,
        baselineProfileId: usedBaseline.profileId,
      };
    case monitorBaselineOptions[2].value:
      return {
        usedBaseline: usedBaseline.type,
        baselineRange: getDefaultTimeRange(usedBaseline.range),
      };
    default:
      return {};
  }
};

export const getAnalyzerMetric = (config: AnalyzerConfig): DatasetMetric | SimpleColumnMetric | string => {
  if (!('metric' in config)) return '';
  return config.metric;
};

export const getDriftOption = (excludeArray?: string[]): DataDriftOption => {
  if (!excludeArray?.length) return dataDriftOptions[0].value;
  if (excludeArray.includes('group:output')) return dataDriftOptions[1].value;
  return dataDriftOptions[2].value;
};

type GetUseCase = {
  useCase: UseCaseOption;
};
export const getUseCase = (analyzerConfig: AnalyzerConfig, isCustomPerfMetric: boolean): GetUseCase => {
  if (isCustomPerfMetric) return { useCase: 'Model performance' };
  return { useCase: getMetricCategory(getAnalyzerMetric(analyzerConfig)) };
};

type GetTargetMatrixData =
  | {
      includedFeatures?: string[];
      discreteType?: DiscreteTypeOption;
      driftOption: DataDriftOption;
    }
  | EmptyObject;
export const getTargetMatrixData = (a: Analyzer): GetTargetMatrixData => {
  if (a.targetMatrix?.type === 'column' && a.targetMatrix.include) {
    const driftOption = getDriftOption(a.targetMatrix.exclude);
    let discreteType: DiscreteTypeOption | undefined;
    const baseMatrix: GetTargetMatrixData = {
      driftOption,
    };
    if (a.targetMatrix.include[0] === 'group:discrete') {
      discreteType = 'discrete';
    }
    if (a.targetMatrix.include[0] === 'group:continuous') {
      discreteType = 'non-discrete';
    }
    if (a.targetMatrix.include[0] === '*') {
      discreteType = 'both';
    } else {
      baseMatrix.includedFeatures = [...a.targetMatrix.include];
    }
    return { ...baseMatrix, discreteType };
  }
  return {};
};

type SetActions = { actions: Monitor['actions'] } | EmptyObject;
export const setActions = (m?: Monitor): SetActions => {
  if (m && m.actions) {
    return { actions: m.actions };
  }
  return {};
};

type SetSeverity = {
  alertSeverity?: SeverityOption;
};
export const setSeverity = (m?: Monitor): SetSeverity => {
  if (m) {
    const { severity } = m;
    if (typeof severity === 'number') {
      return { alertSeverity: severity as SeverityOption };
    }
  }
  return {};
};

export const analyzerSegmentsToStateSegments = (a: Analyzer): SegmentItem[] => {
  if (!a.targetMatrix?.segments) return [];

  return a.targetMatrix?.segments.map((s) => {
    const segmentAsString = getSegmentTags(s).join(' ');

    return {
      id: segmentAsString,
      label: segmentAsString,
      tags: s.tags,
    };
  });
};

export enum TimestampOffset {
  hourly = 'P7D',
  daily = 'P7D',
  weekly = 'P14D',
  monthly = 'P45D',
}

export const getDatasetTimestampOffset = (granularity: Granularity = 'daily'): TimestampOffset => {
  const timestampOffsetMap = new Map<Granularity, TimestampOffset>([
    ['hourly', TimestampOffset.hourly],
    ['daily', TimestampOffset.daily],
    ['weekly', TimestampOffset.weekly],
    ['monthly', TimestampOffset.monthly],
  ]);
  return timestampOffsetMap.get(granularity) ?? TimestampOffset.daily;
};
