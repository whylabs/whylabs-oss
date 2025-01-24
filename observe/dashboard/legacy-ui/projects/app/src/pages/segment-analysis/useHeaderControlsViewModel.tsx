import { useSearchParams } from 'react-router-dom';
import {
  ACTIVE_COMPARISON,
  METRICS_PRESET,
  PRIMARY_METRIC,
  SECONDARY_METRIC,
  SELECTED_COLUMN_QUERY_NAME,
  THRESHOLD_QUERY_NAME,
} from 'types/navTags';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { useCallback, useEffect, useState } from 'react';
import { CUSTOM_RANGE, dateConstructorToReadableISOString } from 'components/super-date-picker/utils';
import { useDebouncedState } from '@mantine/hooks';
import { WhyLabsHeaderSection } from 'components/panels/header/WhyLabsHeader';
import { WhyLabsSwitch } from 'components/design-system';
import { WhyLabsSuperDatePicker } from 'components/super-date-picker/WhyLabsSuperDatePicker';
import { ModelType } from 'generated/graphql';
import { isValidNumber } from 'utils/typeGuards';
import { MainStackEvents } from 'hooks/useStackCustomEventListeners';
import { useSegmentAnalysisViewModel } from './useSegmentAnalysisViewModel';
import {
  comparisonDatePickerParams,
  convertStringToPresetName,
  getInputTooltip,
  getPresetMetrics,
  getPresetMetricsScope,
  getResourcePresets,
  requireColumnSelection,
  SEGMENT_ANALYSIS_IFRAME,
  TracingPreset,
  translateColumnsSelectData,
  translateMetricSelectData,
} from './utils';

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

type HookReturnType = {
  generateHeaderSections: () => WhyLabsHeaderSection[];
};

/*
 * This hook is being copied from dashbird-ui due to iframe limitations,
 * if we fix some bug here, would be a good idea to replicate the code there as well
 * */
export type HeaderControlsProps = {
  pageViewModel: ReturnType<typeof useSegmentAnalysisViewModel>;
};
export const useHeaderControlsViewModel = ({ pageViewModel }: HeaderControlsProps): HookReturnType => {
  const {
    meta,
    getHeaderControlsState,
    comparePickerHasFallbackRange,
    globalDateRange,
    metricsData,
    metricsDataLoading,
  } = pageViewModel;
  const { classes, cx } = useStyles();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeComparison = !!searchParams.get(ACTIVE_COMPARISON);
  const { resourceType, columns } = meta;
  const headerState = getHeaderControlsState(resourceType ?? null, metricsData);

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
      const metrics = getPresetMetrics(resourceType ?? null, tracingPreset);
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

  const queryParamReferenceThreshold = searchParams.get(THRESHOLD_QUERY_NAME);
  const [fallbackThreshold, setFallbackThreshold] = useState<number | null>(null);
  const [referenceThresholdState, setReferenceThreshold] = useDebouncedState<string | null>(
    queryParamReferenceThreshold,
    350,
  );

  const thresholdChangeHandler = useCallback(
    (newValue: string | null) => {
      setReferenceThreshold(newValue);
      if (!newValue) setFallbackThreshold(null);
      const iframe = document.getElementById(SEGMENT_ANALYSIS_IFRAME) as HTMLIFrameElement | null;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow?.dispatchEvent(
        new CustomEvent(MainStackEvents.RefThresholdChange, { detail: { value: newValue } }),
      );
    },
    [setReferenceThreshold, setFallbackThreshold],
  );

  const fallbackThresholdHandler = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent;
      const { page, value } = customEvent.detail;
      if (page === 'segment-analysis') {
        if (isValidNumber(value)) {
          setFallbackThreshold(value);
        }
      }
    },
    [setFallbackThreshold],
  );

  useEffect(() => {
    window.document.addEventListener(MainStackEvents.RefThresholdChange, fallbackThresholdHandler);
    return () => {
      window.document.addEventListener(MainStackEvents.RefThresholdChange, fallbackThresholdHandler);
    };
  }, [fallbackThresholdHandler]);

  const usedPrimaryMetric = metricsData.find((m) => m.label === headerState.primaryMetric) ?? null;
  const usedSecondaryMetric = metricsData.find((m) => m.label === headerState.secondaryMetric) ?? null;
  const shouldDisplayColumnSelect =
    requireColumnSelection(usedPrimaryMetric) || requireColumnSelection(usedSecondaryMetric);

  if (referenceThresholdState !== queryParamReferenceThreshold) {
    manageSearchParams([{ key: THRESHOLD_QUERY_NAME, value: referenceThresholdState }]);
  }

  const generateHeaderSections = useCallback((): WhyLabsHeaderSection[] => {
    const isNotLlm = resourceType !== ModelType.Llm;
    const presets = getResourcePresets(resourceType ?? null, metricsData);
    const usedPreset = headerState.selectedPreset ?? TracingPreset.custom;
    const metricsScope = getPresetMetricsScope(usedPreset);
    const data = translateMetricSelectData(metricsData, metricsScope);
    const columnsSelectData = translateColumnsSelectData(columns.columnsList ?? []);
    return [
      ...(presets?.length && isNotLlm
        ? ([
            {
              label: 'Preset select',
              inputs: [
                {
                  kind: 'select',
                  key: 'preset-selector',
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
          ] as WhyLabsHeaderSection[])
        : []),
      {
        label: 'Primary metric',
        inputs: [
          {
            kind: 'select',
            key: 'primary-metric-selector',
            width: 190,
            inputTooltip: getInputTooltip(headerState?.primaryMetric),
            props: {
              data: data.filter((m) => m.value !== headerState.secondaryMetric),
              loading: metricsDataLoading,
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
            key: 'secondary-metric-selector',
            width: 190,
            inputTooltip: getInputTooltip(headerState?.secondaryMetric),
            props: {
              data: data.filter((m) => m.value !== headerState.primaryMetric),
              loading: metricsDataLoading,
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
                  key: 'column-selector',
                  width: 190,
                  inputTooltip: getInputTooltip(headerState?.targetColumn),
                  props: {
                    data: columnsSelectData,
                    loading: columns.isLoadingColumns,
                    placeholder: 'Select column',
                    label: 'Column',
                    value: headerState.targetColumn,
                    onChange: (value) => manageSearchParams([{ key: SELECTED_COLUMN_QUERY_NAME, value }]),
                    withinPortal: true,
                  },
                },
              ],
            },
          ] as WhyLabsHeaderSection[])
        : []),
      {
        label: 'Reference threshold',
        dividerAfter: true,
        inputs: [
          {
            kind: 'numberInput',
            width: 190,
            key: 'threshold-input',
            inputTooltip:
              isValidNumber(headerState.referenceThreshold) || fallbackThreshold === null
                ? ''
                : 'A default reference threshold is calculated based on the primary metric value',
            props: {
              step: 0.1,
              placeholder: 'Type a number',
              label: 'Reference threshold',
              precision: 2,
              value:
                (isValidNumber(headerState.referenceThreshold) ? headerState.referenceThreshold : undefined) ??
                fallbackThreshold ??
                '',
              onChange: (value) => thresholdChangeHandler(value?.toString() || null),
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
                  shouldTruncateRangeIfNeeded
                  {...comparisonDatePickerParams}
                />
              ),
            },
          ]
        : []),
    ];
  }, [
    resourceType,
    metricsData,
    headerState.selectedPreset,
    headerState.primaryMetric,
    headerState.secondaryMetric,
    headerState.targetColumn,
    headerState.referenceThreshold,
    columns.columnsList,
    columns.isLoadingColumns,
    metricsDataLoading,
    shouldDisplayColumnSelect,
    fallbackThreshold,
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
    thresholdChangeHandler,
  ]);

  return {
    generateHeaderSections,
  };
};
