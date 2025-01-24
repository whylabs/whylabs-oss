import { useMemo } from 'react';

import { GRAPH_WIDTH, GRAPH_VERTICAL_BUFFER, FLEXIBLE_GRAPH_SVG_PADDING } from 'ui/constants';
import { useHover } from 'hooks/useHover';
import { curveLinear } from '@visx/curve';
import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { useTooltip } from '@visx/tooltip';

import { useDeepCompareMemo } from 'use-deep-compare';
import { getMinAndMaxValueFromArray } from 'utils/numberUtils';
import { areAllDefinedAndNonNull } from 'utils';
import { AnalysisDataFragment, ThresholdAnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { LineChartDatum } from 'types/graphTypes';
import { mapReverse } from 'utils/arrayUtils';
import { useRecoilState } from 'recoil';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { Colors } from '@whylabs/observatory-lib';
import { getThresholdDomain, getThresholdLower, getThresholdUpper } from 'utils/analysisUtils';
import MetricThresholdTooltip from 'components/tooltips/MetricThresholdTooltip';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { useLegendHiding } from 'hooks/useLegendHiding';
import { isNumber } from 'utils/typeGuards';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { generateDatedXScale } from '../vizutils/scaleUtils';
import { BoxLegend, DateBottomAxis, HoverLine, AlertIcons, StandardVerticalAxis, FlexibleFrame } from '../components';
import { LegendShape, renderCircle, STANDARD_POINT_WIDTH } from '../vizutils/shapeUtils';
import { generateUnionArrays } from '../vizutils/dataUtils';
import NoDataChart from '../no-data-chart/NoDataChart';
import {
  createAreaDataForAnomalyThresholds,
  filterEmptyAndInvalidAnomalyThresholds,
  MonitorThresholdName,
  pickMonitorThresholdName,
} from '../vizutils/thresholdUtils';
import { generateYRange } from './rangeUtils';

const GRAPH_HEIGHT = 201;
const GRAPH_LEFT_BUFFER = 48;
const GRAPH_RIGHT_BUFFER = 16;

interface FlexibleLineVisxChartProps {
  datedData: LineChartDatum[];
  dateRange?: [number, number];
  batchFrequency?: TimePeriod;
  name: string;
  navigationInformation?: {
    resourceId?: string;
    segment?: ParsedSegment;
    columnId?: string;
    customDateRange?: SimpleDateRange;
  };
  height?: number;
  width?: number;
  verticalOffset?: number;
  fixedYRange?: [number, number];
  graphLabel?: string;
  analysisResults: AnalysisDataFragment[];
  hideLegend?: boolean;
}

interface TooltipDatum {
  timestamp: number;
  data: {
    label: string;
    value: number | null;
    color: string;
    minValue: number | null;
    maxValue: number | null;
  } | null;
  analysisResult?: ThresholdAnalysisDataFragment;
}

const FlexibleLineVisxChart: React.FC<FlexibleLineVisxChartProps> = ({
  datedData,
  dateRange,
  batchFrequency = TimePeriod.P1D,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  verticalOffset = 0,
  graphLabel = '',
  hideLegend = false,
  fixedYRange,
  analysisResults,
  navigationInformation,
  name,
}) => {
  const THRESHOLD_LABEL = `${upperCaseFirstLetterOnly(graphLabel)} threshold`;
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipDatum>();
  const graphWidth = width - GRAPH_RIGHT_BUFFER;
  const [legendState, legendDispatch] = useLegendHiding();
  const [hoverState, hoverDispatch] = useHover();
  const numLines = Math.max(...datedData.map((d) => d?.values?.length ?? 0));
  const metricLabel = datedData?.[0]?.labels?.[0] ?? '';
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);
  const colorDomain = useMemo(() => {
    if (!datedData[0]) return [];
    return [
      [metricLabel, datedData[0].colors[0]],
      [THRESHOLD_LABEL, Colors.quantileLight],
    ];
  }, [THRESHOLD_LABEL, datedData, metricLabel]);
  datedData.sort((a, b) => a.dateInMillis - b.dateInMillis);

  const { datedData: updatedDatedData, alignedData } = useDeepCompareMemo(
    () =>
      dateRange ? generateUnionArrays(datedData, [], dateRange, batchFrequency) : { datedData, alignedData: datedData },
    [datedData, batchFrequency, dateRange],
  );

  const xScale = useDeepCompareMemo(
    () => generateDatedXScale(updatedDatedData, graphWidth - GRAPH_RIGHT_BUFFER, GRAPH_LEFT_BUFFER),
    [updatedDatedData, width],
  );

  const thresholdDomain = useMemo(() => getThresholdDomain(analysisResults), [analysisResults]);

  const displayedRange =
    fixedYRange ??
    getMinAndMaxValueFromArray([
      ...datedData.reduce<number[]>((acc, d) => [...acc, ...d.values], []),
      ...thresholdDomain,
    ]);

  const yScale = generateYRange({
    fixedYRange: undefined,
    graphTop: height,
    graphBottom: GRAPH_VERTICAL_BUFFER,
    valueRange: displayedRange,
  });

  const colorScale = useMemo(
    () =>
      scaleOrdinal<string, string>({
        domain: colorDomain.map((pair) => pair[0]),
        range: colorDomain.map((pair) => pair[1]),
      }),
    [colorDomain],
  );

  const legendShapeScale = useMemo(
    () =>
      scaleOrdinal<string, LegendShape>({
        domain: colorDomain.map((pair) => pair[0]),
        range: ['line', 'box'],
      }),
    [colorDomain],
  );

  const renderLegend = () => (
    <BoxLegend
      name="monitor-output"
      colorScale={colorScale}
      shapeScale={legendShapeScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      capitalize={false}
      onClick={(item) => legendDispatch(item.datum)}
    />
  );
  const renderNoData = () => {
    return (
      <div style={{ width, display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <NoDataChart noDataMessage="Insufficient data available for time period." />
      </div>
    );
  };
  const mappedAnalysisProfiles = useMemo(() => {
    return new Map<number, Partial<AnalysisDataFragment>>(
      analysisResults
        ? analysisResults?.map(({ isAnomaly, datasetTimestamp, isFalseAlarm }) => [
            datasetTimestamp ?? 0,
            { isAnomaly, datasetTimestamp, isFalseAlarm },
          ])
        : [],
    );
  }, [analysisResults]);

  if (!datedData?.length || numLines < 1) {
    return renderNoData();
  }
  const nonEmptyMappedAnomalies = filterEmptyAndInvalidAnomalyThresholds(analysisResults);
  const usedMonitorThresholdName = pickMonitorThresholdName(nonEmptyMappedAnomalies);
  const areaData = createAreaDataForAnomalyThresholds(nonEmptyMappedAnomalies);

  const renderForecastAreaSegments = () => {
    if (legendState.includes(THRESHOLD_LABEL)) return null;
    return (
      <>
        {areaData
          .filter((seg) => seg.length > 0)
          .map((seg, idx) => (
            <AreaClosed
              data={seg}
              key={`forecast-area-${Math.random()}`}
              x={(d) => xScale(d.x)}
              y0={(d) => {
                const [domainMin] = yScale.domain();
                if (usedMonitorThresholdName === MonitorThresholdName.Upper) return yScale(domainMin);
                const lower = isNumber(d.y0) ? yScale(d.y0) : null;
                const upper = isNumber(d.y1) ? yScale(d.y1) : null;
                return lower ?? upper ?? domainMin;
              }}
              y1={(d) => {
                const [domainMin, domainMax] = yScale.domain();
                if (usedMonitorThresholdName === MonitorThresholdName.Lower) return yScale(domainMax);
                const lower = isNumber(d.y0) ? yScale(d.y0) : null;
                const upper = isNumber(d.y1) ? yScale(d.y1) : null;
                return upper ?? lower ?? domainMin;
              }}
              yScale={yScale}
              fill={Colors.quantileMedium}
              fillOpacity={0.5}
              stroke={Colors.quantileMedium}
              strokeOpacity={1}
            />
          ))}
      </>
    );
  };

  const getDatumDotColor = (defaultColor: string, datasetTimestamp?: number) => {
    const foundAnalysis = datasetTimestamp && mappedAnalysisProfiles.get(datasetTimestamp);
    if (!foundAnalysis || !foundAnalysis.isAnomaly) return defaultColor;
    if (foundAnalysis.isFalseAlarm) return Colors.grey;
    return Colors.red;
  };

  const renderLinePoints = () => {
    if (legendState.includes(metricLabel)) return null;
    return (
      <>
        {alignedData.map((datum, alignedIndex) => {
          if (datum === null) {
            return null;
          }
          const xPosition = xScale(datum.dateInMillis);

          return mapReverse(datum.values, (yVal, idx) => {
            const colorSize = datum.colors.length;
            const defaultColor = datum.colors[idx % colorSize];
            const usedColor = getDatumDotColor(defaultColor, datum.dateInMillis);
            return renderCircle(
              xPosition,
              yScale(yVal),
              usedColor,
              true,
              `line-point-${idx}-${alignedIndex}-${xPosition}`,
              STANDARD_POINT_WIDTH,
            );
          });
        })}
      </>
    );
  };

  const profilesWithData = new Set(datedData.map((d) => d.dateInMillis));
  const tooltipDataForRender = (index: number) => {
    const profileData = alignedData[index];
    const timestamp = updatedDatedData[index]?.dateInMillis ?? 0;
    const analysis = analysisResults?.find((an) => an?.datasetTimestamp === timestamp);
    return {
      timestamp,
      label: upperCaseFirstLetterOnly(graphLabel),
      value: profileData?.values[0] ?? null,
      color: Colors.chartPrimary,
      minValue: getThresholdLower(analysis) ?? null,
      maxValue: getThresholdUpper(analysis) ?? null,
    };
  };
  const renderHoverLine = () => (
    <HoverLine
      name={name}
      data={updatedDatedData}
      isCorrelatedAnomalies={false}
      profilesWithData={profilesWithData}
      xScale={xScale}
      alerts={analysisResults.filter((an) => an.isAnomaly)}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      hideTooltip={hideTooltip}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      navigationInformation={navigationInformation}
      graphWidth={graphWidth}
      graphLeftOffset={10}
      graphTopOffset={0}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            data: tooltipDataForRender(index),
            timestamp: updatedDatedData[index]?.dateInMillis,
            analysisResult: analysisResults.find(
              (an) => an?.datasetTimestamp === updatedDatedData[index]?.dateInMillis,
            ),
          },
          tooltipTop: top + verticalOffset,
          tooltipLeft: left,
        });
      }}
    />
  );

  const renderAlertIcons = () => (
    <AlertIcons
      name="simple-line"
      isCorrelatedAnomalies={false}
      data={updatedDatedData}
      profilesWithData={profilesWithData}
      xScale={xScale}
      hoverDispatch={hoverDispatch}
      navigationInformation={navigationInformation}
      alerts={analysisResults.filter((an) => an.isAnomaly)}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      hackToFixAlertInLLMS
      graphWidth={width}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            data: tooltipDataForRender(index),
            timestamp: updatedDatedData[index]?.dateInMillis,
            analysisResult: analysisResults.find(
              (an) => an?.datasetTimestamp === updatedDatedData[index]?.dateInMillis,
            ),
          },
          tooltipTop: top + verticalOffset,
          tooltipLeft: left,
        });
      }}
      hideTooltip={hideTooltip}
    />
  );

  const renderTooltip = () => {
    if (drawnMenuState.open || !tooltipOpen || !areAllDefinedAndNonNull(tooltipLeft, tooltipTop, tooltipData)) {
      return null;
    }

    const tooltipMetric = {
      label: upperCaseFirstLetterOnly(graphLabel),
      value: tooltipData?.data?.value,
      color: colorScale(colorDomain[0][0]),
      shape: 'line',
    };
    return (
      <MetricThresholdTooltip
        analysisResult={tooltipData?.analysisResult}
        batchFrequency={batchFrequency}
        metrics={[tooltipMetric]}
        primaryMetricLabel={upperCaseFirstLetterOnly(graphLabel)}
        open={tooltipOpen && !drawnMenuState.open}
        timestamp={tooltipData?.timestamp}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
      />
    );
  };

  const renderLines = () => {
    if (legendState.includes(metricLabel)) return null;
    return (
      <>
        {mapReverse([...Array(numLines).fill(0)], (_, idx) => {
          return (
            <LinePath<LineChartDatum>
              key={`linepath-${colorDomain[idx][0]}`}
              data={datedData}
              curve={curveLinear}
              x={(d) => xScale(d?.dateInMillis)}
              y={(d) => yScale(d?.values?.[idx])}
              stroke={colorScale(colorDomain[idx][0])}
              strokeWidth={1}
              shapeRendering="geometricPrecision"
            />
          );
        })}
      </>
    );
  };

  return (
    <>
      <svg width={width} height={height + FLEXIBLE_GRAPH_SVG_PADDING}>
        <Group top={0} left={10}>
          <FlexibleFrame
            yScale={yScale}
            timeScale={xScale}
            ticksInMillis={datedData.map((d) => d?.dateInMillis)}
            height={height + FLEXIBLE_GRAPH_SVG_PADDING}
            width={graphWidth}
            batchFrequency={batchFrequency}
            horizontalBuffer={GRAPH_LEFT_BUFFER}
            endHorizontalBuffer={GRAPH_RIGHT_BUFFER}
          />
          {renderForecastAreaSegments()}
          {renderLines()}
          {renderLinePoints()}
          <StandardVerticalAxis yScale={yScale} label={graphLabel} squishText />
          <DateBottomAxis
            xScale={xScale}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            horizontalBuffer={GRAPH_LEFT_BUFFER + 16}
            height={height}
            width={graphWidth}
            batchFrequency={batchFrequency}
            avoidLastTick
          />
          {renderAlertIcons()}
          {renderHoverLine()}
        </Group>
      </svg>
      {!hideLegend && renderLegend()}
      {renderTooltip()}
    </>
  );
};

export default FlexibleLineVisxChart;
