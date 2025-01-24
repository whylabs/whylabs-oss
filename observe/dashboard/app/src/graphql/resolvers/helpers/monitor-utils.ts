import { Monitor } from '../../../schemas/generated/monitor-schema';
import { PartialMonitorConfig } from '../../../services/data/monitor/coverage';
import { AnalysisTargetLevel } from '../../generated/graphql';
import { MonitorMetric } from '../types/metrics';

type MonitorWithId = Monitor & { id: string };

const getDriftMonitor = ({ displayName, id: monitorId }: MonitorWithId): MonitorMetric => {
  const label = `Drift - ${displayName || monitorId}`;
  return {
    group: 'Drift Monitors',
    label,
    metricField: 'drift_metricValue',
    monitorId,
    source: 'Monitors',
    timestampField: 'datasetTimestamp',
    value: `${monitorId}.drift`,
  };
};

const getStddevMonitor = ({
  displayName,
  id: monitorId,
  type,
}: MonitorWithId & { type: 'Lower' | 'Upper' }): MonitorMetric => {
  return {
    group: 'Stddev Monitors',
    monitorId,
    source: 'Monitors',
    timestampField: 'datasetTimestamp',
    label: `Stddev ${type} - ${displayName || monitorId}`,
    metricField: `threshold_calculated${type}`,
    value: `${monitorId}.stddev.${type.toLowerCase()}`,
  };
};

const getAnomalyCountMonitor = ({ displayName, id: monitorId }: MonitorWithId): MonitorMetric => {
  const label = `Anomaly Counts - ${displayName || monitorId}`;
  return {
    disableSegments: true,
    group: 'Anomaly Counts',
    label,
    metricField: 'anomalyCount',
    monitorId,
    source: 'Monitors',
    targetLevel: AnalysisTargetLevel.Dataset,
    timestampField: 'timestamp',
    value: `${monitorId}.anomaly`,
  };
};

export const getMonitorMetricsFromMonitorConfig = (monitorConfig: PartialMonitorConfig | null): MonitorMetric[] => {
  if (!monitorConfig?.analyzers) return [];

  const driftMonitors: MonitorMetric[] = [];
  const anomalyCountMonitors: MonitorMetric[] = [];
  const stddevMonitors: MonitorMetric[] = [];

  monitorConfig.analyzers.forEach((analyzer) => {
    const analyzerId = analyzer.id;
    if (!analyzerId) return;

    monitorConfig.monitors?.forEach((mo) => {
      if (!mo.id || !mo.analyzerIds.includes(analyzerId)) return;

      // TS can't figure out that monitor.id isn't undefined at this point
      const monitor: MonitorWithId = { ...mo, id: mo.id };

      anomalyCountMonitors.push(getAnomalyCountMonitor(monitor));

      if (analyzer.config.type === 'drift') {
        driftMonitors.push(getDriftMonitor(monitor));
      } else if (analyzer.config.type === 'stddev') {
        stddevMonitors.push(getStddevMonitor({ ...monitor, type: 'Upper' }));
        stddevMonitors.push(getStddevMonitor({ ...monitor, type: 'Lower' }));
      }
    });
  });

  return [...driftMonitors, ...anomalyCountMonitors, ...stddevMonitors];
};
