import {
  changeTypeOptions,
  dataDriftOptions,
  dataQualityOptions,
  dataQualityTypeOfChange,
  monitorBaselineOptions,
  notificationsModeOptions,
  severityOptions,
  useCaseOptions,
} from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';
import { atom } from 'recoil';
import { CustomMonitorState, getDefaultTimeRange } from '../hooks/useCustomMonitor/monitorUtils';

const DEFAULT_DRIFT_CONFIG = {
  algorithm: 'hellinger',
  threshold: 0.7,
} as const;

export const customMonitorAtomDefaultState: CustomMonitorState = {
  monitorId: '',
  analyzerId: '',
  monitorDisplayName: '',
  granularity: 'daily',
  useCase: useCaseOptions[0].value,
  metric: 'frequent_items',
  metricMetadata: undefined,
  discreteType: 'both',
  driftOption: dataDriftOptions[1].value,
  driftThreshold: DEFAULT_DRIFT_CONFIG.threshold,
  driftAlgorithm: DEFAULT_DRIFT_CONFIG.algorithm,
  featuresQueryData: undefined,
  includedFeatures: [],
  featureSelection: 'all',
  modelPerformanceConfig: changeTypeOptions[0].label,
  thresholdPct: 10,
  thresholdAbs: undefined,
  upper: undefined,
  lower: undefined,
  factor: undefined,
  usedBaseline: monitorBaselineOptions[0].value,
  baselineWindowSize: undefined,
  baselineProfileId: undefined,
  baselineRange: getDefaultTimeRange(),
  alertSeverity: severityOptions[0].value,
  notificationsMode: notificationsModeOptions[0].value,
  actions: [],
  segments: [],
  dataQualityOption: dataQualityOptions[0].value,
  dataQualityChange: dataQualityTypeOfChange[0].value,
};

export const customMonitorAtom = atom<CustomMonitorState>({
  key: 'customMonitorAtom',
  default: customMonitorAtomDefaultState,
});
