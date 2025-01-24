import { Skeleton } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { TimePeriod } from 'generated/graphql';
import TrendMetricSlot from '../../model-summary-utils/TrendMetricSlot';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../../SummaryCard';
import { useSummaryCardStyles } from '../../useModelSummaryCSS';
import LinkedInfoMetricSlot, { LinkedInfo } from '../../model-summary-utils/LinkedInfoMetricSlot';

interface TrendSection {
  label: string;
  referencedNumber: number;
  currentNumber: number;
}

interface AnomalousSection {
  label: string;
  list: [string, number][];
  link: string;
}

interface InputHealthCardProps {
  customCard: CustomCardProps;
  id: string;
  loading: boolean;
  tooltip: string;
  overallSection: {
    label: React.ReactNode;
    count: number | string;
  };
  trendSection: TrendSection;
  anomalousListSection: AnomalousSection;
  footer: {
    link: string;
    label: string;
  };
  batchFrequency: TimePeriod;
}
const GenericMetricPerformanceCard = ({
  customCard,
  loading,
  tooltip,
  overallSection,
  trendSection,
  anomalousListSection,
  footer,
  batchFrequency,
}: InputHealthCardProps): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();

  const getSegmentLinkObj = ([metric, count]: AnomalousSection['list'][number]): LinkedInfo => {
    return {
      link: anomalousListSection.link,
      linkTxt: metric,
      data: count.toString(),
      dataTxt: `${count !== 1 ? 'anomalies' : 'anomaly'}`,
      key: `${metric}-${count}-${anomalousListSection.link}`,
    };
  };

  const renderContent = () => {
    return (
      <>
        <WhyLabsText inherit className={styles.contentTxt}>
          {overallSection.label}
        </WhyLabsText>
        {loading ? (
          <Skeleton variant="text" height={38} width={40} animate />
        ) : (
          <WhyLabsText inherit className={styles.largeInfo}>
            {overallSection.count}
          </WhyLabsText>
        )}
        <div className={styles.contentSpacer} />
        <TrendMetricSlot
          title={trendSection.label}
          referencedNumber={trendSection.referencedNumber}
          currentNumber={trendSection.currentNumber}
          loading={loading}
          dataUnits="anomalies"
          reverseColor
          batchFrequency={batchFrequency}
        />
        {!!anomalousListSection.list?.length && (
          <>
            <hr className={styles.cardDivider} />
            <LinkedInfoMetricSlot
              linkInfoSubtitle={anomalousListSection.label}
              linkInfo={anomalousListSection.list.map(getSegmentLinkObj)}
            />
          </>
        )}
      </>
    );
  };

  const footerComponent: SummaryCardFooterProps = {
    footerLink: footer.link,
    footerTxt: footer.label,
    footerIcon: true,
  };

  return (
    <SummaryCard
      customCard={customCard}
      cardTooltip={tooltip}
      footer={footerComponent}
      id="input-health-card"
      cardLoading={loading}
      loadingCardHeight={411}
    >
      {renderContent()}
    </SummaryCard>
  );
};

export default GenericMetricPerformanceCard;
