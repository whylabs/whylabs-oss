import { Skeleton } from '@mantine/core';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useMemo } from 'react';
import { atom, useRecoilState } from 'recoil';

import { WhyLabsText } from 'components/design-system';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { TimePeriod } from 'generated/graphql';
import { labels } from 'strings/labels';
import TrendMetricSlot from '../model-summary-utils/TrendMetricSlot';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import LastDataBatch from './components/LastDataBatch';
import NoDataContent from './NoDataContent';
import { getAverageOverMidRange } from '../summaryCardUtils';

const COMMON_TEXTS = {
  anomaliesPreviousTitle: 'Anomalies, previous batch profile',
  dataVolumePreviousTitle: 'Data volume, previous batch profile',
};

const FILE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    cardTooltip:
      "A summary of relevant metrics and anomaly counts for the dataset's columns within the specified time range",
    featureTitle: 'Columns',
    footerLinkText: 'View dataset columns',
  },
  MODEL: {
    ...COMMON_TEXTS,
    cardTooltip:
      "A summary of relevant metrics and anomaly counts for the model's input features within the specified time range",
    featureTitle: 'Features',
    footerLinkText: 'View model inputs',
  },
  LLM: {
    ...COMMON_TEXTS,
    cardTooltip:
      "A summary of relevant information and anomaly counts for the model's metrics within the specified time range",
    featureTitle: 'Metrics',
    footerLinkText: 'View telemetry',
  },
};

interface InputHealthAtomState {
  weekInput: { loading: boolean; dataVolume: number };
  dayInput: { loading: boolean; dataVolume: number };
  weekInputAlerts: { loading: boolean; alerts: number };
  dayInputAlerts: { loading: boolean; alerts: number; features: number };
  latestTimeStamp: { loading: boolean; timestamp: number };
  batchFrequency: TimePeriod;
}
export const inputHealthCardAtom = atom<InputHealthAtomState>({
  key: 'inputHealthCardAtom',
  default: {
    weekInput: { loading: false, dataVolume: 0 },
    dayInput: { loading: false, dataVolume: 0 },
    weekInputAlerts: { loading: false, alerts: 0 },
    dayInputAlerts: { loading: false, alerts: 0, features: 0 },
    latestTimeStamp: { loading: false, timestamp: 0 },
    batchFrequency: TimePeriod.P1D,
  },
});

const InputHealthCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { resourceTexts } = useResourceText(FILE_TEXTS);
  const { getNavUrl } = useNavLinkHandler();

  const { modelId } = usePageTypeWithParams();
  const [{ weekInput, dayInput, weekInputAlerts, dayInputAlerts, latestTimeStamp, batchFrequency }] =
    useRecoilState(inputHealthCardAtom);

  // display no data!
  const noData = !dayInputAlerts.loading && dayInputAlerts.features === 0;
  const noDataInRangeOnly = !noData && latestTimeStamp.timestamp === 0;

  const renderNoData = () => {
    return <NoDataContent displayText={labels.summary.no_data} />;
  };

  const renderContent = () => {
    return (
      <>
        <WhyLabsText inherit className={styles.contentTxt}>
          {resourceTexts.featureTitle}
        </WhyLabsText>
        {dayInputAlerts.loading ? (
          <Skeleton variant="text" height={38} width={40} animate />
        ) : (
          <WhyLabsText inherit className={styles.largeInfo}>
            {dayInputAlerts.features}
          </WhyLabsText>
        )}
        <div className={styles.contentSpacer} />
        <TrendMetricSlot
          title={resourceTexts.anomaliesPreviousTitle}
          referencedNumber={getAverageOverMidRange(weekInputAlerts.alerts, batchFrequency)}
          currentNumber={dayInputAlerts.alerts}
          loading={weekInputAlerts.loading || dayInputAlerts.loading}
          reverseColor
          batchFrequency={batchFrequency}
        />
        <hr className={styles.cardDivider} />
        <TrendMetricSlot
          title={resourceTexts.dataVolumePreviousTitle}
          referencedNumber={getAverageOverMidRange(weekInput.dataVolume, batchFrequency)}
          currentNumber={dayInput.dataVolume}
          loading={weekInput.loading || dayInput.loading}
          forceRed
          batchFrequency={batchFrequency}
        />
        <hr className={styles.cardDivider} />
        <LastDataBatch {...latestTimeStamp} />
      </>
    );
  };

  const modelUrl = useMemo(() => {
    return getNavUrl({ page: 'columns', modelId });
  }, [getNavUrl, modelId]);

  const footer: SummaryCardFooterProps = {
    footerLink: noData ? '' : modelUrl,
    footerTxt: noData ? '' : resourceTexts.footerLinkText,
    footerIcon: true,
  };

  return (
    <SummaryCard
      customCard={customCard}
      cardTooltip={resourceTexts.cardTooltip}
      footer={footer}
      id="input-health-card"
      cardLoading={
        weekInput.loading &&
        dayInput.loading &&
        weekInputAlerts.loading &&
        dayInputAlerts.loading &&
        latestTimeStamp.loading
      }
      loadingCardHeight={411}
    >
      {noData || noDataInRangeOnly ? renderNoData() : renderContent()}
    </SummaryCard>
  );
};

export default InputHealthCard;
