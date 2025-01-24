import { WhyLabsText } from 'components/design-system';
import { Colors } from '@whylabs/observatory-lib';
import { cardsTimeLong } from 'utils/dateUtils';
import { AnalysisDataFragment, MetricDataFragment, MetricKind, SegmentTag, TimePeriod } from 'generated/graphql';
import { DATE_RANGE_SEPARATOR } from 'types/navTags';
import { createStyles, Skeleton } from '@mantine/core';
import { arrayOfLength } from 'utils/arrayUtils';
import { CardColumnKey, nonAverageMetrics } from 'pages/llm-dashboards/utils';
import { EncodedAnalysisInfo } from 'hooks/useStateUrlEncoder';
import NoDataChart from 'components/visualizations/no-data-chart/NoDataChart';
import { isNumber } from 'utils/typeGuards';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { SecuritySummaryPane } from './security/components/SecuritySummaryPane';
import { DashCardHero } from './components/DashCardHero';
import { CardRowState } from './contexts/LLMCardRowContext';

export const DEFAULT_SELECT_WIDTH = 300;
export const DEFAULT_GRAPH_HEIGHT = 150;
export type DashboardKeyType = 'primary' | 'secondary';

export interface CommonDashboardVisualizationProps {
  navigationInformation: {
    resourceId: string;
    segment?: ParsedSegment;
    columnId?: string;
    customDateRange?: SimpleDateRange;
  };
  name: string;
  columnKey: CardColumnKey;
}

export const findDefaultAnalyzer = (
  analysisData: AnalysisDataFragment[],
  actionState?: EncodedAnalysisInfo | null,
): string => {
  const firstAnomalous = analysisData.find((an) => an.isAnomaly);
  const actionStateAnalyzerId = actionState?.analyzerId;
  if (actionStateAnalyzerId) return actionStateAnalyzerId;
  if (firstAnomalous?.analyzerId) return firstAnomalous.analyzerId;
  return analysisData?.find((an) => !!an?.analyzerId)?.analyzerId ?? '';
};

export const CardSkeleton = (): React.ReactElement => {
  const { classes } = dashboardPanelStyles();
  return (
    <div className={classes.skeleton}>
      <Skeleton height={235} width={240} />
      <Skeleton height={235} width="calc(100% - 240px)" />
    </div>
  );
};

export const MetricsCardsSkeleton = (): React.ReactElement => {
  return (
    <>
      {arrayOfLength(4).map((i) => (
        <CardSkeleton key={`${i}`} />
      ))}
    </>
  );
};

export const renderSummarySection = ({
  metric,
  resourceName,
  color,
  heroValue = 0,
  selectedBatch,
  batchFrequency,
  overrideTimestampsLabel,
  tags = [],
  columnId,
  resourceId,
}: {
  metric: MetricDataFragment;
  resourceName: string | null;
  color: string | null;
  heroValue?: string | number;
  selectedBatch: number | string | null;
  batchFrequency?: TimePeriod;
  overrideTimestampsLabel?: string;
  tags?: SegmentTag[];
  columnId?: string;
  resourceId?: string;
}): { key: string; component: React.ReactNode }[] => {
  if (!resourceName || !color) {
    return [];
  }
  const { metricKind, queryDefinition } = metric?.metadata ?? {};
  const isTimeRange = selectedBatch?.toString().includes(DATE_RANGE_SEPARATOR);
  const averageMetric = queryDefinition?.metric && !nonAverageMetrics.includes(queryDefinition.metric);
  const overrideLabel = metricKind === MetricKind.Amount && averageMetric ? 'Average for selected batch range:' : '';
  const usedOverrideLabel = overrideTimestampsLabel || overrideLabel;
  return [
    {
      key: `${metric.id}--${resourceName}--info`,
      component: (
        <SecuritySummaryPane
          resourceName={resourceName ?? ''}
          metricName={metric.name}
          tags={metric.metadata?.tags ?? []}
          description={metric.metadata?.description ?? ''}
          metricKind={metricKind ?? MetricKind.Amount}
          color={color}
          resourceId={resourceId ?? ''}
          columnId={columnId ?? ''}
          segmentTags={tags}
        />
      ),
    },
    {
      key: `${metric.id}--${resourceName}--hero`,
      component: (
        <DashCardHero heroTitle={metric?.metadata?.queryDefinition?.metricLabel ?? ''} heroValue={heroValue}>
          {isTimeRange
            ? renderBatchRangeDescription(selectedBatch, batchFrequency, usedOverrideLabel)
            : renderSingleBatchDescription(selectedBatch, batchFrequency)}
        </DashCardHero>
      ),
    },
  ];
};

export const renderSingleBatchDescription = (
  timestamp?: number | string | null,
  batchFrequency?: TimePeriod,
): JSX.Element => {
  if (!timestamp) return <></>;
  return (
    <>
      <WhyLabsText color={Colors.secondaryLight700} size={12} weight={400} lh={1.3}>
        Based on selected batch:
      </WhyLabsText>
      <WhyLabsText mt={4} color={Colors.secondaryLight700} size={12} weight={600} lh={1.3}>
        {cardsTimeLong(Number(timestamp), batchFrequency)}
      </WhyLabsText>
    </>
  );
};

export const renderBatchRangeDescription = (
  timestamp?: number | string | null,
  batchFrequency?: TimePeriod,
  overrideLabel?: string,
): JSX.Element => {
  if (!timestamp) return <></>;
  const [from, to] = timestamp?.toString()?.split(DATE_RANGE_SEPARATOR);
  const fromDateString = cardsTimeLong(Number(from), batchFrequency);
  const toDateString = cardsTimeLong(Number(to), batchFrequency);
  return (
    <>
      <WhyLabsText color={Colors.secondaryLight700} size={12} weight={400} lh={1.3}>
        {overrideLabel || 'For selected batch range:'}
      </WhyLabsText>
      <WhyLabsText color={Colors.secondaryLight700} size={12} weight={600} lh={1.3}>
        {fromDateString} to
        <br />
        {toDateString}
      </WhyLabsText>
    </>
  );
};

export const UnavailableMetricCard = ({ targetText }: { targetText: string }): React.ReactElement => {
  const { classes } = dashboardPanelStyles();
  return (
    <div className={classes.unavailableMetric}>
      <NoDataChart noDataMessage={`Metric not available in ${targetText}.`} />
    </div>
  );
};

export const getSharedYDomain = (
  columnKey: CardColumnKey,
  cardRowState: CardRowState,
  graphDomain: { min: number; max: number },
): [number, number] => {
  const { min: graphMin, max: graphMax } = graphDomain;
  if (!cardRowState[columnKey]) return [graphMin, graphMax] as [number, number];
  const { min: primaryMin, max: primaryMax } = cardRowState.primary ?? {};
  const { min: comparisonMin, max: comparisonMax } = cardRowState.comparison ?? {};
  const minValues = [primaryMin, comparisonMin, graphMin].filter(isNumber);
  const maxValues = [primaryMax, comparisonMax, graphMax].filter(isNumber);
  const usedMin = Math.min(...minValues);
  const usedMax = Math.max(...maxValues);
  return [usedMin, usedMax] as [number, number];
};

export const dashboardPanelStyles = createStyles(() => ({
  newRoot: {
    backgroundColor: Colors.brandSecondary100,
    gap: '18px',
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  graphRow: {
    display: 'flex',
    gap: '18px',
  },
  graph: {
    width: '100%',
    flex: 1,
  },
  unavailableMetric: {
    flex: '1',
    background: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 275,
  },
  root: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '18px',
    padding: '18px 16px',
    backgroundColor: Colors.brandSecondary100,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    gap: '18px',
    minWidth: 'calc(50% - 9px)', // 9px = gap/2
  },
  skeleton: {
    background: 'white',
    padding: 20,
    display: 'flex',
    gap: 16,
    flex: 1,
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: '1 1 auto',
  },
}));
