import {
  FLEXIBLE_GRAPH_SVG_PADDING,
  GRAPH_HEIGHT,
  GRAPH_HORIZONTAL_BUFFER,
  GRAPH_VERTICAL_BUFFER,
  GRAPH_WIDTH,
} from 'ui/constants';
import { Group } from '@visx/group';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { AnalysisDataFragment, AnalysisResult, FeatureType, TimePeriod } from 'generated/graphql';
import { useContext, useMemo } from 'react';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { useHover } from 'hooks/useHover';
import { useTooltip } from '@visx/tooltip';
import { useRecoilState } from 'recoil';
import { analysisTooltipsCacheAtom } from 'atoms/analysisTooltipsCacheAtom';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { DatedData, LabelItem } from 'types/graphTypes';
import { Colors } from '@whylabs/observatory-lib';
import { AreaClosed, LinePath } from '@visx/shape';
import { getAlertTime } from 'utils/createAlerts';
import { ApolloError } from '@apollo/client';
import { useChartStyles } from 'hooks/useChartStyles';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useLegendHiding } from 'hooks/useLegendHiding';
import { useAdHoc } from 'atoms/adHocAtom';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import {
  getAlgorithmByString,
  thresholdAlgorithmMap,
} from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { WhyLabsText } from 'components/design-system';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { generateUnionArrays } from '../vizutils/dataUtils';
import { AlertIcons, BoxLegend, FlexibleFrame, HoverLine, StandardVerticalAxis } from '../components';
import { generateDatedXScale } from '../vizutils/scaleUtils';
import { mapAlgorithmsName } from '../quantile-chart/helpers';
import DateBottomAxis from '../components/DateBottomAxis';
import { AnalysisChartTooltip, AnalysisTooltipDatum } from './DistributionTooltip';
import { LegendShape, LINE_WIDTH, renderCircle, STANDARD_POINT_WIDTH } from '../vizutils/shapeUtils';
import { SelectedProfileLine } from '../components/HoverLine';
import NoDataChart from '../no-data-chart/NoDataChart';
import { getNoDataMessage } from '../vizutils/cardMessages';

const PEER_ADJUSTMENT_PIXELS = -20;

interface DriftLineVisxChartProps<DistributionDatedData> {
  data: DistributionDatedData[];
  analysisResults: AnalysisDataFragment[];
  height: number;
  width: number;
  batchFrequency?: TimePeriod;
  isCorrelatedAnomalies: boolean;
  totalError?: ApolloError;
  totalLoading?: boolean;
  manualColumnId: string;
  inferredType?: FeatureType;
}
const THRESHOLD = 'drift threshold';
export const DriftLineVisxChart = <DistributionDatedData extends DatedData>({
  width = GRAPH_WIDTH,
  height = GRAPH_HEIGHT,
  batchFrequency = TimePeriod.P1D,
  data,
  analysisResults,
  isCorrelatedAnomalies,
  totalLoading,
  totalError,
  manualColumnId,
  inferredType,
}: DriftLineVisxChartProps<DistributionDatedData>): JSX.Element => {
  const { classes: styles } = useCommonStyles();
  const { classes: chartStyles } = useChartStyles();
  const [adhocRunId] = useAdHoc();
  const algorithmType = getAlgorithmByString.get(analysisResults?.[0]?.algorithm ?? '');
  const algorithmLimits = thresholdAlgorithmMap.get(algorithmType);
  const softMinLimit = algorithmLimits?.min ?? 0;
  const softMaxLimit = algorithmLimits?.max ?? 1;
  const algorithmName = (algorithmType && mapAlgorithmsName.get(algorithmType)) || 'Drift distance';
  const graphWidth = width - PEER_ADJUSTMENT_PIXELS;
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);
  const [legendState, legendDispatch] = useLegendHiding();
  const filteredData = data.filter((d) => d.dateInMillis >= from && d.dateInMillis <= to);
  const filteredAnalysis = analysisResults.filter(
    (ar) => ar.datasetTimestamp && ar.datasetTimestamp >= from && ar.datasetTimestamp <= to,
  );
  const { datedData, alignedData, alignedEvents } = generateUnionArrays(
    filteredData,
    filteredAnalysis.filter((an) => !an.failureType),
    [from, to],
    batchFrequency,
  );

  const alerts = useMemo(() => filteredAnalysis.filter((an) => an.isAnomaly), [filteredAnalysis]);

  const calculatedYBoundLimits = useMemo(() => {
    const limits = { min: softMinLimit, max: 0 };
    filteredAnalysis?.forEach(({ drift_metricValue, drift_threshold }) => {
      const datapointMin = Math.min(drift_metricValue ?? 0, drift_threshold ?? 0);
      const datapointMax = Math.max(drift_metricValue ?? 0, drift_threshold ?? 0);
      if (datapointMin < limits.min) {
        limits.min = datapointMin;
      }
      if (datapointMax > limits.max) {
        limits.max = datapointMax;
      }
    });
    if (limits.max > softMaxLimit) {
      limits.max *= 1.1;
    }
    return limits;
  }, [filteredAnalysis, softMaxLimit, softMinLimit]);

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [height, GRAPH_VERTICAL_BUFFER],
        domain: [calculatedYBoundLimits.min, calculatedYBoundLimits.max],
      }).nice(),
    [calculatedYBoundLimits, height],
  );
  const xScale = useMemo(
    () => generateDatedXScale(datedData, graphWidth - GRAPH_HORIZONTAL_BUFFER, GRAPH_HORIZONTAL_BUFFER, 0, [from, to]),
    [datedData, graphWidth, from, to],
  );
  const [hoverState, hoverDispatch] = useHover();
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } =
    useTooltip<AnalysisTooltipDatum>();
  const [{ decorationType }] = useContext(WhyCardContext);
  const tooltipsStateKey = `${manualColumnId}--drift--${decorationType}`;
  const [tooltipsCache] = useRecoilState(analysisTooltipsCacheAtom);
  const profilesWithData = new Set(datedData.map((d) => d.dateInMillis).filter((_, i) => !!alignedData[i]));

  const getPointColor = (an?: AnalysisDataFragment) => {
    if (an?.isFalseAlarm) return Colors.grey;
    if (an?.isAnomaly) return adhocRunId ? Colors.chartOrange : Colors.red;
    return Colors.purple;
  };

  const renderDqePoints = () => {
    if (legendState.includes(algorithmName)) return null;
    return alignedEvents.map((dqe) => {
      if (dqe === null) {
        return null;
      }
      return renderCircle(
        xScale(dqe.datasetTimestamp ?? 0),
        yScale(dqe.drift_metricValue ?? 0),
        getPointColor(dqe),
        true,
        `drift-0th-key-${dqe.datasetTimestamp}`,
        STANDARD_POINT_WIDTH,
      );
    });
  };

  const legendColorScale = useMemo(
    () =>
      scaleOrdinal<string, string>({
        domain: [algorithmName, THRESHOLD],
        range: [Colors.chartPurple, Colors.quantileLight],
      }),
    [algorithmName],
  );

  const legendShapeScale = useMemo(
    () =>
      scaleOrdinal<string, LegendShape>({
        domain: [algorithmName, THRESHOLD],
        range: ['line', 'box'],
      }),
    [algorithmName],
  );

  const handleLegendClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };

  const renderLegend = (omittedLegendItems: string[]) => (
    <BoxLegend
      name="drift"
      colorScale={legendColorScale}
      shapeScale={legendShapeScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      onClick={handleLegendClick}
      omittedLegendItems={omittedLegendItems}
      hiddenLegendItems={legendState}
    />
  );

  const renderDriftLine = () => {
    const analysisData = alignedEvents.filter((ev) => !!ev) as AnalysisDataFragment[];
    return (
      <>
        {!legendState.includes(THRESHOLD) && (
          <AreaClosed<AnalysisResult>
            data={analysisData}
            x={(d) => xScale(d.datasetTimestamp as number)}
            y0={() => yScale(0)}
            y1={(d) => yScale(d.drift_threshold ?? 0)}
            yScale={yScale}
            fill={Colors.quantileLight}
            fillOpacity={0.55}
            stroke={Colors.quantileMedium}
          />
        )}
        {!legendState.includes(algorithmName) && (
          <LinePath
            data={analysisData}
            x={(d) => xScale(getAlertTime(d))}
            y={(d) => yScale(d!.drift_metricValue ?? 0)}
            stroke={Colors.chartPurple}
            strokeWidth={LINE_WIDTH}
          />
        )}
      </>
    );
  };

  const { getAnalysisState } = useStateUrlEncoder();

  const renderSelectedProfile = (): React.ReactNode => {
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    const { graphDecorationType } = actionState ?? {};
    const correlatedSectionActive = activeCorrelatedAnomalies?.referenceFeature;
    if (correlatedSectionActive || ['est_quantile_drift', 'drift_top_five'].includes(graphDecorationType ?? '')) {
      return <SelectedProfileLine xScale={xScale} height={height} yStart={GRAPH_VERTICAL_BUFFER} />;
    }
    return null;
  };

  const renderHoverLine = () => (
    <HoverLine
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      cardType="drift"
      allowBaselineComparison
      decorationCardType={decorationType}
      name="drift"
      data={datedData}
      profilesWithData={profilesWithData}
      xScale={xScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      hideTooltip={hideTooltip}
      graphLeftOffset={10}
      graphTopOffset={0}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      alerts={analysisResults.filter((an) => an.isAnomaly)}
      showTooltip={({ index, mouseY, mouseX }) => {
        showTooltip({
          tooltipData: tooltipsCache[tooltipsStateKey]?.[index],
          tooltipTop: mouseY,
          tooltipLeft: mouseX,
        });
      }}
    />
  );
  const renderTooltip = () => {
    if (!tooltipData) return null;
    return (
      <AnalysisChartTooltip
        tooltipOpen={tooltipOpen}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
        tooltipData={tooltipData}
      />
    );
  };

  const renderAlertIcons = () => (
    <AlertIcons
      cardType="drift"
      decorationCardType={decorationType}
      profilesWithData={profilesWithData}
      allowBaselineComparison
      name="quantile"
      data={datedData}
      xScale={xScale}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      hoverDispatch={hoverDispatch}
      alerts={alerts}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      showTooltip={({ index, mouseX, mouseY }) => {
        showTooltip({
          tooltipData: tooltipsCache[tooltipsStateKey]?.[index],
          tooltipTop: mouseY,
          tooltipLeft: mouseX,
        });
      }}
      hideTooltip={hideTooltip}
    />
  );

  const canDrawGraphs = !totalLoading && !totalError;
  const renderGraph = () => {
    const profilesCount = filteredAnalysis?.length;
    const unknownResourceType = inferredType === 'UNKNOWN';
    if (!profilesCount || unknownResourceType) {
      return (
        <div style={{ paddingRight: '19px' }}>
          <NoDataChart
            noDataMessage={getNoDataMessage(
              profilesCount,
              unknownResourceType ? 'unknownDistribution' : 'distribution',
              unknownResourceType,
              manualColumnId, // Note that here, this is the usedFeatureName because of what is passed in as props.
            )}
          />
        </div>
      );
    }
    return (
      <div className={styles.longGraphContainer} style={{ marginTop: 0 }}>
        <svg width={width} height={height + FLEXIBLE_GRAPH_SVG_PADDING}>
          <Group top={0} left={10}>
            <FlexibleFrame
              yScale={yScale}
              timeScale={xScale}
              ticksInMillis={datedData.map((d) => d.dateInMillis)}
              height={height + FLEXIBLE_GRAPH_SVG_PADDING}
              width={graphWidth}
              batchFrequency={batchFrequency}
              maxVerticalTicks={4}
            />
            {renderDriftLine()}
            {renderDqePoints()}
            <StandardVerticalAxis numTicks={4} yScale={yScale} label={algorithmName} />
            <DateBottomAxis
              height={height}
              width={width}
              xScale={xScale}
              ticksInMillis={datedData.map((d) => d.dateInMillis)}
              horizontalBuffer={GRAPH_HORIZONTAL_BUFFER}
              batchFrequency={batchFrequency}
            />
            {renderSelectedProfile()}
            {renderHoverLine()}
            {renderAlertIcons()}
          </Group>
        </svg>
        {renderLegend([])}
        {renderTooltip()}
      </div>
    );
  };

  return (
    <>
      {!canDrawGraphs && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            minHeight: '50px',
            width: 'calc(100% - 20px)',
          }}
        >
          <WhyLabsText inherit className={chartStyles.errorMessage}>
            An error occurred while fetching data
          </WhyLabsText>
        </div>
      )}
      {canDrawGraphs && renderGraph()}
    </>
  );
};
