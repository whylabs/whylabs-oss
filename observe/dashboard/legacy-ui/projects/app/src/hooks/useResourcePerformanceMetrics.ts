import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { DatasetMetricsInfoFragment, useGetModelMonitorMetricsQuery } from 'generated/graphql';
import { atom, useRecoilState } from 'recoil';
import { ONE_MINUTE_IN_MILLIS } from 'ui/constants';

const CACHE_TTL = ONE_MINUTE_IN_MILLIS;
type PerformanceMetricsCacheType = {
  lastFetch: number;
  data: DatasetMetricsInfoFragment['datasetMetrics'];
  datasetId: string;
};
const performanceMetricsCache = atom<PerformanceMetricsCacheType | undefined>({
  default: undefined,
  key: 'PerformanceMetricsCacheAtom',
});

interface ResourcePerformanceMetricsType {
  metrics: DatasetMetricsInfoFragment['datasetMetrics'];
  loading?: boolean;
}
export const useResourcePerformanceMetrics = (): ResourcePerformanceMetricsType => {
  const { modelId: datasetId } = usePageTypeWithParams();
  const [metrics, setMetrics] = useRecoilState(performanceMetricsCache);
  const cacheLimit = new Date().getTime() - CACHE_TTL;
  const skip = metrics && metrics.lastFetch >= cacheLimit && metrics.datasetId === datasetId;
  const { data, error, loading } = useGetModelMonitorMetricsQuery({ variables: { datasetId }, skip });
  const allMetrics = data?.model?.datasetMetrics;
  if (error) {
    console.log('error fetching performance metrics', error);
  }
  if (allMetrics && allMetrics !== metrics?.data) {
    setMetrics({ lastFetch: new Date().getTime(), data: allMetrics, datasetId });
  }
  return {
    metrics: loading ? undefined : [...(metrics?.data ?? [])],
    loading,
  };
};
