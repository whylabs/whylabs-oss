import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { atom, useRecoilState } from 'recoil';
import { TimePeriod } from 'generated/graphql';
import { CustomCardProps } from '../SummaryCard';
import { getAverageOverMidRange } from '../summaryCardUtils';
import GenericMetricPerformanceCard from './components/GenericMetricPerformanceCard';

interface LLMSecurityAtomState {
  securityMetricsList: { loading: boolean; metrics: string[] };
  weekAnomaliesCount: number;
  dayAnomaliesCount: number;
  batchFrequency: TimePeriod;
  mostAnomalousMetrics: [string, number][];
  loading: boolean;
}
export const llmSecurityCardAtom = atom<LLMSecurityAtomState>({
  key: 'llmSecurityCardAtom',
  default: {
    securityMetricsList: { loading: true, metrics: [] },
    weekAnomaliesCount: 0,
    dayAnomaliesCount: 0,
    mostAnomalousMetrics: [],
    batchFrequency: TimePeriod.P1D,
    loading: false,
  },
});

const LLMSecurityCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { getNavUrl } = useNavLinkHandler();

  const { modelId } = usePageTypeWithParams();
  const [
    { weekAnomaliesCount, dayAnomaliesCount, securityMetricsList, batchFrequency, mostAnomalousMetrics, loading },
  ] = useRecoilState(llmSecurityCardAtom);

  const anomaliesText = `Anomalies, previous batch profile`;
  const mountPrimaryTrend = () => ({
    label: anomaliesText,
    referencedNumber: getAverageOverMidRange(weekAnomaliesCount, batchFrequency),
    currentNumber: dayAnomaliesCount,
  });

  const mountAnomalousSection = () => ({
    list: mostAnomalousMetrics,
    label: `Security metrics with most anomalies`,
    link: getNavUrl({ modelId, page: 'dashboards', dashboards: { path: 'security' } }),
  });

  const mountOverallSection = () => ({
    label: (
      <>
        Metrics tagged: <strong>Security</strong>
      </>
    ),
    count: securityMetricsList?.metrics.length ?? 0,
  });
  const mountFooter = () => ({
    link: getNavUrl({ modelId, page: 'dashboards', dashboards: { path: 'security' } }),
    label: 'View security dashboard',
  });
  const totalLoading = securityMetricsList.loading || loading;
  return (
    <GenericMetricPerformanceCard
      customCard={customCard}
      id="llm-security-summary-card"
      loading={totalLoading}
      tooltip="A summary of anomaly counts for the model's security metrics within the specified time range"
      overallSection={mountOverallSection()}
      trendSection={mountPrimaryTrend()}
      anomalousListSection={mountAnomalousSection()}
      footer={mountFooter()}
      batchFrequency={batchFrequency}
    />
  );
};

export default LLMSecurityCard;
