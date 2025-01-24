import { useCallback, useEffect, useMemo, useState } from 'react';
import { Paper } from '@mantine/core';
import { useElementSize } from 'hooks/useElementSize';
import { Colors, HtmlTooltip, SafeLink } from '@whylabs/observatory-lib';
import NoDataChart from 'components/visualizations/no-data-chart/NoDataChart';
import useWhyCardStyles from 'components/cards/why-card/useWhyCardStyles';
import {
  AnalysisMetric,
  GetStatisticalValueAnalysisQuery,
  Maybe,
  ModelType,
  NumberSummaryFieldsFragment,
  ThresholdAnalysisDataFragment,
  TimePeriod,
} from 'generated/graphql';
import { ApolloError } from '@apollo/client';
import SingleValuesVisxChart, {
  decorationToGraphType,
  GraphType,
} from 'components/visualizations/single-values-chart/SingleValuesVisxChart';
import { DatedKeyedQuantileSummary } from 'utils/createDatedQuantiles';
import { STANDARD_GRAPH_HORIZONTAL_BORDERS } from 'ui/constants';
import ChartToggler from 'components/chart-toggler/ChartToggler';
import MonitoringMonitorDropdown from 'components/feature-monitor-dropdown/MonitoringMonitorDropdown';
import { useAdHoc } from 'atoms/adHocAtom';
import { simpleStringifySegment } from 'pages/page-types/pageUrlQuery';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import { PairedTimestamp } from 'components/visualizations/utils';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { WhyLabsText } from 'components/design-system';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { getNoDataMessage } from 'components/visualizations/vizutils/cardMessages';
import { WhyCardDecorationType } from '../why-card/WhyCardTexts';
import { useSVCardStyles } from './useSVCardsStyle';

interface SingleValueCardProps {
  sketches:
    | {
        __typename?: 'FeatureSketch' | undefined;
        datasetTimestamp?: Maybe<number> | undefined;
        showAsDiscrete: boolean;
        numberSummary?: NumberSummaryFieldsFragment | null | undefined;
      }[]
    | undefined;
  legacyData: DatedKeyedQuantileSummary[];
  error: ApolloError | undefined;
  loading: boolean;
  batchFrequency?: TimePeriod;
  anomaliesData?: GetStatisticalValueAnalysisQuery | undefined;
  manualColumnId?: string;
  isCorrelatedAnomalies?: boolean;
  isOutput?: boolean;
  columnName: string;
}

const ADJUSTING_GRAPH_WIDTH = 25;

const metricToGraphMapper = new Map<AnalysisMetric, GraphType>([
  [AnalysisMetric.Median, GraphType.EstMedian],
  [AnalysisMetric.Mean, GraphType.Mean],
  [AnalysisMetric.Min, GraphType.Min],
  [AnalysisMetric.Max, GraphType.Max],
  [AnalysisMetric.StdDev, GraphType.StdDev],
  [AnalysisMetric.Quantile_99, GraphType.Quantile99],
]);

const graphToMetricMapper = new Map<GraphType, AnalysisMetric>([
  [GraphType.EstMedian, AnalysisMetric.Median],
  [GraphType.Mean, AnalysisMetric.Mean],
  [GraphType.Min, AnalysisMetric.Min],
  [GraphType.Max, AnalysisMetric.Max],
  [GraphType.StdDev, AnalysisMetric.StdDev],
  [GraphType.Quantile99, AnalysisMetric.Quantile_99],
]);

const graphTypeToCardDecoration = new Map<GraphType, WhyCardDecorationType>([
  [GraphType.EstMedian, 'single_values_est_median'],
  [GraphType.Mean, 'single_values_mean'],
  [GraphType.Min, 'single_values_min'],
  [GraphType.Max, 'single_values_max'],
  [GraphType.StdDev, 'single_values_stddev'],
  [GraphType.Quantile99, 'single_values_q99'],
]);

type GraphItem = {
  color: string;
  label: GraphType;
  values: (number | null)[];
};

export const SingleValueCard: React.FC<SingleValueCardProps> = ({
  sketches,
  error,
  legacyData,
  loading,
  batchFrequency,
  anomaliesData = undefined,
  isCorrelatedAnomalies = false,
  manualColumnId,
  isOutput,
  columnName,
}) => {
  const { getNavUrl } = useNavLinkHandler();
  const { modelId, segment } = usePageTypeWithParams();
  const { classes: styles, cx } = useSVCardStyles();
  const {
    resourceState: { resource },
  } = useResourceContext();
  const showCreateMonitorButton = resource?.type === ModelType.Llm;
  const { classes: stylesFromWhyCard } = useWhyCardStyles();
  const [timestamps, setTimestamps] = useState<PairedTimestamp[]>([]);
  const [ref, size] = useElementSize();

  const [graphList, setGraphList] = useState<GraphItem[]>([]);
  const [hasNumberSummary, setHasNumberSummary] = useState(false);
  const [activeGraph, setActiveGraph] = useState<GraphItem | undefined>(undefined);

  const [hasGraphData, setHasGraphData] = useState(false);
  const [activeGraphLabel, setActiveGraphLabel] = useState<GraphType>();
  const [analyzer, setAnalyzer] = useState('');
  const [adHocRunId] = useAdHoc();
  const { getAnalysisState } = useStateUrlEncoder();
  const decorationType: WhyCardDecorationType =
    (activeGraphLabel && graphTypeToCardDecoration.get(activeGraphLabel)) || 'unknown';
  const handleGraphDataShowChange = useCallback(
    (type: string) => {
      const foundGraph = graphList.find((graph) => graph.label === type);
      setActiveGraph(foundGraph);
      setHasGraphData(foundGraph !== undefined && !foundGraph.values.every((value) => value === null));
      setActiveGraphLabel(type as GraphType);
    },
    [graphList],
  );

  const getFeatureInputLink = () => {
    return getNavUrl({
      page: isOutput ? 'output' : 'columns',
      modelId,
      segmentTags: { tags: segment.tags },
      featureName: manualColumnId,
    });
  };

  const handleActiveGraph = useCallback(() => {
    if (loading) return;
    const actionStateDecoration = getAnalysisState(ACTION_STATE_TAG)?.graphDecorationType;
    const foundLabel = decorationToGraphType.get(actionStateDecoration ?? 'unknown');
    const firstRelevantAnalysis =
      anomaliesData?.analysisResults?.find((an) => an.isAnomaly)?.metric ?? anomaliesData?.analysisResults?.[0]?.metric;
    const defaultChart = firstRelevantAnalysis && metricToGraphMapper.get(firstRelevantAnalysis);
    if (adHocRunId) handleGraphDataShowChange(defaultChart ?? GraphType.EstMedian);
    else handleGraphDataShowChange(foundLabel ?? defaultChart ?? GraphType.EstMedian);
  }, [anomaliesData?.analysisResults, getAnalysisState, handleGraphDataShowChange, loading, adHocRunId]);

  useEffect(() => {
    if (sketches) {
      const hasNumberSummaryVar =
        sketches.length > 0 ? sketches.every((sketch) => sketch.numberSummary !== undefined) : false;
      setHasNumberSummary(hasNumberSummaryVar);
      if (hasNumberSummaryVar) {
        const medianValues =
          sketches?.map(
            (sketch) =>
              sketch.numberSummary?.quantiles.bins.reduce((acc: number | null, curr, index) => {
                if (!sketch.numberSummary?.quantiles.counts) {
                  return acc;
                }
                if (Math.abs(curr - 0.5) < 0.001 && sketch.numberSummary?.quantiles.counts.length > index) {
                  return sketch.numberSummary?.quantiles.counts[index];
                }
                return acc;
              }, null) ?? null,
          ) || [];

        const q99Values =
          sketches?.map(
            (sketch) =>
              sketch.numberSummary?.quantiles.bins.reduce((acc: number | null, curr, index) => {
                if (!sketch.numberSummary?.quantiles.counts) {
                  return acc;
                }
                if (Math.abs(curr - 0.99) < 0.001 && sketch.numberSummary?.quantiles.counts.length > index) {
                  return sketch.numberSummary?.quantiles.counts[index];
                }
                return acc;
              }, null) ?? null,
          ) || [];

        setGraphList([
          {
            label: GraphType.EstMedian,
            values: medianValues,
            color: Colors.chartPrimary,
          },
          {
            label: GraphType.Mean,
            color: Colors.chartPrimary,
            values:
              sketches?.map((sketch) => {
                return sketch.numberSummary ? (sketch.numberSummary?.mean as number) : null;
              }) || [],
          },
          {
            label: GraphType.Min,
            values:
              sketches?.map((sketch) => {
                return sketch.numberSummary ? (sketch.numberSummary?.min as number) : null;
              }) || [],
            color: Colors.chartPrimary,
          },
          {
            label: GraphType.Max,
            values:
              sketches?.map((sketch) => {
                return sketch.numberSummary ? (sketch.numberSummary.max as number) : null;
              }) || [],
            color: Colors.chartPrimary,
          },
          {
            label: GraphType.StdDev,
            values:
              sketches?.map((sketch) => {
                return sketch.numberSummary ? (sketch.numberSummary.stddev as number) : null;
              }) || [],
            color: Colors.chartPrimary,
          },
          {
            label: GraphType.Quantile99,
            values: q99Values,
            color: Colors.chartPrimary,
          },
        ]);
        setTimestamps(
          sketches.map((sketch) => ({
            timestamp: sketch.datasetTimestamp ?? 0,
            lastUploadTimestamp: sketch.datasetTimestamp ?? undefined,
          })),
        );

        setHasGraphData(!medianValues.every((el) => el === null));
      }
    } else {
      setHasGraphData(false);
      setGraphList([]);
    }
  }, [sketches]);

  useEffect(() => {
    if (sketches) {
      handleActiveGraph();
    } else {
      setActiveGraph(undefined);
    }
  }, [handleActiveGraph, sketches]);

  const getAnalysisResultsByMetric = useCallback(
    (
      label: GraphType | undefined,
      analysisResults: ThresholdAnalysisDataFragment[],
    ): ThresholdAnalysisDataFragment[] => {
      const foundGraph = label && graphToMetricMapper.get(label);
      if (label !== undefined && foundGraph) {
        return analysisResults.filter((ar) => ar.metric === foundGraph);
      }
      return [];
    },
    [],
  );

  function getAlertNumber(type: GraphType): number {
    const graphAlerts = getAnalysisResultsByMetric(type, anomaliesData?.analysisResults ?? []);
    const num = graphAlerts.reduce((acc, curr) => {
      if (curr.isAnomaly && !curr.isFalseAlarm) return acc + 1;

      return acc;
    }, 0);

    return num;
  }

  const foundDataAnomales = anomaliesData?.analysisResults?.some((ar) => ar.isAnomaly && !ar.isFalseAlarm);
  const hasAnomalies = !isCorrelatedAnomalies && foundDataAnomales;

  const filteredAnalyzerAnomalies = useMemo(
    () =>
      getAnalysisResultsByMetric(activeGraph?.label, anomaliesData?.analysisResults ?? []).filter(
        (an) => an.analyzerId === analyzer,
      ),
    [activeGraph?.label, analyzer, anomaliesData?.analysisResults, getAnalysisResultsByMetric],
  );

  const renderTitle = () => {
    const title = 'Statistical values';
    if (isCorrelatedAnomalies) {
      return (
        <>
          <SafeLink sameTab primaryColor href={getFeatureInputLink()} text={manualColumnId ?? ''} /> - {title}
        </>
      );
    }
    return manualColumnId ? `${manualColumnId} - ${title}` : title;
  };

  const cardHeaderClassName = (() => {
    if (hasAnomalies && !isCorrelatedAnomalies) {
      return adHocRunId ? stylesFromWhyCard.adHoc : stylesFromWhyCard.alert;
    }
    return '';
  })();

  const cardClassName = (() => {
    if (hasAnomalies && !isCorrelatedAnomalies) {
      return adHocRunId ? stylesFromWhyCard.adHocBorder : stylesFromWhyCard.alertBorder;
    }
    return '';
  })();

  // Always fetch a no data message to display in case we have an invalid column.
  const noDataMessage = getNoDataMessage(0, 'statistical', false, columnName);
  const renderContent = () => (
    <div style={{ flex: '1 0 auto', position: 'relative' }} className={cx(styles.longContainerOnFeaturePage)}>
      <Paper
        className={cx(stylesFromWhyCard.cardCommon, styles.updateCardCommon, cardClassName, {
          [stylesFromWhyCard.noBorder]: isCorrelatedAnomalies,
        })}
      >
        <div style={{ display: 'flex', alignItems: 'center' }} className={styles.cardHeader}>
          <div className={cx(styles.header)}>
            <span className={cardHeaderClassName}>{renderTitle()}</span>
            <HtmlTooltip tooltipContent="A chart showing single statistical values and predictions over time." />
          </div>
          <div>
            <MonitoringMonitorDropdown
              showCreateMonitorButton={showCreateMonitorButton}
              analysisResults={getAnalysisResultsByMetric(activeGraph?.label, anomaliesData?.analysisResults ?? [])}
              setAnalyzer={setAnalyzer}
              analyzer={analyzer}
              analyzerRecoilKey={`segment--${simpleStringifySegment(segment)}--singleValues`}
              cardType="singleValues"
            />
          </div>
          {graphList.length > 0 && (
            <div className={styles.chartTogglerWrap}>
              <ChartToggler
                onChange={handleGraphDataShowChange}
                selectedValue={activeGraph?.label}
                items={graphList.map((graph) => {
                  return {
                    label: graph.label,
                    alertNumber: getAlertNumber(graph.label),
                  };
                })}
              />
            </div>
          )}
        </div>

        {loading && (
          <WhyLabsText className={styles.longGraphMessage} size={14}>
            Loading...
          </WhyLabsText>
        )}
        {hasGraphData && !loading && (
          <div className={styles.graphWrap} ref={ref}>
            <SingleValuesVisxChart
              cardType="singleValues"
              manualColumnId={manualColumnId}
              legacyData={legacyData}
              height={186}
              width={size.width - STANDARD_GRAPH_HORIZONTAL_BORDERS - ADJUSTING_GRAPH_WIDTH}
              name="Single Values"
              timestamps={timestamps}
              data={activeGraph ? [activeGraph] : []}
              yRange={undefined}
              activeGraphType={activeGraphLabel}
              percentage={false}
              showForecast
              labelForSingleValues={activeGraphLabel}
              batchFrequency={batchFrequency}
              anomalies={filteredAnalyzerAnomalies}
              useAnomalies
              runningAdHoc={!!adHocRunId}
              isCorrelatedAnomalies={isCorrelatedAnomalies}
              decorationCardType={decorationType}
            />
          </div>
        )}
        {!hasGraphData && !loading && !error && <NoDataChart noDataMessage={noDataMessage} />}
        {!hasGraphData && !loading && error && (
          <WhyLabsText className={styles.longGraphMessage} size={14}>
            An error occurred while fetching data
          </WhyLabsText>
        )}
      </Paper>
    </div>
  );

  return <>{hasNumberSummary && renderContent()}</>;
};
