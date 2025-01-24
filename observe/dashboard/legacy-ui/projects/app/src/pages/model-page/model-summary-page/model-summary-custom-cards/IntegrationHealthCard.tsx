import { NavHandlerSearchParams, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { atom, useRecoilState } from 'recoil';

import { AnalysisMetric, AnomaliesHealthDataFragment, TimePeriod } from 'generated/graphql';
import { labels } from 'strings/labels';
import { createStyles, Skeleton } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { StartAndEndTimestamp, timeLong } from 'utils/dateUtils';
import { IconAlertTriangle } from '@tabler/icons';
import useMonitorSchema from 'components/panels/monitoring/monitor-manager/hooks/useMonitorSchema';
import { camelCaseToSnakeUpperCase } from 'utils/stringUtils';
import { Portal, TooltipWithBounds, useTooltip } from '@visx/tooltip';
import AnomalyTooltip, { AnomalyTooltipProps, TooltipItem } from 'components/controls/table/AnomalyTooltip';
import { WhyLabsText } from 'components/design-system';
import { tooltipStyles } from 'components/visualizations/utils';
import { useUserContext } from 'hooks/useUserContext';
import { canManageMonitors } from 'utils/permissionUtils';
import { getDefaultProfilesByGranularity } from 'components/visualizations/batch-graphs/batchUtils';
import { getAnalyzerMetric } from 'hooks/useCustomMonitor/monitorUtils';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useResourceText } from '../../hooks/useResourceText';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import NoDataContent from './NoDataContent';
import LastDataBatch from './components/LastDataBatch';
import { getSimpleLastNUnitBuckets } from '../summaryCardUtils';

export interface IntegrationHealthCardAtomState {
  data?: {
    batchesInRange: number;
    anomaliesInRange: number;
    lastIntegrationAnomalies: AnomaliesHealthDataFragment[];
    latestReceivedTimeStamp: number;
    firstBatchInRange: number;
    lastBatchInRange: number;
    batchFrequency: TimePeriod;
  };
  loading: boolean;
}
export const integrationHealthCardAtom = atom<IntegrationHealthCardAtomState>({
  key: 'integrationHealthCardAtom',
  default: {
    loading: true,
  },
});

const FILE_TEXTS = {
  DATA: {
    cardTooltip:
      "A summary of relevant metrics and anomalies for the dataset's integration health within the specified time range",
  },
  MODEL: {
    cardTooltip:
      "A summary of relevant metrics and anomalies for the model's integration health within the specified time range",
  },
  LLM: {
    cardTooltip:
      "A summary of relevant metrics and anomalies for the model's integration health within the specified time range",
  },
};

const useLocalStyles = createStyles(() => ({
  root: {
    position: 'relative',
  },
  paddingTopXS: {
    paddingTop: '5px',
  },
  paddingTopSM: {
    paddingTop: '10px',
  },
  metricHero: {
    fontFamily: 'Asap',
    fontSize: '20px',
    lineHeight: 1.3,
  },
  notMonitoredHero: {
    fontFamily: 'Asap',
    color: Colors.secondaryLight700,
  },
  squareContainerTitle: {
    fontSize: 12,
    fontFamily: 'Asap',
    lineHeight: 1,
    color: Colors.secondaryLight700,
  },
  flex: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
  },
  squareContainer: {
    marginTop: '10px',
    cursor: 'default',
    display: 'flex',
    gap: 1,
    '& span': {
      height: '10px',
      flex: 1,
      outlineColor: Colors.brandSecondary200,
      outlineStyle: 'solid',
      outlineWidth: '1px',
      outlineOffset: '-1px',
    },
  },
}));

const IntegrationHealthCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles, cx } = useSummaryCardStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } =
    useTooltip<AnomalyTooltipProps>();
  const { modelId } = usePageTypeWithParams();
  const { monitorSchema } = useMonitorSchema({ modelId });
  const { resourceTexts } = useResourceText(FILE_TEXTS);
  const [integrationHealthData] = useRecoilState(integrationHealthCardAtom);
  const { dateRange } = useSuperGlobalDateRange();
  const { classes } = useLocalStyles();
  const { data, loading } = integrationHealthData;
  let tooltipTimeout: number;
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const userCanManageMonitors = canManageMonitors(user);

  const hasIntegrationMonitors = (): boolean => {
    if (!monitorSchema) return false;
    return !!monitorSchema.analyzers.find(({ config }) =>
      [AnalysisMetric.SecondsSinceLastUpload, AnalysisMetric.MissingDatapoint].includes(
        camelCaseToSnakeUpperCase(getAnalyzerMetric(config)) as AnalysisMetric,
      ),
    );
  };

  const footer = (): SummaryCardFooterProps | undefined => {
    if (!data || !monitorSchema) return undefined;
    const anomaliesInPast = data?.lastIntegrationAnomalies?.length;
    if (anomaliesInPast || hasIntegrationMonitors()) {
      const monitorId = data?.lastIntegrationAnomalies?.[0]?.monitorIds?.[0];
      const setParams: NavHandlerSearchParams = monitorId ? [{ name: 'monitor', value: monitorId }] : [];
      return {
        footerLink: getNavUrl({
          page: 'monitorManager',
          modelId,
          monitorManager: { path: 'anomalies-feed' },
          setParams,
        }),
        footerTxt: anomaliesInPast ? 'View in anomalies feed' : 'View anomalies feed',
        footerIcon: true,
      };
    }
    if (userCanManageMonitors) {
      return {
        footerLink: getNavUrl({
          page: 'monitorManager',
          modelId,
          monitorManager: { path: 'customize-json', id: 'missing-profile-analyzer' },
        }),
        footerTxt: 'Set up integration monitoring',
        footerIcon: true,
      };
    }
    return {
      footerTxt: 'No integration monitors created',
    };
  };

  const granularity = integrationHealthData.data?.batchFrequency ?? TimePeriod.P1D;
  const handler = getDefaultProfilesByGranularity.get(granularity);

  // if end *date* is specified in the URL, use that as the anchor point for end time
  // otherwise use current time
  const endFetchedDate = (() => {
    return new Date(dateRange.to);
  })();

  const generateSquares = (): StartAndEndTimestamp[] => {
    if (!handler) return [];
    const { profileCount } = handler;
    const timestampsList = getSimpleLastNUnitBuckets(profileCount, endFetchedDate, granularity);
    const squareList: StartAndEndTimestamp[] = [];
    // Each bucket goes from one timestamp to just before the next one in the list,
    // except for the last one.
    // So if our bucket timestamps are 1000, 2000, 3000, 4000, 4999, the buckets are
    // (1000 - 1999), (2000 - 2999), (3000 - 3999), (4000 - 4999)
    // Note that 5 timestamps make 4 buckets; the buckets are the gaps between the stamps.
    // The logic is identical to array.slice, where the beginning is inclusive and
    // the end is exclusive unless you hit the end of the array.
    Array.from({ length: timestampsList.length - 1 }).forEach((_, i) => {
      const nudge = i === timestampsList.length - 2 ? 0 : 1;
      squareList.push({ start: timestampsList[i], end: timestampsList[i + 1] - nudge });
    });
    return squareList;
  };

  const renderNotMonitored = (): JSX.Element => {
    if (!monitorSchema) return <Skeleton mt={10} height={20} width="100%" />;
    return (
      <div className={cx(classes.flex, classes.paddingTopXS)}>
        <IconAlertTriangle color={Colors.secondaryLight700} />
        <WhyLabsText inherit className={cx(classes.metricHero, classes.notMonitoredHero)}>
          Not monitored
        </WhyLabsText>
      </div>
    );
  };

  const metricNameAndColorMapper = new Map<AnalysisMetric | undefined, { name: string; color: string }>([
    [AnalysisMetric.SecondsSinceLastUpload, { name: 'Late upload', color: Colors.chartYellow }],
    [AnalysisMetric.MissingDatapoint, { name: 'Missing profile', color: Colors.chartOrange }],
  ]);

  const renderLastAnomaly = (): JSX.Element => {
    const lastIntegrationAnomalies = data?.lastIntegrationAnomalies ?? [];
    const hasAnomalies = lastIntegrationAnomalies.length;
    const anomalyDisplayName = hasAnomalies
      ? metricNameAndColorMapper.get(lastIntegrationAnomalies[0]?.metric ?? undefined)?.name
      : '';
    return (
      <WhyLabsText inherit className={classes.metricHero} style={{ color: hasAnomalies ? Colors.red : Colors.green }}>
        {anomalyDisplayName || 'No anomalies'}
      </WhyLabsText>
    );
  };

  const mergeTooltipItems = (anomaly: AnomaliesHealthDataFragment, existent?: TooltipItem): TooltipItem => {
    const metricNameAndColor = metricNameAndColorMapper.get(anomaly.metric as AnalysisMetric);
    const fallbackColor = metricNameAndColor?.color ?? Colors.secondaryLight700;
    const fallbackName = metricNameAndColor?.name ?? 'Others';
    return {
      color: existent?.color ?? fallbackColor,
      label: existent?.label ?? fallbackName,
      count: (existent?.count ?? 0) + 1,
    };
  };

  const handleMouseMove = (
    event: React.MouseEvent<HTMLSpanElement, MouseEvent>,
    anomaliesInBucketRange: AnomaliesHealthDataFragment[],
    timestamp: number,
    endTimestamp: number,
    batchFrequency: TimePeriod,
  ) => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    const anomaliesByType = new Map<string, TooltipItem>([]);
    anomaliesInBucketRange.forEach((an) => {
      const name = metricNameAndColorMapper.get(an.metric as AnalysisMetric)?.name ?? 'Others';
      const existent = anomaliesByType.get(name);
      const mergedItem = mergeTooltipItems(an, existent);
      anomaliesByType.set(name, mergedItem);
    });
    const items = [...anomaliesByType.values()];
    showTooltip({
      tooltipData: { timestamp, endTimestamp, items, batchFrequency },
      tooltipTop: event.pageY,
      tooltipLeft: event.pageX,
    });
  };

  const handleMouseLeave = () => {
    tooltipTimeout = window.setTimeout(() => {
      hideTooltip();
    }, 250);
  };

  const hasAnomalies = !!data?.lastIntegrationAnomalies?.length;

  const renderSquares = () => {
    if (!data || !hasAnomalies) return null;
    const anomalyBuckets = generateSquares();
    const anomalies = data.lastIntegrationAnomalies;
    return (
      <div className={classes.squareContainer} onMouseLeave={handleMouseLeave}>
        {anomalyBuckets.map(({ start, end }) => {
          const anomaliesInRange = anomalies.filter(
            ({ datasetTimestamp }) => datasetTimestamp && datasetTimestamp >= start && datasetTimestamp <= end,
          );
          return (
            <span
              key={`square-from-${start}-to-${end}`}
              style={{ background: anomaliesInRange?.length ? Colors.red : Colors.white }}
              onMouseEnter={(e) => handleMouseMove(e, anomaliesInRange, start, end, data.batchFrequency)}
            />
          );
        })}
      </div>
    );
  };

  const renderTooltip = (): JSX.Element => {
    const { items, timestamp, endTimestamp, batchFrequency } = tooltipData ?? {};
    return (
      <AnomalyTooltip
        items={items ?? []}
        timestamp={timestamp}
        endTimestamp={endTimestamp}
        batchFrequency={batchFrequency}
      />
    );
  };

  function renderStructureIfHasData() {
    if (!data) {
      return <NoDataContent displayText="No integration data available" />;
    }
    const { latestReceivedTimeStamp, firstBatchInRange, lastBatchInRange, anomaliesInRange, batchesInRange } = data;
    return (
      <div className={classes.root}>
        <WhyLabsText inherit className={styles.contentTxt}>
          Profiles in range
        </WhyLabsText>
        <WhyLabsText inherit className={styles.largeInfo}>
          {batchesInRange}
        </WhyLabsText>
        <div className={styles.contentSpacer} />
        <WhyLabsText inherit className={styles.contentTxt}>
          Anomalies in range
        </WhyLabsText>
        <WhyLabsText inherit className={styles.largeInfo}>
          {anomaliesInRange}
        </WhyLabsText>
        <hr className={styles.cardDivider} />
        <WhyLabsText inherit className={cx(classes.squareContainerTitle)}>
          Data health, last {`${handler?.profileCount ?? 7} ${handler?.periodLabel ?? 'days'}`} in range
        </WhyLabsText>
        <div className={classes.paddingTopXS}>
          {data.lastIntegrationAnomalies.length || hasIntegrationMonitors()
            ? renderLastAnomaly()
            : renderNotMonitored()}
          {!loading && renderSquares()}
        </div>
        <hr className={styles.cardDivider} />
        <LastDataBatch
          label="Data last received"
          noTimestampLabel="No batch profiles found"
          timestamp={latestReceivedTimeStamp}
        />
        <hr className={styles.cardDivider} />
        {firstBatchInRange && lastBatchInRange ? (
          <>
            <div>
              <WhyLabsText inherit className={styles.contentSubtitle}>
                First profile in range
              </WhyLabsText>
              <WhyLabsText inherit className={styles.contentTxt}>
                {timeLong(firstBatchInRange)}
              </WhyLabsText>
            </div>
            <div>
              <WhyLabsText inherit className={styles.contentSubtitle}>
                Last profile in range
              </WhyLabsText>
              <WhyLabsText inherit className={styles.contentTxt}>
                {timeLong(lastBatchInRange)}
              </WhyLabsText>
            </div>
          </>
        ) : (
          !!latestReceivedTimeStamp && (
            <WhyLabsText inherit className={styles.contentSubtitle}>
              No recent profiles
            </WhyLabsText>
          )
        )}
        {tooltipOpen && tooltipData && (
          <Portal key={Math.random()}>
            <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
              {renderTooltip()}
            </TooltipWithBounds>
          </Portal>
        )}
      </div>
    );
  }

  return (
    <SummaryCard
      cardLoading={loading}
      cardTooltip={resourceTexts.cardTooltip}
      customCard={customCard}
      id="integration-health-card"
      footer={footer()}
      loadingCardHeight={236}
    >
      {data ? renderStructureIfHasData() : <NoDataContent displayText={labels.summary.no_data} />}
    </SummaryCard>
  );
};
export default IntegrationHealthCard;
