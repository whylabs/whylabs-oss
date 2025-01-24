import DonutChart from 'components/visualizations/donut-chart/DonutChart';
import { AnomalyCountsCommonFieldsFragment, GetAnomalyDataQuery, Maybe, TimePeriod } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { atom, useRecoilState } from 'recoil';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { createCommonTexts } from 'strings/commonTexts';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { WhyLabsText } from 'components/design-system';
import TrendMetricSlot from '../model-summary-utils/TrendMetricSlot';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import LastDataBatch from './components/LastDataBatch';
import NoDataContent from './NoDataContent';
import { getAverageOverMidRange } from '../summaryCardUtils';

const COMMON_TEXTS = createCommonTexts({
  activeMonitorsTitle: 'Active monitors',
  enableMonitors: 'Enable monitors',
  lastBatchLabel: 'Anomalies by type, last profile analyzed:',
  totalAnomaliesTitle: 'Total anomalies, previous batch profile',
  viewAnomalyList: 'View anomaly feed',
});
const FILE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    cardTooltip: 'A roll-up of anomalies for the dataset within the specified time range',
  },
  MODEL: {
    ...COMMON_TEXTS,
    cardTooltip: 'A roll-up of anomalies for the model within the specified time range',
  },
  LLM: {
    ...COMMON_TEXTS,
    cardTooltip: 'A roll-up of anomalies for the model within the specified time range',
  },
};

type AnomalyQuery = Exclude<GetAnomalyDataQuery, null | undefined>;
type AnomalyCounts = Maybe<AnomalyCountsCommonFieldsFragment> | undefined;

type AnomalySummaryCardAtomState = Pick<AnomalyQuery, 'daily' | 'weekly'> & {
  activeMonitors: number;
  loading: boolean;
  batchFrequency: TimePeriod;
};

export const anomalySummaryCardAtom = atom<AnomalySummaryCardAtomState>({
  key: 'anomalySummaryCardAtom',
  default: {
    activeMonitors: 0,
    daily: null,
    loading: false,
    weekly: null,
    batchFrequency: TimePeriod.P1D,
  },
});

const AnomalySummaryCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { modelId } = usePageTypeWithParams();
  const { getNavUrl } = useNavLinkHandler();
  const [{ activeMonitors, daily, loading, weekly, batchFrequency }] = useRecoilState(anomalySummaryCardAtom);

  const { resourceTexts } = useResourceText(FILE_TEXTS);

  const footer: SummaryCardFooterProps =
    activeMonitors > 0
      ? {
          footerTxt: resourceTexts.viewAnomalyList,
          footerLink: getNavUrl({ page: 'monitorManager', modelId, monitorManager: { path: 'anomalies-feed' } }),
          footerLinkNewTab: false,
          footerIcon: true,
        }
      : {
          footerTxt: resourceTexts.enableMonitors,
          footerLink: getNavUrl({ page: 'monitorManager', modelId, monitorManager: { path: 'presets' } }),
          footerLinkNewTab: false,
          footerIcon: true,
        };

  return (
    <SummaryCard
      cardLoading={loading}
      cardTooltip={resourceTexts.cardTooltip}
      customCard={customCard}
      loadingCardHeight={272}
      footer={footer}
    >
      <TrendMetricSlot
        currentNumber={getAnomaliesSumFrom(daily?.anomalyCounts)}
        dataUnits="anomalies"
        referencedNumber={getAverageOverMidRange(getAnomaliesSumFrom(weekly?.anomalyCounts), batchFrequency)}
        reverseColor
        title={resourceTexts.totalAnomaliesTitle}
        batchFrequency={batchFrequency}
      />
      <div className={styles.contentSpacer} />
      <TrendMetricSlot
        currentNumber={activeMonitors}
        dataUnits="anomalies"
        hideSummary
        referencedNumber={0}
        title={resourceTexts.activeMonitorsTitle}
        batchFrequency={batchFrequency}
      />
      {renderAnomaliesByType()}
      <hr className={styles.cardDivider} />
      <LastDataBatch timestamp={daily?.dataAvailability?.latestTimestamp ?? 0} />
    </SummaryCard>
  );

  function renderAnomaliesByType() {
    const data = daily?.anomalyCounts?.totals?.map(({ category, count }) => ({
      name: category.replace(/([A-Z])/g, ' $1').trim(),
      category,
      value: count,
    }));

    if (!data?.length) {
      return <NoDataContent displayText={resourceTexts.noAnomalies} />;
    }
    return (
      <>
        <hr className={styles.cardDivider} />
        <WhyLabsText inherit className={styles.contentSubtitle}>
          {resourceTexts.lastBatchLabel}
        </WhyLabsText>
        <DonutChart
          custom={{
            container: { height: 140 },
            pie: {
              innerRadius: 20,
              isAnimationActive: false,
              outerRadius: 34,
            },
          }}
          data={data}
        />
      </>
    );
  }

  function getAnomaliesSumFrom(counts: AnomalyCounts) {
    if (!counts?.totals?.length) return 0;

    return counts.totals.reduce((sum, curr) => sum + curr.count, 0);
  }
};
export default AnomalySummaryCard;
