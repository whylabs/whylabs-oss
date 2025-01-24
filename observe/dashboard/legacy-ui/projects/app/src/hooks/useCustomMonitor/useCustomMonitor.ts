import { Analyzer, Granularity, Monitor } from 'generated/monitor-schema';
import { MonitorSchema } from 'monitor-schema-types';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { generateFriendlyName } from 'utils/friendlyNames';
import { customMonitorAtom, customMonitorAtomDefaultState } from 'atoms/customMonitorAtom';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { timePeriodToGranularity } from 'adapters/monitor-adapters';
import { MetricSource, TimePeriod } from 'generated/graphql';
import {
  analyzerSegmentsToStateSegments,
  CustomMonitorState,
  getAnalyzerMetric,
  getBaseline,
  getNotificationsMode,
  getTargetMatrixData,
  getTypeBasedConfigProps,
  getUseCase,
  setActions,
  setSeverity,
} from './monitorUtils';
import {
  getDiscretenessSelection,
  getFeatureSelection,
  getNewAnalyzerConfig,
  getNewAnalyzerDiscretenessTags,
  getNewAnalyzerSelectionTags,
  getNewAnalyzerTargetMatrix,
} from './analyzerUtils';

export interface NewMonitorAndAnalyzer {
  monitor: Monitor;
  analyzer: Analyzer;
}

export interface PartialConfig {
  monitors: [Monitor];
  analyzers: [Analyzer];
}

interface useCustomMonitorReturnType {
  setMonitorDisplayName: (newString: string) => void;
  clearSelectedFeatures: () => void;
  generateNewMonitorId: () => void;
  setMonitorState: (analyzer: Analyzer, monitor?: Monitor) => void;
  resetMonitorState: () => void;
  getNewSchema: (schema: MonitorSchema) => MonitorSchema;
  getNewMonitorAndAnalyzer: (oldAnalyzer?: Analyzer, oldMonitor?: Monitor) => NewMonitorAndAnalyzer;
}

export const useCustomMonitor = (): useCustomMonitorReturnType => {
  const {
    resourceState: { resource },
  } = useResourceContext();
  const [customMonitor, setCustomMonitor] = useRecoilState(customMonitorAtom);
  const { includedFeatures } = customMonitor;

  const clearSelectedFeatures = useCallback(
    () =>
      setCustomMonitor(
        (prevState): CustomMonitorState => ({
          ...prevState,
          includedFeatures: [],
        }),
      ),
    [setCustomMonitor],
  );

  const setMonitorDisplayName = useCallback(
    (newMonitorDisplayName: string) =>
      setCustomMonitor(
        (prevState): CustomMonitorState => ({
          ...prevState,
          monitorDisplayName: newMonitorDisplayName,
        }),
      ),
    [setCustomMonitor],
  );

  const generateNewMonitorId = useCallback(() => {
    const newMonitorId = generateFriendlyName();
    setCustomMonitor(
      (prevState): CustomMonitorState => ({
        ...prevState,
        monitorId: newMonitorId,
        monitorDisplayName: newMonitorId,
      }),
    );
  }, [setCustomMonitor]);

  /*
   * Function called on edit a custom monitor via UI Builder
   */
  const setMonitorState = useCallback(
    // Extracting the new state
    (analyzer: Analyzer, monitor?: Monitor) =>
      setCustomMonitor((prevState): CustomMonitorState => {
        const granularity: Granularity = timePeriodToGranularity(resource?.batchFrequency ?? TimePeriod.P1D);
        const { config, id, tags } = analyzer;
        const newMonitorId = generateFriendlyName();
        const customPerfMetric = tags?.find((tag) => tag.includes('perfMetric'));
        const newState: CustomMonitorState = {
          ...prevState,
          metric: customPerfMetric ? customPerfMetric.replace('perfMetric:', '') : getAnalyzerMetric(config),
          ...getTypeBasedConfigProps(config),
          ...getBaseline(config, granularity),
          ...getUseCase(config, !!customPerfMetric),
          ...getTargetMatrixData(analyzer),
          ...getFeatureSelection(analyzer),
          ...getDiscretenessSelection(analyzer),
          ...setActions(monitor),
          ...setSeverity(monitor),
          metricMetadata: customPerfMetric
            ? { tags: ['performance'], source: MetricSource.UserDefined, queryDefinition: null }
            : undefined,
          notificationsMode: monitor?.mode.type ?? 'DIGEST',
          monitorDisplayName: monitor?.displayName || monitor?.id || newMonitorId,
          monitorId: monitor?.id || newMonitorId,
          analyzerId: id || '',
          segments: analyzerSegmentsToStateSegments(analyzer),
        };
        return newState;
      }),
    [resource?.batchFrequency, setCustomMonitor],
  );

  /*
   * Function called on save a custom monitor via UI Builder
   */
  const getNewMonitorAndAnalyzer = useCallback(
    (oldAnalyzer?: Analyzer, oldMonitor?: Monitor): NewMonitorAndAnalyzer => {
      const {
        analyzerId,
        monitorId,
        monitorDisplayName,
        granularity,
        discreteType = 'discrete',
        driftOption,
        featureSelection,
        useCase,
        alertSeverity,
        metricMetadata,
        metric,
        notificationsMode,
        actions,
        segments,
      } = customMonitor;
      const usedAnalyzerId = analyzerId || `${monitorId}-analyzer`;

      const newConfig = getNewAnalyzerConfig(customMonitor);
      const featureTargetingTags =
        useCase !== 'Model performance'
          ? [...getNewAnalyzerSelectionTags(featureSelection), ...getNewAnalyzerDiscretenessTags(discreteType)]
          : [];
      const perfMetricTag = metricMetadata ? [`perfMetric:${metric}`] : [];
      const newAnalyzer: Analyzer = {
        schedule: {
          type: 'fixed',
          cadence: granularity,
        },
        ...oldAnalyzer,
        id: usedAnalyzerId,
        targetMatrix: getNewAnalyzerTargetMatrix({
          includedFeatures,
          discreteType,
          newConfig,
          segments,
          driftOption,
          metricMetadata,
        }),
        config: newConfig,
        tags: [...featureTargetingTags, ...perfMetricTag],
      };
      const newMonitor: Monitor = {
        schedule: {
          type: 'immediate',
        },
        ...oldMonitor,
        mode: getNotificationsMode(notificationsMode, granularity),
        id: monitorId,
        displayName: monitorDisplayName,
        analyzerIds: [usedAnalyzerId],
        severity: alertSeverity,
        actions,
      };
      return { monitor: newMonitor, analyzer: newAnalyzer };
    },
    [customMonitor, includedFeatures],
  );

  /*
   * Function called on save a custom monitor via UI Builder
   */
  const getNewSchema = useCallback(
    (schema: MonitorSchema): MonitorSchema => {
      const schemaCopy: MonitorSchema = JSON.parse(JSON.stringify(schema));
      const { monitor, analyzer } = getNewMonitorAndAnalyzer();
      schemaCopy.monitors.push(monitor);
      schemaCopy.analyzers.push(analyzer);

      return schemaCopy;
    },
    [getNewMonitorAndAnalyzer],
  );

  const resetMonitorState = useCallback(
    () =>
      setCustomMonitor((prevState) => ({
        ...customMonitorAtomDefaultState,
        featuresQueryData: prevState.featuresQueryData,
      })),
    [setCustomMonitor],
  );

  return {
    setMonitorDisplayName,
    generateNewMonitorId,
    setMonitorState,
    resetMonitorState,
    getNewSchema,
    getNewMonitorAndAnalyzer,
    clearSelectedFeatures,
  };
};
