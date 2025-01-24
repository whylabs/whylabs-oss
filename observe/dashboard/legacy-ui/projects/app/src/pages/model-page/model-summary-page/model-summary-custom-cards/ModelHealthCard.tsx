import { Skeleton } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useMemo } from 'react';
import { atom, useRecoilState } from 'recoil';
import { labels } from 'strings/labels';
import { TimePeriod } from 'generated/graphql';
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
    cardTitle: 'Output Columns',
    cardTooltip: 'A summary of relevant metrics and anomaly counts for the dataset within the specified time range',
    featureTitle: 'Columns',
    footerLinkText: '',
  },
  MODEL: {
    ...COMMON_TEXTS,
    cardTitle: 'Output Features',
    cardTooltip:
      "A summary of relevant metrics and anomaly counts for the model's outputs (predictions) within the specified time range",
    featureTitle: 'Features',
    footerLinkText: 'View model outputs',
  },
  LLM: {
    ...COMMON_TEXTS,
    cardTitle: 'Metrics',
    cardTooltip:
      "A summary of relevant information and anomaly counts for the model's metrics within the specified time range",
    featureTitle: 'Metrics',
    footerLinkText: 'View model metrics',
  },
};

interface ModelHealthAtomState {
  weekOutput: { loading: boolean; dataVolume: number };
  dayOutput: { loading: boolean; dataVolume: number };
  weekOutputAlerts: { loading: boolean; alerts: number };
  dayOutputAlerts: { loading: boolean; alerts: number; features: number };
  latestTimeStamp: { loading: boolean; timestamp: number };
  batchFrequency: TimePeriod;
}
export const modelHealthCardAtom = atom<ModelHealthAtomState>({
  key: 'modelHealthCardAtom',
  default: {
    weekOutput: { loading: false, dataVolume: 0 },
    dayOutput: { loading: false, dataVolume: 0 },
    weekOutputAlerts: { loading: false, alerts: 0 },
    dayOutputAlerts: { loading: false, alerts: 0, features: 0 },
    latestTimeStamp: { loading: false, timestamp: 0 },
    batchFrequency: TimePeriod.P1D,
  },
});

const ModelHealthCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { resourceTexts, isModelCategory } = useResourceText(FILE_TEXTS);
  const { getNavUrl } = useNavLinkHandler();

  const { modelId } = usePageTypeWithParams();
  const [{ weekOutput, dayOutput, weekOutputAlerts, dayOutputAlerts, latestTimeStamp, batchFrequency }] =
    useRecoilState(modelHealthCardAtom);

  const noOutputs = !dayOutputAlerts.loading && dayOutputAlerts.features === 0;
  const noDataInRangeOnly = !noOutputs && latestTimeStamp.timestamp === 0;

  const renderNoOutputs = () => {
    return <NoDataContent displayText={labels.summary.no_data} />;
  };

  const renderData = () => {
    return (
      <>
        <WhyLabsText inherit className={styles.contentTxt}>
          {resourceTexts.cardTitle}
        </WhyLabsText>
        {dayOutputAlerts.loading ? (
          <Skeleton height={38} width={40} animate />
        ) : (
          <WhyLabsText inherit className={styles.largeInfo}>
            {dayOutputAlerts.features}
          </WhyLabsText>
        )}
        <div className={styles.contentSpacer} />
        <TrendMetricSlot
          title={resourceTexts.anomaliesPreviousTitle}
          referencedNumber={getAverageOverMidRange(weekOutputAlerts.alerts, batchFrequency)}
          currentNumber={dayOutputAlerts.alerts}
          loading={weekOutputAlerts.loading || dayOutputAlerts.loading}
          reverseColor
          batchFrequency={batchFrequency}
        />
        <hr className={styles.cardDivider} />

        <TrendMetricSlot
          title={resourceTexts.dataVolumePreviousTitle}
          referencedNumber={getAverageOverMidRange(weekOutput.dataVolume, batchFrequency)}
          currentNumber={dayOutput.dataVolume}
          loading={weekOutput.loading || dayOutput.loading}
          forceRed
          batchFrequency={batchFrequency}
        />
        <hr className={styles.cardDivider} />
        <LastDataBatch {...latestTimeStamp} />
      </>
    );
  };
  const modelOutputUrl = useMemo(() => {
    return getNavUrl({ page: 'output', modelId });
  }, [getNavUrl, modelId]);

  const footer: SummaryCardFooterProps = isModelCategory
    ? {
        footerLink: modelOutputUrl,
        footerTxt: resourceTexts.footerLinkText,
        footerLinkNewTab: noOutputs,
        footerIcon: true,
      }
    : {};

  return (
    <SummaryCard
      customCard={customCard}
      cardTooltip={resourceTexts.cardTooltip}
      footer={footer}
      id="model-health-card"
      cardLoading={
        weekOutput.loading &&
        dayOutput.loading &&
        weekOutputAlerts.loading &&
        dayOutputAlerts.loading &&
        latestTimeStamp.loading
      }
      loadingCardHeight={411}
    >
      {noOutputs || noDataInRangeOnly ? renderNoOutputs() : renderData()}
    </SummaryCard>
  );
};
export default ModelHealthCard;
