import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { atom, useRecoilState } from 'recoil';
import { TimePeriod } from 'generated/graphql';
import { CustomCardProps } from '../SummaryCard';
import { getAverageOverMidRange } from '../summaryCardUtils';
import GenericMetricPerformanceCard from './components/GenericMetricPerformanceCard';

interface LLMPerformanceAtomState {
  performanceMetricsList: { loading: boolean; metrics: string[] };
  weekAnomaliesCount: number;
  dayAnomaliesCount: number;
  mostAnomalousMetrics: [string, number][];
  batchFrequency: TimePeriod;
  loading: boolean;
}
export const llmPerformanceCardAtom = atom<LLMPerformanceAtomState>({
  key: 'llmPerformanceCardAtom',
  default: {
    performanceMetricsList: { loading: true, metrics: [] },
    weekAnomaliesCount: 0,
    dayAnomaliesCount: 0,
    mostAnomalousMetrics: [],
    batchFrequency: TimePeriod.P1D,
    loading: false,
  },
});

const LLMPerformanceCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { getNavUrl } = useNavLinkHandler();

  const { modelId } = usePageTypeWithParams();
  const [
    { performanceMetricsList, weekAnomaliesCount, dayAnomaliesCount, batchFrequency, mostAnomalousMetrics, loading },
  ] = useRecoilState(llmPerformanceCardAtom);

  const anomaliesText = `Anomalies, previous batch profile`;
  const mountPrimaryTrend = () => ({
    label: anomaliesText,
    referencedNumber: getAverageOverMidRange(weekAnomaliesCount, batchFrequency),
    currentNumber: dayAnomaliesCount,
  });
  const mountAnomalousSection = () => ({
    list: mostAnomalousMetrics,
    label: `Performance metrics with most anomalies`,
    link: getNavUrl({ modelId, page: 'dashboards', dashboards: { path: 'performance' } }),
  });

  const mountOverallSection = () => ({
    label: (
      <>
        Metrics tagged: <strong>Performance</strong>
      </>
    ),
    count: performanceMetricsList?.metrics.length ?? 0,
  });
  const mountFooter = () => ({
    link: getNavUrl({ modelId, page: 'dashboards', dashboards: { path: 'performance' } }),
    label: 'View performance dashboard',
  });
  const totalLoading = performanceMetricsList.loading || loading;
  return (
    <GenericMetricPerformanceCard
      customCard={customCard}
      id="llm-performance-summary-card"
      loading={totalLoading}
      tooltip="A summary of anomaly counts for the model's performance metrics within the specified time range"
      overallSection={mountOverallSection()}
      trendSection={mountPrimaryTrend()}
      anomalousListSection={mountAnomalousSection()}
      footer={mountFooter()}
      batchFrequency={batchFrequency}
    />
  );
};

export default LLMPerformanceCard;
