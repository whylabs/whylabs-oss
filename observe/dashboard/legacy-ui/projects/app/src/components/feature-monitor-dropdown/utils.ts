import { AnalysisDataFragment } from 'generated/graphql';
import { Monitor } from 'generated/monitor-schema';

export interface IMonitorDropdownList {
  monitorName?: string;
  monitorId?: string;
  analyzerId?: string;
}

export const mapAnalyzers = (
  modelId: string,
  analysis: AnalysisDataFragment[],
  monitors?: Monitor[],
): IMonitorDropdownList[] => {
  // map of analyzer IDs to monitor names for quick lookups
  const analyzerIdsToMonitorNames =
    monitors?.reduce((monitorMap, monitor) => {
      const { id: monitorId, displayName: monitorName } = monitor;
      if (!monitorId) {
        console.error(`Dataset ${modelId} has a monitor with no ID.`);
      }

      if (monitor.analyzerIds.length > 1) {
        // handling this case requires making the dropdown clear as to what *analyzer* is associated with each item in the dropdown,
        // because multiple analyzers could refer to the same *monitor*
        console.error(
          `Monitor ${monitorId} in dataset ${modelId} has more than one analyzer. This is not supported by the monitor selection dropdown.`,
        );
      }
      const analyzerId = monitor.analyzerIds[0];

      if (!analyzerId) {
        // no analyzers to add to the list
        return monitorMap;
      }
      // use monitor name if available, fall back to its ID
      monitorMap.set(analyzerId, {
        monitorName: monitorName ?? monitorId ?? 'Unknown monitor',
        monitorId,
        analyzerId,
      });
      return monitorMap;
    }, new Map<string, IMonitorDropdownList>()) ?? new Map<string, IMonitorDropdownList>();

  const allAnalyzerIDs = new Set<string>();
  analysis.forEach((a) => {
    if (a.analyzerId) {
      allAnalyzerIDs.add(a.analyzerId);
    }
  });

  return [...Array.from(allAnalyzerIDs)].map((analyzerId) => {
    const mappedAnalyzer = analyzerIdsToMonitorNames.get(analyzerId);
    return {
      // attempt to map analyzer ID to its monitor, if it still exists
      // if not - it's been deleted
      monitorId: mappedAnalyzer?.monitorId,
      monitorName: mappedAnalyzer?.monitorName ?? `Deleted monitor (${analyzerId})`,
      analyzerId,
    };
  });
};
