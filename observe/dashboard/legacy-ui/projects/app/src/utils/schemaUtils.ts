import { Maybe } from 'graphql/jsutils/Maybe';
import { MonitorSchema } from 'monitor-schema-types';

export const stringToSchema = (string: Maybe<string>): MonitorSchema | undefined => {
  if (string) {
    const parsed = JSON.parse(string);
    if (isMonitorSchema(parsed)) {
      return parsed;
    }
    console.log(`Failed to correctly parse schema: ${string}`);
  }

  return undefined;
};

export function getAnalyzerMetric(
  analyzer: string | undefined,
  monitorConfig: MonitorSchema | undefined,
): string | undefined {
  if (analyzer && monitorConfig) {
    const config = monitorConfig.analyzers.find((a) => a.id === analyzer)?.config;
    if (config && 'metric' in config) {
      return config.metric;
    }
  }
  return undefined;
}

function isMonitorSchema(maybeMonitorSchema: Record<string, unknown>): maybeMonitorSchema is MonitorSchema {
  if (
    'orgId' in maybeMonitorSchema &&
    'datasetId' in maybeMonitorSchema &&
    'granularity' in maybeMonitorSchema &&
    'analyzers' in maybeMonitorSchema &&
    'monitors' in maybeMonitorSchema
  ) {
    return true;
  }

  return false;
}
