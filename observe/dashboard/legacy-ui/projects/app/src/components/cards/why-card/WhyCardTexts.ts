import { CategoryKeys } from 'strings/types';
import { JSONValue } from 'types/genericTypes';

type CardContent = {
  title: string;
  tooltipContent: string;
};

export type WhyCardDecorationType =
  | 'est_quantile_drift'
  | 'drift_top_five'
  | 'single_values_est_median'
  | 'single_values_mean'
  | 'single_values_min'
  | 'single_values_max'
  | 'single_values_stddev'
  | 'single_values_q99'
  | 'total_count'
  | 'est_missing_values'
  | 'est_missing_ratios'
  | 'est_unique_values'
  | 'est_unique_ratio'
  | 'inferred_data_type'
  | 'output_count'
  | 'unknown';

const cardDecorationsMapper = new Map<string, WhyCardDecorationType>([
  ['est_quantile_drift', 'est_quantile_drift'],
  ['drift_top_five', 'drift_top_five'],
  ['single_values_est_median', 'single_values_est_median'],
  ['single_values_mean', 'single_values_mean'],
  ['single_values_min', 'single_values_min'],
  ['single_values_max', 'single_values_max'],
  ['single_values_stddev', 'single_values_stddev'],
  ['single_values_q99', 'single_values_q99'],
  ['total_count', 'total_count'],
  ['est_missing_values', 'est_missing_values'],
  ['est_missing_ratios', 'est_missing_ratios'],
  ['est_unique_values', 'est_unique_values'],
  ['est_unique_ratio', 'est_unique_ratio'],
  ['inferred_data_type', 'inferred_data_type'],
  ['output_count', 'output_count'],
  ['unknown', 'unknown'],
]);
export const isCardDecorationType = (decoration: JSONValue): decoration is WhyCardDecorationType => {
  if (typeof decoration === 'string') {
    return !!cardDecorationsMapper.get(decoration);
  }
  return false;
};

type WhyCardTextsType = {
  [decoration in WhyCardDecorationType]: (c: CategoryKeys) => CardContent;
};
export const WhyCardTexts: WhyCardTextsType = {
  inferred_data_type: (category: CategoryKeys): CardContent => ({
    title: 'Inferred data type',
    tooltipContent: isModel(category)
      ? 'A timeseries showing the number of records for each data type encountered in this feature over the selected time range.'
      : 'A timeseries showing the number of records for each data type encountered in this column over the selected time range.',
  }),
  est_missing_values: (category: CategoryKeys): CardContent => ({
    title: 'Missing value count',
    tooltipContent: isModel(category)
      ? 'The fraction of missing values (NaN, null, or missing) per batch for this feature as a function of time over the selected date range.'
      : 'The fraction of missing values (NaN, null, or missing) per batch for this column as a function of time over the selected date range.',
  }),
  single_values_est_median: (_: CategoryKeys): CardContent => ({
    title: 'Statistical values',
    tooltipContent: 'A chart showing single statistical values and predictions over time.',
  }),
  single_values_mean: (_: CategoryKeys): CardContent => ({
    title: 'Statistical values',
    tooltipContent: 'A chart showing single statistical values and predictions over time.',
  }),
  single_values_min: (_: CategoryKeys): CardContent => ({
    title: 'Statistical values',
    tooltipContent: 'A chart showing single statistical values and predictions over time.',
  }),
  single_values_max: (_: CategoryKeys): CardContent => ({
    title: 'Statistical values',
    tooltipContent: 'A chart showing single statistical values and predictions over time.',
  }),
  single_values_stddev: (_: CategoryKeys): CardContent => ({
    title: 'Statistical values',
    tooltipContent: 'A chart showing single statistical values and predictions over time.',
  }),
  single_values_q99: (_: CategoryKeys): CardContent => ({
    title: 'Statistical values',
    tooltipContent: 'A chart showing single statistical values and predictions over time.',
  }),
  est_missing_ratios: (category: CategoryKeys): CardContent => ({
    title: 'Missing value ratio',
    tooltipContent: isModel(category)
      ? 'The fraction of missing values (NaN, null, or missing) per batch for this feature as a function of time over the selected date range.'
      : 'The fraction of missing values (NaN, null, or missing) per batch for this column as a function of time over the selected date range.',
  }),
  est_unique_values: (category: CategoryKeys): CardContent => ({
    title: 'Estimated unique values',
    tooltipContent: isModel(category)
      ? 'A timeseries of the estimated number of unique values for this feature over the selected date range.'
      : 'A timeseries of the estimated number of unique values for this column over the selected date range.',
  }),
  est_unique_ratio: (category: CategoryKeys): CardContent => ({
    title: 'Estimated unique ratio',
    tooltipContent: isModel(category)
      ? 'A timeseries of the estimated ratio of unique values for this feature over the selected date range'
      : 'A timeseries of the estimated ratio of unique values for this column over the selected date range.',
  }),
  est_quantile_drift: (category: CategoryKeys): CardContent => ({
    title: 'Drift - estimated quantiles',
    tooltipContent: isModel(category)
      ? "A timeseries of the feature's mean statistical distance to previous batches of data, plotted over the selected date range."
      : "A timeseries of the column's mean statistical distance to previous batches of data, plotted over the selected date range.",
  }),
  drift_top_five: (category: CategoryKeys): CardContent => ({
    title: 'Drift - frequent items',
    tooltipContent: isModel(category)
      ? "A timeseries of the feature's mean statistical distance to previous batches of data, plotted over the selected date range."
      : "A timeseries of the column's mean statistical distance to previous batches of data, plotted over the selected date range.",
  }),
  total_count: (_: CategoryKeys): CardContent => ({
    title: 'Total values',
    tooltipContent: 'A chart showing the total count of the values in the feature.',
  }),
  output_count: (_: CategoryKeys): CardContent => ({
    title: 'Model output and input count',
    tooltipContent: 'A timeseries of the input and output counts for this model or segment',
  }),
  unknown: (_: CategoryKeys): CardContent => ({
    title: '',
    tooltipContent: '',
  }),
};

function isModel(category: CategoryKeys): boolean {
  return category === 'MODEL';
}
