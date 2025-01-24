import { TEMP_END_DATE_RANGE, TEMP_RANGE_PRESET, TEMP_START_DATE_RANGE } from 'types/navTags';
import {
  AnalysisTargetLevel,
  GetAvailableMetricsQuery,
  GetFilteredColumnNamesQuery,
  MetricDataType,
  MetricKind,
  MetricSchemaFragment,
  ModelType,
} from 'generated/graphql';
import { GenericFlexColumnSelectItemData } from 'components/design-system';
import { getLabelForModelType } from '../../utils/modelTypeUtils';

export interface SegmentAnalysisPageConfiguration {
  selectedPreset: TracingPreset | null;
  primaryMetric: string | null;
  secondaryMetric: string | null;
  targetColumn: string | null;
  referenceThreshold: number | null;
}

export const SEGMENT_ANALYSIS_IFRAME = 'new-stack-segment-analysis-iframe';

export const comparisonDatePickerParams = {
  startDateSearchParamKey: TEMP_START_DATE_RANGE,
  endDateSearchParamKey: TEMP_END_DATE_RANGE,
  dynamicPresetSearchParamKey: TEMP_RANGE_PRESET,
};

export const COMPATIBLE_METRIC_KINDS = [MetricKind.Rate, MetricKind.Amount];
export const COMPATIBLE_METRIC_DATA_TYPE = [MetricDataType.Integer, MetricDataType.Float];

export const filterCompatibleMetrics = (data?: GetAvailableMetricsQuery): MetricSchemaFragment[] =>
  data?.dataQueries?.availableMetrics?.filter(
    ({ metricKind, dataType }) =>
      metricKind && COMPATIBLE_METRIC_KINDS.includes(metricKind) && COMPATIBLE_METRIC_DATA_TYPE.includes(dataType),
  ) ?? [];

export const isColumnTargetMetric = (metric: MetricSchemaFragment): boolean => {
  const { queryDefinition } = metric;
  return queryDefinition?.targetLevel === AnalysisTargetLevel.Column;
};

export const requireColumnSelection = (metric: MetricSchemaFragment | null): boolean => {
  if (!metric) return false;
  const { queryDefinition } = metric;
  // We need to check if the column prop is empty, so we know it's not a custom performance or LLM metric
  return isColumnTargetMetric(metric) && !queryDefinition?.column;
};

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
  // [`${ModelType.Llm}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],  // todo: define LLM presets (#86b1kcu9a)
  [`${ModelType.DataStream}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.DataOther}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.DataSource}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.DataTransform}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
  [`${ModelType.Unknown}:${TracingPreset.dataQuality}`, commonDataQualityMetrics],
]);

// these tags have to be in sync with built-in metrics
type PresetScopeType = 'performance' | 'quality' | 'custom';

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

export const getPresetMetrics = (
  resourceType: ModelType | null,
  preset: TracingPreset | null,
): { primary: string; secondary: string } | undefined | null => {
  if (!resourceType || !preset) return null;
  return presetMetricsMapper.get(`${resourceType}:${preset}`);
};

export const MIN_LENGTH_TO_SHOW_TOOLTIP = 16;

export const getInputTooltip = (value: string | null): string =>
  value && value.length > MIN_LENGTH_TO_SHOW_TOOLTIP ? value : '';

export const translateMetricSelectData = (
  data: MetricSchemaFragment[],
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

export const translateColumnsSelectData = (data: { name: string }[]): GenericFlexColumnSelectItemData[] => {
  return data.flatMap(({ name }) => [
    {
      label: name,
      value: name,
      tooltip: name.length > MIN_LENGTH_TO_SHOW_TOOLTIP ? name : '',
    },
  ]);
};

export const translateGQLColumnsData = (data?: GetFilteredColumnNamesQuery): { name: string }[] => {
  const features = data?.model?.segment?.filteredFeatures?.results ?? [];
  const outputs = data?.model?.segment?.filteredOutputs?.results ?? [];
  return features.concat(outputs).sort((a, b) => a.name.localeCompare(b.name));
};

export const getResourcePresets = (
  resourceType: ModelType | null,
  availableMetrics: MetricSchemaFragment[],
): GenericFlexColumnSelectItemData[] => {
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

export const findMetricByLabel = (
  metrics: MetricSchemaFragment[],
  label?: string,
): MetricSchemaFragment | undefined => {
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
  availableMetrics: MetricSchemaFragment[],
): TracingPreset | null => {
  if (!resourceType) return null;
  const resourceAvailablePresets = getResourcePresets(resourceType, availableMetrics).filter(
    ({ disabled }) => !disabled,
  );
  const selectedPreset = presetName
    ? resourceAvailablePresets.find(({ value, disabled }) => presetName === value)?.value
    : resourceAvailablePresets[0]?.value;
  return convertStringToPresetName(selectedPreset ?? null);
};
