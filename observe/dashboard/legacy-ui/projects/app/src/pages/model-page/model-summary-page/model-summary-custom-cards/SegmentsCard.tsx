import { SegmentTagFilter, TimePeriod } from 'generated/graphql';
import { displaySegment } from 'pages/page-types/pageUrlQuery';
import { atom, useRecoilState } from 'recoil';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { WhyLabsText } from 'components/design-system';
import { Skeleton } from '@mantine/core';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';

import { labels } from 'strings/labels';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import LinkedInfoMetricSlot, { LinkedInfo } from '../model-summary-utils/LinkedInfoMetricSlot';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import TrendMetricSlot from '../model-summary-utils/TrendMetricSlot';
import NoDataContent from './NoDataContent';
import { getAverageOverMidRange } from '../summaryCardUtils';

const COMMON_TEXTS = {
  footerText: 'Learn how to segment your data',
  footerViewSegmentsText: 'View segments',
  segmentAnomaliesPreviousTitle: 'Anomalies in segments, previous batch profile',
  segmentsTitle: 'Segments',
  mostAnomaliesText: 'Segments with most anomalies:',
};

const FILE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    cardTooltip:
      "A summary of relevant metrics and anomaly counts for this dataset's segments, within the specified time range",
  },
  MODEL: {
    ...COMMON_TEXTS,
    cardTooltip:
      "A summary of relevant metrics and anomaly counts for this model's segments, within the specified time range",
  },
  LLM: {
    ...COMMON_TEXTS,
    cardTooltip:
      "A summary of relevant information and anomaly counts for this model's segments, within the specified time range",
  },
};

export interface FormattedSegment {
  tags: SegmentTagFilter[];
  totalAlerts: number;
}

interface SegmentsCardAtomState {
  segments: {
    totalCount: number;
    withMostAlerts: FormattedSegment[];
    loading: boolean;
  };
  segmentsWeekAlerts: { loading: boolean; count: number };
  segmentsDayAlerts: { loading: boolean; count: number };
  batchFrequency: TimePeriod;
}

export const segmentsCardAtom = atom<SegmentsCardAtomState>({
  key: 'segmentsCardAtom',
  default: {
    segments: {
      totalCount: 0,
      withMostAlerts: [],
      loading: false,
    },
    segmentsWeekAlerts: { loading: false, count: 0 },
    segmentsDayAlerts: { loading: false, count: 0 },
    batchFrequency: TimePeriod.P1D,
  },
});

const SegmentsCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { resourceTexts } = useResourceText(FILE_TEXTS);
  const { getNavUrl } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();
  const [{ segments, segmentsWeekAlerts, segmentsDayAlerts, batchFrequency }] = useRecoilState(segmentsCardAtom);

  const getSegmentLinkObj = (segment: FormattedSegment): LinkedInfo => {
    const segmentLink = getNavUrl({ page: 'columns', modelId, segmentTags: { tags: segment.tags } });
    const segmentTxt = displaySegment({ tags: segment.tags });
    return {
      link: segmentLink,
      linkTxt: segmentTxt,
      data: `${segment.totalAlerts}`,
      dataTxt: `${segment.totalAlerts !== 1 ? 'anomalies' : 'anomaly'}`,
      key: segmentLink,
    };
  };

  const alertsLoading = segmentsWeekAlerts.loading || segmentsDayAlerts.loading;
  const noSegments = !segments.loading && segments.totalCount === 0;

  const renderNoSegments = () => <NoDataContent displayText={labels.summary.no_segments} />;

  const footer: SummaryCardFooterProps = !noSegments
    ? {
        footerTxt: resourceTexts.footerViewSegmentsText,
        footerLink: getNavUrl({ page: 'segments', modelId }),
        footerLinkNewTab: false,
        footerIcon: true,
      }
    : {
        footerTxt: resourceTexts.footerText,
        footerLink: 'https://docs.whylabs.ai/docs/usecases-segmenting-data/',
        footerLinkNewTab: true,
        footerIcon: false,
      };

  const averageAnomaliesPerBatch = getAverageOverMidRange(segmentsWeekAlerts.count, batchFrequency);

  const renderData = () => {
    return (
      <>
        <WhyLabsText inherit className={styles.contentTxt}>
          {resourceTexts.segmentsTitle}
        </WhyLabsText>
        {segments.loading ? (
          <Skeleton height={38} width={40} animate />
        ) : (
          <WhyLabsText inherit className={styles.largeInfo}>
            {segments.totalCount}{' '}
          </WhyLabsText>
        )}
        <div className={styles.contentSpacer} />

        <TrendMetricSlot
          title={resourceTexts.segmentAnomaliesPreviousTitle}
          referencedNumber={averageAnomaliesPerBatch}
          currentNumber={segmentsDayAlerts.count}
          loading={alertsLoading}
          reverseColor
          batchFrequency={batchFrequency}
        />
        {(segments.withMostAlerts.length || segments.loading) && <hr className={styles.cardDivider} />}

        {segments.loading ? (
          <>
            <Skeleton height={36} width={40} animate />
            <Skeleton height={36} width={40} animate />
            <Skeleton height={36} width={40} animate />
          </>
        ) : (
          <LinkedInfoMetricSlot
            linkInfoSubtitle={segments.withMostAlerts.length ? resourceTexts.mostAnomaliesText : undefined}
            linkInfo={segments.withMostAlerts.map(getSegmentLinkObj)}
          />
        )}
      </>
    );
  };

  return (
    <SummaryCard
      customCard={customCard}
      cardTooltip={resourceTexts.cardTooltip}
      cardLoading={segments.loading && alertsLoading}
      loadingCardHeight={442}
      footer={footer}
    >
      {noSegments ? renderNoSegments() : renderData()}
    </SummaryCard>
  );
};

export default SegmentsCard;
