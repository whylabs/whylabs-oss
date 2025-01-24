import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ComponentProps } from 'react';
import { atom, useRecoilState } from 'recoil';

import { labels } from 'strings/labels';
import { dateOnly } from 'utils/dateUtils';
import { TimePeriod } from 'generated/graphql';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { createFriendlyDisplayStringFromDateRange } from 'components/super-date-picker/utils';
import TrendMetricSlot from '../model-summary-utils/TrendMetricSlot';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import LastDataBatch from './components/LastDataBatch';
import NoDataContent from './NoDataContent';
import { NoDataMessage } from './NoDataMessage';

export type KnownPerformanceMetric = 'accuracy' | 'mean_squared_error';

type DataPoint = {
  value: number;
  timestamp: number;
};

export interface ModelPerformanceCardAtomState {
  rollup: {
    oneDay: number | null;
    oneWeek: number | null;
  } | null;
  lastAvailableDataPoint: DataPoint | null;
  latestBatchTimeStamp: number;
  loading: boolean;
  metric: KnownPerformanceMetric;
  batchFrequency: TimePeriod;
}
export const modelPerformanceCardAtom = atom<ModelPerformanceCardAtomState>({
  key: 'modelPerformanceCardAtom',
  default: {
    rollup: null,
    lastAvailableDataPoint: null,
    latestBatchTimeStamp: 0,
    loading: true,
    metric: 'accuracy',
    batchFrequency: TimePeriod.P1D,
  },
});

const getFriendlyMetricName = (metric: KnownPerformanceMetric): string => {
  switch (metric) {
    case 'accuracy':
      return 'Accuracy';
    case 'mean_squared_error':
      return 'Mean squared error';
    default:
      // TODO: support for more known metrics
      console.error(`Displayed summary card for unknown perf metric ${metric}`);
      return metric;
  }
};

const getTrendMetricTitle = (metric: KnownPerformanceMetric, point: DataPoint): string => {
  return `${getFriendlyMetricName(metric)}, ${dateOnly(point.timestamp)}`;
};

const ModelPerformanceCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();
  const { dateRange } = useSuperGlobalDateRange();
  const [modelPerformanceCard] = useRecoilState(modelPerformanceCardAtom);

  const { rollup, lastAvailableDataPoint, loading, latestBatchTimeStamp, metric, batchFrequency } =
    modelPerformanceCard;

  const dailyPerformance = rollup?.oneDay;
  const weeklyPerformance = rollup?.oneWeek;

  const footer: SummaryCardFooterProps = lastAvailableDataPoint
    ? {
        footerTxt: 'View performance',
        footerLink: getNavUrl({ page: 'performance', modelId }),
        footerLinkNewTab: false,
        footerIcon: true,
      }
    : {
        footerTxt: 'Learn how to log performance data',
        footerLink: 'https://docs.whylabs.ai/docs/performance-metrics/',
        footerLinkNewTab: true,
        footerIcon: false,
      };

  return (
    <SummaryCard
      cardLoading={loading}
      cardTooltip="A summary of relevant performance metrics and alert counts for this model's segments, within the specified time range"
      customCard={customCard}
      loadingCardHeight={236}
      id="model-performance-card"
      footer={footer}
    >
      {lastAvailableDataPoint ? (
        renderPerformanceCard(lastAvailableDataPoint)
      ) : (
        <NoDataContent displayText={labels.summary.no_data}>
          <NoDataMessage
            simpleDisplayText={labels.summary.no_data_in_range}
            rangeString={createFriendlyDisplayStringFromDateRange(dateRange)}
            explanationLines={[
              labels.summary.delayed_perf,
              { text: labels.summary.delayed_perf_2, link: getNavUrl({ page: 'performance', modelId }) },
            ]}
          />
        </NoDataContent>
      )}
    </SummaryCard>
  );

  function renderPerformanceCard(point: DataPoint) {
    const displayAccuracy = metric === 'accuracy';
    return (
      <>
        {displayAccuracy ? renderAccuracy(point) : renderMse(point)}
        <hr className={styles.cardDivider} />
        <LastDataBatch timestamp={latestBatchTimeStamp} />
      </>
    );
  }

  function renderAccuracy(point: DataPoint) {
    return renderTrendMetricSlot({
      isPercent: true,
      title: getTrendMetricTitle(metric, point),
    });
  }

  function renderMse(point: DataPoint) {
    return renderTrendMetricSlot({
      isRaw: true,
      reverseColor: true,
      title: getTrendMetricTitle(metric, point),
    });
  }

  function renderTrendMetricSlot(
    props: Omit<ComponentProps<typeof TrendMetricSlot>, 'currentNumber' | 'referencedNumber' | 'loading'>,
  ) {
    // can only compare performance if there's performance data for both the current time period and the larger time range
    if (dailyPerformance != null && weeklyPerformance != null)
      return (
        <TrendMetricSlot
          {...props}
          currentNumber={dailyPerformance}
          referencedNumber={weeklyPerformance}
          loading={loading}
          batchFrequency={batchFrequency}
        />
      );

    // if we got here, it means daily performance doesn't exist, but weekly data does, since a) weekly performance must exist if daily exists and b) we already checked if both of these don't exist and displayed "no data" if so
    return (
      <>
        {/* Let the user know we haven't received perf for the most recent day */}
        <TrendMetricSlot
          {...props}
          currentValueOverride="Missing data point"
          title={`${getFriendlyMetricName(metric)}, previous batch profile`}
          currentNumber={dailyPerformance ?? 0}
          referencedNumber={weeklyPerformance ?? 0}
          hideSummary // can't compare no data to weekly
          loading={loading}
          batchFrequency={batchFrequency}
        />
        {/* Compare the last available data point to the rest of the data in range, instead of the current day */}
        <TrendMetricSlot
          {...props}
          currentNumber={lastAvailableDataPoint?.value ?? 0}
          referencedNumber={weeklyPerformance ?? 0}
          loading={loading}
          batchFrequency={batchFrequency}
        />
      </>
    );
  }
};
export default ModelPerformanceCard;
