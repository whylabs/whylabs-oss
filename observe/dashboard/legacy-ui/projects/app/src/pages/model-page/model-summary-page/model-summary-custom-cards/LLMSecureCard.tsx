import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { atom, useRecoilState } from 'recoil';

import { WhyLabsText } from 'components/design-system';
import { TimePeriod } from 'generated/graphql';
import { useMountLlmSecureUrl } from 'hooks/useNewStackLinkHandler';
import TrendMetricSlot from '../model-summary-utils/TrendMetricSlot';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import LastDataBatch from './components/LastDataBatch';
import { getAverageOverMidRange } from '../summaryCardUtils';

interface InputHealthAtomState {
  isSecuredLlm: boolean;
  loading: boolean;
  tracesInRange: number;
  shortRangeData: {
    violationsCount: number;
    blockedInteractionsCount: number;
  };
  midRangeData: {
    violationsCount: number;
    blockedInteractionsCount: number;
  };
  latestTraceTimestamp?: number | null;
  batchFrequency?: TimePeriod;
}
export const llmSecureCardAtom = atom<InputHealthAtomState>({
  key: 'llmSecureCardAtom',
  default: {
    isSecuredLlm: false,
    loading: true,
    tracesInRange: 0,
    shortRangeData: {
      violationsCount: 0,
      blockedInteractionsCount: 0,
    },
    midRangeData: {
      violationsCount: 0,
      blockedInteractionsCount: 0,
    },
    latestTraceTimestamp: null,
  },
});

const LLMSecureCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { mountLlmTracesUrl } = useMountLlmSecureUrl();
  const { modelId } = usePageTypeWithParams();
  const [data] = useRecoilState(llmSecureCardAtom);
  const { loading, shortRangeData, midRangeData, tracesInRange, latestTraceTimestamp } = data;
  const batchFrequency = data.batchFrequency ?? TimePeriod.P1D;

  const policyText = `Policy violations, previous batch profile`;
  const blockedInteractionsText = `Blocked interactions, previous batch profile`;
  const renderContent = () => {
    return (
      <>
        <WhyLabsText inherit className={styles.contentTxt}>
          Traces in range
        </WhyLabsText>
        <WhyLabsText inherit className={styles.largeInfo}>
          {tracesInRange.toLocaleString()}
        </WhyLabsText>
        <div className={styles.contentSpacer} />
        <TrendMetricSlot
          title={policyText}
          currentNumber={shortRangeData.violationsCount}
          referencedNumber={getAverageOverMidRange(midRangeData.violationsCount, batchFrequency)}
          loading={loading}
          reverseColor
          batchFrequency={batchFrequency}
        />
        <hr className={styles.cardDivider} />
        <TrendMetricSlot
          title={blockedInteractionsText}
          titleClassName={styles.shortLetterSpace}
          currentNumber={shortRangeData.blockedInteractionsCount}
          referencedNumber={getAverageOverMidRange(midRangeData.blockedInteractionsCount, batchFrequency)}
          loading={loading}
          reverseColor
          batchFrequency={batchFrequency}
        />
        <hr className={styles.cardDivider} />
        <LastDataBatch
          loading={loading}
          timestamp={latestTraceTimestamp}
          label="Last trace received"
          noTimestampLabel="No traces found"
        />
      </>
    );
  };

  const footer: SummaryCardFooterProps = {
    footerTxt: 'View LLM Secure dashboard',
    footerHandler: () => {
      window.location.href = mountLlmTracesUrl(modelId);
    },
    footerIcon: true,
  };

  return (
    <SummaryCard
      customCard={customCard}
      cardTooltip=""
      footer={footer}
      id="input-health-card"
      cardLoading={loading}
      loadingCardHeight={411}
      displaySecureTopBorder
    >
      {renderContent()}
    </SummaryCard>
  );
};

export default LLMSecureCard;
