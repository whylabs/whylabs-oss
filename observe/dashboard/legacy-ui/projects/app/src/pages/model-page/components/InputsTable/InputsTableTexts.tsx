import { createCommonTexts } from 'strings/commonTexts';
import { SafeLink } from '@whylabs/observatory-lib';
import { TooltipSpacer } from 'strings/tooltips';

const COMMON_TEXTS = createCommonTexts({
  dataTypeCountHeader: 'Data type count',
  dataTypeCountTooltip: 'Number of records of the inferred data type vs time over the selected date range',
  driftDistanceHeader: 'Drift distance',
  estUniqueValuesHeader: 'Est. unique values',
  estUniqueValuesTooltip:
    'A timeseries of the approximate number of unique values per batch over the selected date range.',
  infDataTypeHeader: 'Inf. data type',
  nullFractionHeader: 'Null fraction',
  totalCountHeader: 'Total count',
  infDataTypeTooltip: (
    <>
      The column&apos;s data type as inferred by whylogs
      <TooltipSpacer />
      Type inference is performed by inspecting the most common data types encountered in the column.
    </>
  ),
  infFeatureTypeHeader: 'Discreteness',
  infFeatureTypeTooltip: (
    <>
      A column is inferred to be discrete or non-discrete by comparing the number of unique values to the total number
      of values. Columns with low uniqueness given the number of records are inferred to be discrete, whereas columns
      with a very high number of unique values compared to the total number of values will be non-discrete.
      <TooltipSpacer />
      Note: discrete/non-discrete is different from categorical/continuous. Discrete variables may likely be
      categorical, and non-discrete items may be continuous, however they may just be high uniqueness columns (e.g.
      unique identifiers).
    </>
  ),
  driftDistanceTooltip: (
    <>
      A timeseries of the column&apos;s mean statistical distance to previous batches of data, plotted over the selected
      date range.
      <TooltipSpacer />
      The statistical distance between distributions is calculated by estimating the{' '}
      <SafeLink
        primaryColor={false}
        href="https://en.wikipedia.org/wiki/Hellinger_distance"
        text="Hellinger distance"
      />
      , but other algorithms can be selected when configuring drift monitors.
    </>
  ),
  nullFractionTooltip: "A timeseries of the column's null fraction over the selected date range.",
  totalCountTooltip: 'A timeseries of the number of records for the column over the selected date range.',
});

export const InputsTableTexts = {
  DATA: {
    ...COMMON_TEXTS,
    featureNameTooltip: 'The list of available columns for this dataset.',
    featureTitle: 'Column',
    outputTitle: 'Output',
    outputNameTooltip: 'The list of available outputs for this data transform.',
  },
  MODEL: {
    ...COMMON_TEXTS,
    featureTitle: 'Feature',
    outputTitle: 'Output',
    featureNameTooltip: 'The list of available features for this model.',
    outputNameTooltip: 'The list of available outputs for this model.',
  },
  LLM: {
    ...COMMON_TEXTS,
    featureTitle: 'Metric',
    outputTitle: '',
    featureNameTooltip: 'The list of available metrics for this model.',
    outputNameTooltip: '',
  },
};
