import { Colors } from '~/assets/Colors';
import { GraphStripedPattern, createAxisTickPositioner } from '~/components/chart/chart-utils';
import { ChartCategorySeries, ChartCommonSeries } from '~/components/chart/types/chart-types';
import { GenericFlexColumnSelectItemData } from '~/components/design-system';
import { SortDirectionType } from '~/types/sortTypes';
import { isValidNumber } from '~/utils/numberUtils';
import { getLabelForModelType } from '~/utils/resourceTypeUtils';
import { TEMP_END_DATE_RANGE, TEMP_RANGE_PRESET, TEMP_START_DATE_RANGE } from '~/utils/searchParamsConstants';
import { RouterOutputs } from '~/utils/trpc';
import { DatasetMetricFeature } from '~server/graphql/contract-converters/data-service/numeric-metrics-converter';
import {
  AnalysisMetric,
  AnalysisTargetLevel,
  MetricDataType,
  MetricDirection,
  MetricKind,
  MetricQuery,
  MetricSchema,
  ModelType,
  SortDirection,
} from '~server/graphql/generated/graphql';
import { AxisTickPositionsArray, SeriesZonesOptionsObject, merge } from 'hcplaceholder';

export type ResourceMetricsData = RouterOutputs['dashboard']['metrics']['getAvailableDatasetMetrics'];

export enum TracingPreset {
  performance = 'performance',
  biasAndFairness = 'biasAndFairness',
  dataQuality = 'dataQuality',
  custom = 'custom',
}

export const convertStringToPresetName = (preset: string | null): TracingPreset | null => {
  switch (preset) {
    case TracingPreset.performance:
      return TracingPreset.performance;
    case TracingPreset.biasAndFairness:
      return TracingPreset.biasAndFairness;
    case TracingPreset.dataQuality:
      return TracingPreset.dataQuality;
    case TracingPreset.custom:
      return TracingPreset.custom;
    default:
      return null;
  }
};

const performanceItem: GenericFlexColumnSelectItemData = {
  label: 'Performance debugging',
  value: TracingPreset.performance,
  tooltip: 'Performance debugging',
};
const biasAndFairnessItem: GenericFlexColumnSelectItemData = {
  label: 'Bias and fairness',
  value: TracingPreset.biasAndFairness,
  tooltip: 'Bias and fairness',
};
const dataQualityItem: GenericFlexColumnSelectItemData = {
  label: 'Data quality',
  value: TracingPreset.dataQuality,
};
const customItem: GenericFlexColumnSelectItemData = {
  label: 'No preset',
  value: TracingPreset.custom,
};
// For model types not mapped here, we will not display the presets select,
// and the selected metrics will fall back to the first option
const availablePresetMapper = new Map<ModelType, GenericFlexColumnSelectItemData[]>([
  [ModelType.Classification, [performanceItem, biasAndFairnessItem, dataQualityItem, customItem]],
  [ModelType.Regression, [performanceItem, biasAndFairnessItem, dataQualityItem, customItem]],
  [ModelType.Ranking, [performanceItem, biasAndFairnessItem, dataQualityItem, customItem]],
]);
const resourceTypeToken = '{{modelType}}';
// this fallback presets will be used for other resource types not handled in availablePresetMapper
const notAvailablePresetConfig = {
  disabled: true,
  disabledTooltip: `This preset is not available for ${resourceTypeToken}`,
};
const presetsFallback = [
  { ...performanceItem, ...notAvailablePresetConfig },
  { ...biasAndFairnessItem, ...notAvailablePresetConfig },
  dataQualityItem,
  customItem,
];
const commonDataQualityMetrics = { primary: 'Null ratio', secondary: 'Total count' };
const presetMetricsMapper = new Map<`${ModelType}:${TracingPreset}`, { primary: string; secondary: string }>([
  [`${ModelType.Classification}:${TracingPreset.performance}`, { primary: 'Accuracy', secondary: 'Prediction count' }],
  [
    `${ModelType.Regression}:${TracingPreset.performance}`,
    { primary: 'Root mean square error (RMSE)', secondary: 'Prediction count' },
  ],
  [`${ModelType.Ranking}:${TracingPreset.performance}`, { primary: 'average_precision*', secondary: 'top_rank' }],
  [
    `${ModelType.Classification}:${TracingPreset.biasAndFairness}`,
    { primary: 'False positive rate', secondary: 'Prediction count' },
  ],
  [
    `${ModelType.Regression}:${TracingPreset.biasAndFairness}`,
    { primary: 'Mean absolute error (MAE)', secondary: 'Prediction count' },
  ],
  [`${ModelType.Ranking}:${TracingPreset.biasAndFairness}`, { primary: 'reciprocal_rank', secondary: 'top_rank' }],
  [`${ModelType.Classification}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.Regression}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.Ranking}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  // [`${ModelType.Llm}:${TracingPreset.dataQuality}`, commonDataQualityMetrics], // todo: define LLM presets (#86b1kcu9a)
  [`${ModelType.DataStream}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.DataOther}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.DataSource}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.DataTransform}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.Unknown}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
]);

export const presetScopeMapper = new Map<TracingPreset, PresetScopeType>([
  [TracingPreset.performance, 'performance'],
  [TracingPreset.biasAndFairness, 'performance'],
  [TracingPreset.dataQuality, 'quality'],
  [TracingPreset.custom, 'custom'],
]);

export const getPresetMetricsScope = (selectedPreset: TracingPreset): PresetScopeType => {
  return presetScopeMapper.get(selectedPreset) ?? 'custom';
};

export const getResourceAvailablePresets = (resourceType: ModelType): GenericFlexColumnSelectItemData[] => {
  if (resourceType === ModelType.Llm) return []; // TODO: define LLM presets (#86b1kcu9a)
  return availablePresetMapper.get(resourceType) ?? presetsFallback;
};

export const getPresetMetrics = (resourceType: ModelType | null, preset: TracingPreset | null) => {
  if (!resourceType || !preset) return null;
  return presetMetricsMapper.get(`${resourceType}:${preset}`);
};

export const MIN_LENGTH_TO_SHOW_TOOLTIP = 16;

export const getInputTooltip = (value: string | null): string =>
  value && value.length > MIN_LENGTH_TO_SHOW_TOOLTIP ? value : '';

// these tags have to be in sync with built-in metrics
type PresetScopeType = 'performance' | 'quality' | 'custom';
export const translateMetricSelectData = (
  data: ResourceMetricsData,
  scope: PresetScopeType,
): GenericFlexColumnSelectItemData[] => {
  return data.flatMap(({ label, tags, name }) => {
    return tags?.includes(scope) || scope === 'custom'
      ? [
          {
            label,
            value: label,
            tooltip: label.length > MIN_LENGTH_TO_SHOW_TOOLTIP ? label : '',
          },
        ]
      : [];
  });
};

export const translateColumnsSelectData = (
  data: RouterOutputs['dashboard']['columns']['list'],
): GenericFlexColumnSelectItemData[] => {
  return data.flatMap(({ name }) => [
    {
      label: name,
      value: name,
      tooltip: name.length > MIN_LENGTH_TO_SHOW_TOOLTIP ? name : '',
    },
  ]);
};

export interface SegmentAnalysisPageConfiguration {
  selectedPreset: TracingPreset | null;
  primaryMetric: string | null;
  secondaryMetric: string | null;
  targetColumn: string | null;
  referenceThreshold: number | null;
}

export type AvailableMetric = ResourceMetricsData[number];
export type AggregatedData = RouterOutputs['dashboard']['metrics']['getSegmentGroupRollUpMetricData'];

export type CommonGraphProps = {
  primaryMetric: AvailableMetric | null;
  secondaryMetric: AvailableMetric | null;
  targetColumn: string | null;
  referenceThreshold: number | null;
};

export const DEFAULT_THRESHOLD_VALUE = 0.7;

export const THRESHOLD_LINE_COLOR = Colors.purple;

export const PRIMARY_SERIES_COLOR = Colors.chartBlue;
export const SECONDARY_SERIES_COLOR = Colors.lightBlue;
export const COMPARISON_PRIMARY_SERIES_COLOR = Colors.chartOrange;
export const COMPARISON_SECONDARY_SERIES_COLOR = Colors.lightOrange;

export const COMPARISON_TOKEN = ' (comparison)'; // blank space is necessarily
const graphsSeriesPropsMap = new Map<
  string,
  { color: string; pointPadding: number; pointPlacement: number; yAxis?: number; zIndex?: number }
>([
  ['primary', { color: PRIMARY_SERIES_COLOR, pointPadding: 0.4, pointPlacement: -0.13, yAxis: 0, zIndex: 2 }],
  [
    `primary:${COMPARISON_TOKEN}`,
    { color: COMPARISON_PRIMARY_SERIES_COLOR, pointPadding: 0.4, pointPlacement: 0.13, yAxis: 0, zIndex: 2 },
  ],
  ['secondary', { color: SECONDARY_SERIES_COLOR, pointPadding: 0.3, pointPlacement: -0.13, yAxis: 1, zIndex: 1 }],
  [
    `secondary:${COMPARISON_TOKEN}`,
    { color: COMPARISON_SECONDARY_SERIES_COLOR, pointPadding: 0.3, pointPlacement: 0.13, yAxis: 1, zIndex: 1 },
  ],
]);

export type SegmentAnalysisCategoryChartSeries = ChartCategorySeries & {
  metricType: 'primary' | 'secondary';
  metric: AvailableMetric;
};

export const generateAggregatedSeriesObject = ({
  metric,
  type,
  isComparison,
}: {
  metric: AvailableMetric;
  type: 'primary' | 'secondary';
  isComparison: boolean;
}): SegmentAnalysisCategoryChartSeries => {
  const metricProps = graphsSeriesPropsMap.get(isComparison ? `${type}:${COMPARISON_TOKEN}` : type);
  const { label } = metric;
  return {
    type: 'column',
    name: label.concat(isComparison ? COMPARISON_TOKEN : ''),
    ...(metricProps ?? {}),
    data: [],
    metricType: type,
    metric,
  };
};

export const sortAggregatedMetricData = (
  metricsData: AggregatedData,
  sortedMetric: AvailableMetric | null,
  order: SortDirectionType,
) => {
  if (!sortedMetric) return metricsData;
  return [...metricsData].sort((a, b) => {
    // First, sort by metric
    if (a.metric + a.feature !== b.metric + b.feature) {
      const isSortedMetric = a.metric === sortedMetric.name;
      const isDatasetLevelMetric = sortedMetric.queryDefinition?.targetLevel === AnalysisTargetLevel.Dataset;
      const isMetricTargetColumn = isDatasetLevelMetric
        ? a.feature === DatasetMetricFeature
        : a.feature === sortedMetric.queryDefinition?.column;
      return isSortedMetric && isMetricTargetColumn ? -1 : 1;
    }
    // If metrics are the same, sort by value in descending order
    return (b.value - a.value) * (order === SortDirection.Desc ? 1 : -1);
  });
};

export const DEFAULT_TICKS_AMOUNT = 4;

export enum SegmentGraphSortBy {
  'PrimaryMetric' = 'PrimaryMetric',
  'SecondaryMetric' = 'SecondaryMetric',
}

export const comparisonDatePickerParams = {
  startDateSearchParamKey: TEMP_START_DATE_RANGE,
  endDateSearchParamKey: TEMP_END_DATE_RANGE,
  dynamicPresetSearchParamKey: TEMP_RANGE_PRESET,
};

export const isColumnTargetMetric = (metric: ResourceMetricsData[number]) => {
  const { queryDefinition } = metric;
  return queryDefinition?.targetLevel === AnalysisTargetLevel.Column;
};

export const requireColumnSelection = (metric: ResourceMetricsData[number] | null) => {
  if (!metric) return false;
  const { queryDefinition } = metric;
  // We need to check if the column prop is empty, so we know it's not a custom performance or LLM metric
  return isColumnTargetMetric(metric) && !queryDefinition?.column;
};

type MountMetricQueriesReturnType = {
  queries: MetricQuery[];
  isMissingColumnSelection: boolean;
};
export const mountMetricQueries = ({
  selectedMetrics,
  resourceId,
  targetColumn,
}: {
  selectedMetrics: (AvailableMetric | null)[];
  targetColumn?: string | null;
  resourceId: string;
}): MountMetricQueriesReturnType => {
  const queries: MetricQuery[] = [];
  let isMissingColumnSelection = false;
  const mountQuery = (metric: Exclude<CommonGraphProps['primaryMetric'], null>) => {
    const isColumnMetric = isColumnTargetMetric(metric);
    isMissingColumnSelection = (() => {
      if (isMissingColumnSelection) return isMissingColumnSelection;
      return requireColumnSelection(metric) && !targetColumn;
    })();
    const queryColumn = isColumnMetric ? metric?.queryDefinition?.column || targetColumn : null;
    return {
      datasetId: resourceId,
      metric: metric?.name ?? AnalysisMetric.Unknown,
      feature: queryColumn,
    } satisfies MetricQuery;
  };
  selectedMetrics.forEach((metric) => {
    if (metric?.name) {
      queries.push(mountQuery(metric));
    }
  });
  return { queries, isMissingColumnSelection };
};

export const GRAPH_AXIS_BUFFER = 0.1; // this is a buffer to ensure we have a small space between the series min/max and the axis bounds
export const generateMetricGraphTickPositions = ({
  dataMin,
  dataMax,
  isUnitInterval,
  ticksAmount,
  integerDataType,
}: {
  dataMin: number;
  dataMax: number;
  isUnitInterval?: boolean;
  ticksAmount: number;
  integerDataType: boolean;
}): AxisTickPositionsArray => {
  if (isUnitInterval) return createAxisTickPositioner({ min: 0, max: 1, ticksAmount });
  const inferredMin = Math.min(dataMin, 0);
  const dataInterval = dataMax - inferredMin;
  const intervalAmount = ticksAmount - 1;
  const usedInterval = Math.max(dataInterval, 0.1 * intervalAmount);
  const step = usedInterval / intervalAmount;
  if (integerDataType) {
    const roundedStep = Math.ceil(step);
    const inferredMax = roundedStep * intervalAmount;
    return createAxisTickPositioner({ min: inferredMin, max: inferredMax, ticksAmount, forceIntervalRounding: true });
  }
  const usedBuffer = step * GRAPH_AXIS_BUFFER;
  const max = dataMax + usedBuffer;
  const min = (() => {
    if (dataMin < 0) return dataMin - usedBuffer;
    return 0;
  })();
  return createAxisTickPositioner({ min, max, ticksAmount });
};
export type TimeseriesMetricData = RouterOutputs['dashboard']['metrics']['getRollUpMetricData'];
export type TimeseriesData = [number, number | null][];

export type YDataDomain = { min: number; max: number } | null;

export const mapMetricSeries = (series: TimeseriesMetricData[number]): [TimeseriesData, YDataDomain] => {
  const metricDomain: YDataDomain = { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER };
  let hasSomeValidPoint = false;
  const mappedTimeseries: TimeseriesData = series?.points?.map(({ timestamp, value }) => {
    if (isValidNumber(value)) {
      hasSomeValidPoint = true;
      metricDomain.min = Math.min(value, metricDomain.min ?? value);
      metricDomain.max = Math.max(value, metricDomain.max ?? value);
    }
    return [timestamp, value];
  });
  return [mappedTimeseries, hasSomeValidPoint ? metricDomain : null];
};

export const getSeriesSpec = (metric: AvailableMetric | null): { type: 'line' | 'area'; zIndex: number } => {
  // This is a non-ideal way to check whether the column is a volume metric, so we prefer to use area plot
  if (metric?.dataType === MetricDataType.Integer) return { type: 'area', zIndex: 0 };
  return { type: 'line', zIndex: 2 };
};

export const COMPATIBLE_METRIC_KINDS = [MetricKind.Rate, MetricKind.Amount];
export const COMPATIBLE_METRIC_DATA_TYPE = [MetricDataType.Integer, MetricDataType.Float];

export const filterCompatibleMetrics = (data: ResourceMetricsData): ResourceMetricsData =>
  data.filter(
    ({ metricKind, dataType }) =>
      metricKind && COMPATIBLE_METRIC_KINDS.includes(metricKind) && COMPATIBLE_METRIC_DATA_TYPE.includes(dataType),
  );

export const handleMetricHero = (value: number, showAsPercent: boolean): string => {
  const factor = showAsPercent ? 100 : 1;
  const formatted = Number((value * factor).toFixed(3));
  if (showAsPercent) return `${formatted}%`;
  return formatted.toLocaleString();
};

export const findMetricSchema = (
  metrics: MetricSchema[],
  analysisMetric: AnalysisMetric,
  column: string,
): MetricSchema | undefined => {
  const datasetLevelMetric = metrics.find(
    (metric) =>
      metric?.name === analysisMetric &&
      ((column === DatasetMetricFeature && !metric?.queryDefinition?.column) ||
        metric?.queryDefinition?.column === column),
  );
  if (datasetLevelMetric) {
    return datasetLevelMetric;
  }
  return metrics.find((metric) => metric?.name === analysisMetric && !metric?.queryDefinition?.column);
};

export const shouldUseCommonAxis = (
  primaryMetric: AvailableMetric | null,
  secondaryMetric: AvailableMetric | null,
): boolean => {
  if (
    !primaryMetric?.metricKind ||
    !secondaryMetric?.metricKind ||
    !primaryMetric?.dataType ||
    !secondaryMetric?.dataType
  )
    return false;
  return (
    primaryMetric.metricKind === secondaryMetric.metricKind &&
    primaryMetric.dataType === secondaryMetric.dataType &&
    !!primaryMetric.unitInterval === !!secondaryMetric.unitInterval
  );
};

export const getResourcePresets = (resourceType: ModelType | null, availableMetrics: ResourceMetricsData) => {
  if (!resourceType) return [];
  const presets = getResourceAvailablePresets(resourceType);
  return presets.map((possiblePreset) => {
    const preset = convertStringToPresetName(possiblePreset.value);
    const presetDefaultMetrics = getPresetMetrics(resourceType, preset);
    const { primary, secondary } = presetDefaultMetrics ?? {};
    const foundPrimaryMetric = findMetricByLabel(availableMetrics, primary);
    const foundSecondaryMetric = findMetricByLabel(availableMetrics, secondary);
    if ((!foundPrimaryMetric || !foundSecondaryMetric) && !possiblePreset.disabled && preset !== TracingPreset.custom)
      return {
        ...possiblePreset,
        disabled: true,
        disabledTooltip: 'The preset metrics are not available in this resource',
      };
    const resourceTypeLabel = (() => {
      const label = getLabelForModelType(resourceType)?.toLowerCase();
      if (label) return `${label} resources`;
      return 'this resource';
    })();
    return {
      ...possiblePreset,
      disabledTooltip: possiblePreset.disabledTooltip?.replace(resourceTypeToken, resourceTypeLabel),
    };
  });
};

export const findMetricByLabel = (metrics: ResourceMetricsData, label?: string): AvailableMetric | undefined => {
  if (!label) return undefined;
  const filteredMetrics = (() => {
    if (label.includes('*')) {
      return metrics.filter((m) => m.label.includes(label.replace('*', '')));
    }
    return metrics.filter((m) => m.label === label);
  })();
  return filteredMetrics.sort((a, b) => a.label.localeCompare(b.label))[0];
};

export const findPresetForResourceType = (
  presetName: string | null,
  resourceType: ModelType | null,
  availableMetrics: ResourceMetricsData,
) => {
  if (!resourceType) return null;
  const resourceAvailablePresets = getResourcePresets(resourceType, availableMetrics).filter(
    ({ disabled }) => !disabled,
  );
  const selectedPreset = presetName
    ? resourceAvailablePresets.find(({ value, disabled }) => presetName === value)?.value
    : resourceAvailablePresets[0]?.value;
  return convertStringToPresetName(selectedPreset ?? null);
};

export const generateBarPatternZones = (
  primaryMetric: AvailableMetric,
  color: ChartCommonSeries['color'],
  thresholdValue: number | null,
): SeriesZonesOptionsObject[] | undefined => {
  if (thresholdValue == null) return undefined;
  const { metricDirection } = primaryMetric;
  if (metricDirection === MetricDirection.ImproveDown) {
    // when more is worst, like error metrics
    return [
      {
        color,
        value: thresholdValue,
      },
      {
        color: { pattern: merge(GraphStripedPattern, { color: color ?? 'white' }) },
      },
    ];
  }
  return [
    {
      value: thresholdValue,
      color: { pattern: merge(GraphStripedPattern, { color: color ?? 'white' }) },
    },
  ];
};
