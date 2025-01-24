import { AlgorithmType } from 'generated/monitor-schema';
import { MonitorCreationTags } from 'hooks/useCustomMonitor/analyzerTags';
import { availableMetrics, MetricTypeInUse, supportedAnalyzerTypesUI } from '../custom-monitor/CustomMonitorTypes';

/**
 * Checks if UI supports passed metric
 * This function is ussualy used to determine if we can edit certain monitors in through AI
 * @param metric
 * @returns
 */
export const isWhiteList = (metric: string): boolean => {
  return availableMetrics.includes(metric as MetricTypeInUse);
};

export const isUnsupportedConfig = (metric: string, monitorTags: string[], type?: AlgorithmType): boolean => {
  if (monitorTags.includes(MonitorCreationTags.JSON)) return true;
  const isCustomMetric = monitorTags.find((tag) => tag.includes('perfMetric'));
  if (!isCustomMetric && !isWhiteList(metric)) return true;
  return type ? !supportedAnalyzerTypesUI.includes(type) : false;
};
