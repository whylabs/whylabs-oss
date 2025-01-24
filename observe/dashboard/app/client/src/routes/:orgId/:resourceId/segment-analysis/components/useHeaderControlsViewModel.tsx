import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsSwitch } from '~/components/design-system';
import { WhyLabsHeaderSection } from '~/components/misc/WhyLabsHeader';
import { CUSTOM_RANGE, dateConstructorToReadableISOString } from '~/components/super-date-picker/utils';
import { WhyLabsSuperDatePicker } from '~/components/super-date-picker/WhyLabsSuperDatePicker';
import { useResourceSegmentAnalysisViewModel } from '~/routes/:orgId/:resourceId/segment-analysis/useResourceSegmentAnalysisViewModel';
import {
  CommonGraphProps,
  ResourceMetricsData,
  TracingPreset,
  comparisonDatePickerParams,
  convertStringToPresetName,
  getInputTooltip,
  getPresetMetrics,
  getPresetMetricsScope,
  getResourcePresets,
  requireColumnSelection,
  translateColumnsSelectData,
  translateMetricSelectData,
} from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import { isValidNumber } from '~/utils/numberUtils';
import {
  ACTIVE_COMPARISON,
  METRICS_PRESET,
  PRIMARY_METRIC,
  SECONDARY_METRIC,
  SELECTED_COLUMN_QUERY_NAME,
  THRESHOLD_QUERY_NAME,
} from '~/utils/searchParamsConstants';
import { ModelType } from '~server/graphql/generated/graphql';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const useStyles = createStyles({
  controlWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 62,
    justifyContent: 'space-between',
  },
  controlLabel: {
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 600,
    color: Colors.brandSecondary900,
    lineHeight: 1.42,
  },
  switchWrapper: {
    minHeight: 36,
    display: 'flex',
    alignItems: 'center',
  },
});

export type HeaderControlsProps = CommonGraphProps & {
  pageViewModel: ReturnType<typeof useResourceSegmentAnalysisViewModel>;
  metricsData: ResourceMetricsData;
  resourceType: ModelType | null;
};
export const useHeaderControlsViewModel = (props: HeaderControlsProps) => {
  const { pageViewModel, metricsData, resourceType } = props;
  const {
    setReferenceThresholdState,
    activeComparison,
    getHeaderControlsState,
    globalDateRange,
    comparePickerHasFallbackRange,
    meta,
  } = pageViewModel;
  const [, setSearchParams] = useSearchParams();
  const { classes, cx } = useStyles();
  const headerState = getHeaderControlsState(resourceType, metricsData);
  const usedPrimaryMetric = metricsData.find((m) => m.label === headerState.primaryMetric) ?? null;
  const usedSecondaryMetric = metricsData.find((m) => m.label === headerState.secondaryMetric) ?? null;
  const shouldDisplayColumnSelect =
    requireColumnSelection(usedPrimaryMetric) || requireColumnSelection(usedSecondaryMetric);
  const {
    columns: { columnsList, isLoadingColumns },
  } = meta;

  const manageSearchParams = useCallback(
    (params: { key: string; value: string | null }[]) => {
      setSearchParams((nextParams) => {
        params.forEach(({ key, value }) => {
          if (value === null) {
            nextParams.delete(key);
          } else {
            nextParams.set(key, value);
          }
        });
        return nextParams;
      });
    },
    [setSearchParams],
  );

  const handlePresetChange = useCallback(
    (preset: TracingPreset | null) => {
      if (!preset) return;
      const tracingPreset = convertStringToPresetName(preset);
      const metrics = getPresetMetrics(resourceType, tracingPreset);
      setSearchParams((nextParams) => {
        nextParams.set(METRICS_PRESET, preset);
        if (metrics && preset !== TracingPreset.custom) {
          nextParams.set(PRIMARY_METRIC, metrics.primary);
          nextParams.set(SECONDARY_METRIC, metrics.secondary);
        }
        if (preset === TracingPreset.custom) {
          nextParams.delete(PRIMARY_METRIC);
          nextParams.delete(SECONDARY_METRIC);
        }
        return nextParams;
      });
    },
    [resourceType, setSearchParams],
  );

  const toggleComparison = useCallback(
    () => () => {
      if (activeComparison) {
        manageSearchParams([{ key: ACTIVE_COMPARISON, value: null }]);
        return;
      }
      const { from, to } = globalDateRange;
      const primaryRangeOffset = to - from;
      // define a trailing window from the selected primary range
      const comparisonStartDate = dateConstructorToReadableISOString(from - primaryRangeOffset);
      const comparisonEndDate = dateConstructorToReadableISOString(from - 1);
      manageSearchParams([
        { key: ACTIVE_COMPARISON, value: 'true' },
        ...(comparePickerHasFallbackRange
          ? [
              { key: comparisonDatePickerParams.startDateSearchParamKey, value: comparisonStartDate },
              { key: comparisonDatePickerParams.endDateSearchParamKey, value: comparisonEndDate },
              { key: comparisonDatePickerParams.dynamicPresetSearchParamKey, value: CUSTOM_RANGE },
            ]
          : []),
      ]);
    },
    [activeComparison, manageSearchParams, comparePickerHasFallbackRange, globalDateRange],
  );

  const generateHeaderSections = useCallback(() => {
    const isNotLlm = resourceType !== ModelType.Llm;
    const presets = getResourcePresets(resourceType, metricsData);
    const usedPreset = headerState.selectedPreset ?? TracingPreset.custom;
    const metricsScope = getPresetMetricsScope(usedPreset);
    const data = translateMetricSelectData(metricsData, metricsScope);
    const columnsSelectData = translateColumnsSelectData(columnsList ?? []);
    return [
      ...(presets?.length && isNotLlm
        ? ([
            {
              label: 'Preset select',
              inputs: [
                {
                  key: 'analysis-segment-preset',
                  kind: 'select',
                  width: 190,
                  inputTooltip: getInputTooltip(usedPreset),
                  props: {
                    data: presets,
                    placeholder: 'Select a preset',
                    label: 'Preset',
                    value: usedPreset,
                    onChange: (value) => handlePresetChange(value as TracingPreset),
                    withinPortal: true,
                  },
                },
              ],
            },
          ] satisfies WhyLabsHeaderSection[])
        : []),
      {
        label: 'Primary metric',
        inputs: [
          {
            kind: 'select',
            width: 190,
            key: 'analysis-segment-primary-metric',
            inputTooltip: getInputTooltip(headerState?.primaryMetric),
            props: {
              data: data.filter((m) => m.value !== headerState.secondaryMetric),
              placeholder: 'Select primary metric',
              label: 'Primary metric',
              value: headerState.primaryMetric,
              onChange: (value) => manageSearchParams([{ key: PRIMARY_METRIC, value }]),
              withinPortal: true,
            },
          },
        ],
      },
      {
        label: 'Secondary metric',
        dividerAfter: !shouldDisplayColumnSelect,
        inputs: [
          {
            kind: 'select',
            width: 190,
            key: 'analysis-segment-secondary-metric',
            inputTooltip: getInputTooltip(headerState?.secondaryMetric),
            props: {
              data: data.filter((m) => m.value !== headerState.primaryMetric),
              placeholder: 'Select secondary metric',
              label: 'Secondary metric',
              value: headerState.secondaryMetric,
              onChange: (value) => manageSearchParams([{ key: SECONDARY_METRIC, value }]),
              withinPortal: true,
            },
          },
        ],
      },
      ...(shouldDisplayColumnSelect
        ? ([
            {
              label: 'Column',
              dividerAfter: true,
              inputs: [
                {
                  kind: 'select',
                  width: 190,
                  key: 'analysis-segment-column',
                  inputTooltip: getInputTooltip(headerState?.targetColumn),
                  props: {
                    data: columnsSelectData,
                    loading: isLoadingColumns,
                    placeholder: 'Select column',
                    label: 'Column',
                    value: headerState.targetColumn,
                    onChange: (value) => manageSearchParams([{ key: SELECTED_COLUMN_QUERY_NAME, value }]),
                    withinPortal: true,
                  },
                },
              ],
            },
          ] satisfies WhyLabsHeaderSection[])
        : []),
      {
        label: 'Reference threshold',
        dividerAfter: true,
        inputs: [
          {
            kind: 'numberInput',
            width: 190,
            key: 'analysis-segment-threshold',
            inputTooltip: isValidNumber(headerState.referenceThreshold)
              ? ''
              : 'A default reference threshold is calculated based on the primary metric',
            props: {
              step: 0.1,
              placeholder: 'Type a number',
              label: 'Reference threshold',
              precision: 3,
              value: isValidNumber(headerState.referenceThreshold) ? headerState.referenceThreshold : '',
              onChange: (value) => {
                const newValue = value?.toString() || null;
                setReferenceThresholdState(newValue);
                manageSearchParams([{ key: THRESHOLD_QUERY_NAME, value: newValue }]);
              },
            },
          },
        ],
      },
      {
        label: 'Comparison switch',
        element: (
          <div className={cx(classes.controlWrapper)} key="analysis-segment-comparison-switch">
            <label htmlFor="analysis-segment-comparison-switch" className={classes.controlLabel}>
              Compare
            </label>
            <div className={classes.switchWrapper}>
              <WhyLabsSwitch
                disabledTooltip="Loading..."
                label="Compare"
                size="lg"
                hideLabel
                onChange={toggleComparison()}
                checked={activeComparison}
                id="analysis-segment-comparison-switch"
              />
            </div>
          </div>
        ),
      },
      ...(activeComparison
        ? [
            {
              label: 'Comparison date picker',
              element: (
                <WhyLabsSuperDatePicker
                  key="segment-analysis-comparison-picker"
                  label="Date range"
                  loading={meta.loadingBatchFrequency}
                  timePeriod={meta.batchFrequency}
                  position="bottom-end"
                  presetsListPosition="end"
                  {...comparisonDatePickerParams}
                />
              ),
            },
          ]
        : []),
    ] satisfies WhyLabsHeaderSection[];
  }, [
    resourceType,
    metricsData,
    headerState.selectedPreset,
    headerState.primaryMetric,
    headerState.secondaryMetric,
    headerState.targetColumn,
    headerState.referenceThreshold,
    columnsList,
    shouldDisplayColumnSelect,
    isLoadingColumns,
    cx,
    classes.controlWrapper,
    classes.controlLabel,
    classes.switchWrapper,
    toggleComparison,
    activeComparison,
    meta.loadingBatchFrequency,
    meta.batchFrequency,
    handlePresetChange,
    manageSearchParams,
    setReferenceThresholdState,
  ]);

  return {
    generateHeaderSections,
  };
};
