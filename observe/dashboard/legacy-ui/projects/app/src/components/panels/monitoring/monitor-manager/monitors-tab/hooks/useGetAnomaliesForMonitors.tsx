import { useEffect, useMemo } from 'react';
import { useGetAnomaliesForMonitorListLazyQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ApolloError } from '@apollo/client';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

interface GetAnomaliesReturn {
  loading: boolean;
  data: Map<string, Map<number, number>> | undefined;
  error: ApolloError | undefined;
}

export default function useGetAnomaliesForMonitors(monitorIDs: string[]): GetAnomaliesReturn {
  const { modelId } = usePageTypeWithParams();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const [getMonitorAnomalies, { data, loading, error }] = useGetAnomaliesForMonitorListLazyQuery({
    variables: { datasetId: modelId, monitorIDs, fromTimestamp: dateRange.from, toTimestamp: dateRange.to },
  });

  const totalLoading = loading || loadingDateRange;

  const anomalyMap = useMemo(() => {
    const { analysisResults } = data ?? {};
    if (!analysisResults) {
      return undefined;
    }

    // map of monitorId -> map of timestamp -> anomalyCount
    const monitorAnomalyMap = new Map<string, Map<number, number>>();

    analysisResults.forEach((analysis) => {
      const { monitorIds, datasetTimestamp } = analysis;
      if (!monitorIds?.length) {
        console.error('Anomaly is missing monitor IDs. This should not happen. analysisId: ', analysis.analysisId);
        return;
      }

      if (datasetTimestamp == null) {
        console.error('Anomaly is missing datasetTimestamp, analysisId: ', analysis.analysisId);
        return;
      }

      monitorIds.forEach((monitorId) => {
        const timestampCountMap = monitorAnomalyMap.get(monitorId);

        // If we dont have analysis entry create default one
        if (!timestampCountMap) {
          const defaultTimestampCount = new Map<number, number>();
          defaultTimestampCount.set(datasetTimestamp, 1);

          monitorAnomalyMap.set(monitorId, defaultTimestampCount);
          return;
        }

        const count = timestampCountMap.get(datasetTimestamp) ?? 0;
        timestampCountMap.set(datasetTimestamp, count + 1);
      });
    });

    return monitorAnomalyMap;
  }, [data]);

  useEffect(() => {
    if (monitorIDs.length && !loadingDateRange) {
      getMonitorAnomalies();
    }
  }, [getMonitorAnomalies, loadingDateRange, monitorIDs.length]);

  return {
    loading: totalLoading,
    data: anomalyMap,
    error,
  };
}
