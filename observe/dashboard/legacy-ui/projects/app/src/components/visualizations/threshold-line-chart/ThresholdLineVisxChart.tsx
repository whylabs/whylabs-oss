import { useContext, useMemo } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { curveLinear } from '@visx/curve';
import { Group } from '@visx/group';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { LinePath, AreaClosed } from '@visx/shape';
import { useTooltip } from '@visx/tooltip';
import { useDeepCompareMemo } from 'use-deep-compare';
import { getThresholdUpper, getThresholdLower } from 'utils/analysisUtils';
import {
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  Y_RANGE_BUFFER_RATIO,
  GRAPH_VERTICAL_BUFFER,
  GRAPH_HORIZONTAL_BUFFER,
  FLEXIBLE_GRAPH_SVG_PADDING,
  STANDARD_GRAPH_HORIZONTAL_BORDERS,
} from 'ui/constants';
import { useHover } from 'hooks/useHover';
import { MissingValue } from 'utils/createMissingValues';
import { getMinAndMaxValueFromArray } from 'utils/numberUtils';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { AnalysisResult, ThresholdAnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { useRecoilState } from 'recoil';
import { manualThresholdInputAtom, ManualThresholdInputProps } from 'atoms/manualThresholdInputAtom';
import { useAdHoc } from 'atoms/adHocAtom';
import { LabelItem } from 'types/graphTypes';
import { useLegendHiding } from 'hooks/useLegendHiding';
import MetricThresholdTooltip from 'components/tooltips/MetricThresholdTooltip';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { BoxLegend, DateBottomAxis, AlertIcons, HoverLine, StandardVerticalAxis } from '../components';
import { generateDatedXScale } from '../vizutils/scaleUtils';
import { LegendShape, LINE_WIDTH, renderCircle, STANDARD_POINT_WIDTH } from '../vizutils/shapeUtils';
import FlexibleFrame from '../components/FlexibleFrame';
import { generateUnionArrays } from '../vizutils/dataUtils';
import { SelectedProfileLine } from '../components/HoverLine';
import { WhyCardContext } from '../../cards/why-card/WhyCardContext';
import {
  DEFAULT_THRESHOLD_AREA_FILL_OPACITY,
  DEFAULT_THRESHOLD_AREA_STROKE,
  filterEmptyAndInvalidAnomalyThresholds,
  pickMonitorThresholdName,
} from '../vizutils/thresholdUtils';

interface ThresholdLineVisxChartProps {
  data: MissingValue[];
  height?: number;
  width?: number;
  batchFrequency?: TimePeriod;
  analysis?: ThresholdAnalysisDataFragment[];
  showRatio?: boolean;
  isCorrelatedAnomalies: boolean;
  manualColumnId?: string;
}

const MIN_Y_RANGE = 0.2;

interface TooltipDatum {
  timestamp: number;
  lastUploadTimestamp?: number;
  value: number | null | undefined;
  analysisResult?: AnalysisResult;
}

const PREVIEW_MIN_THRESHOLD = 'preview min threshold';
const PREVIEW_MAX_THRESHOLD = 'preview max threshold';

const ThresholdLineVisxChart: React.FC<ThresholdLineVisxChartProps> = ({
  data,
  showRatio = false,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  batchFrequency = TimePeriod.P1D,
  analysis = [],
  isCorrelatedAnomalies,
  manualColumnId,
}) => {
  const { classes: styles } = useCommonStyles();
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);

  const [hoverState, hoverDispatch] = useHover();
  const [manualPreview] = useRecoilState<ManualThresholdInputProps>(manualThresholdInputAtom);
  const [legendState, legendDispatch] = useLegendHiding();

  const MISSING_RATIO = 'Missing value ratio';
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const graphWidth = width - STANDARD_GRAPH_HORIZONTAL_BORDERS;
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipDatum>();
  const [adHocRunId] = useAdHoc();
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);
  const [{ decorationType }] = useContext(WhyCardContext);
  data.sort((a, b) => a.dateInMillis - b.dateInMillis);
  const filteredData = data.filter((d) => d.dateInMillis >= from && d.dateInMillis <= to);
  const { datedData, alignedData } = useDeepCompareMemo(
    () => generateUnionArrays(filteredData, [], [from, to], batchFrequency),
    [filteredData, batchFrequency, from, to],
  );
  const xScale = useDeepCompareMemo(
    () => generateDatedXScale(datedData, graphWidth - GRAPH_HORIZONTAL_BUFFER, GRAPH_HORIZONTAL_BUFFER, 0, [from, to]),
    [datedData, width],
  );

  const analysisResults = useMemo(
    () =>
      analysis.filter(
        (a) => (showRatio && a.metric === 'COUNT_NULL_RATIO') || (!showRatio && a.metric === 'COUNT_NULL'),
      ),
    [analysis, showRatio],
  );

  const nonEmptyMappedAnomalies = filterEmptyAndInvalidAnomalyThresholds(analysisResults);
  const usedMonitorThresholdName = pickMonitorThresholdName(nonEmptyMappedAnomalies);

  const yScale = useDeepCompareMemo(() => {
    const [minY, maxY] = getMinAndMaxValueFromArray([
      ...filteredData.map((d) => (showRatio ? d.nullRatio : d.nullCount)),
      ...analysisResults.map((an) => getThresholdUpper(an) as number),
    ]);
    const usedMaxY = minY === maxY ? maxY + MIN_Y_RANGE : maxY;
    const graphMaxY = usedMaxY * (1 + Y_RANGE_BUFFER_RATIO);
    return scaleLinear<number>({
      range: [height, GRAPH_VERTICAL_BUFFER],
      round: true,
      domain: [0, graphMaxY],
    }).nice();
  }, [filteredData, showRatio]);

  const missingValueLabel = showRatio ? 'Missing value ratio' : 'Missing value count';

  const domain = [missingValueLabel, usedMonitorThresholdName, PREVIEW_MIN_THRESHOLD, PREVIEW_MAX_THRESHOLD];
  const colorScale = scaleOrdinal<string, string>({
    domain,
    range: [Colors.chartPrimary, Colors.quantileLight, Colors.brandSecondary600, Colors.brandSecondary600],
  });
  const shapeScale = scaleOrdinal<string, LegendShape>({
    domain,
    range: ['line', 'box', 'linedash', 'linedash'],
  });

  const nonEmptyData = useMemo(() => alignedData.filter((d) => !!d) as MissingValue[], [alignedData]);
  const anomalies = useMemo(() => analysisResults.filter((a) => a.isAnomaly), [analysisResults]);

  const renderLegend = (omittedLegendItems: string[]) => (
    <BoxLegend
      name="missing-value"
      colorScale={colorScale}
      shapeScale={shapeScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      onClick={handleClick}
      omittedLegendItems={omittedLegendItems}
      hiddenLegendItems={legendState}
    />
  );
  const handleClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };

  const getGrayOrRedDot = (timestamp: number): string => {
    const tempAnomaly = anomalies.find((an) => an.datasetTimestamp === timestamp && an.isAnomaly);
    if (adHocRunId) {
      return Colors.chartOrange;
    }
    if (!tempAnomaly || tempAnomaly.isFalseAlarm) {
      return Colors.grey;
    }
    return Colors.red;
  };

  const renderLinePoints = () => {
    return (
      !legendState.includes(MISSING_RATIO) && (
        <>
          {nonEmptyData.map((datum) => {
            return renderCircle(
              xScale(datum.dateInMillis),
              yScale(showRatio ? datum.nullRatio : datum.nullCount),
              anomalies.find((anomaly) => anomaly.datasetTimestamp === datum.dateInMillis)
                ? getGrayOrRedDot(datum.dateInMillis)
                : colorScale(missingValueLabel),
              true,
              `nullratio-${datum.dateInMillis}-line-pt`,
              STANDARD_POINT_WIDTH,
            );
          })}
        </>
      )
    );
  };

  const { getAnalysisState } = useStateUrlEncoder();
  const renderSelectedProfile = (): React.ReactNode => {
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    const { graphDecorationType } = actionState ?? {};
    const correlatedSectionActive = activeCorrelatedAnomalies?.referenceFeature;
    if (correlatedSectionActive || (graphDecorationType && graphDecorationType === decorationType)) {
      return <SelectedProfileLine xScale={xScale} height={height} yStart={GRAPH_VERTICAL_BUFFER} />;
    }
    return null;
  };

  const renderLines = () => {
    return (
      <>
        {!legendState.includes(usedMonitorThresholdName) && (
          <AreaClosed<ThresholdAnalysisDataFragment>
            data={analysisResults}
            x={(d) => xScale(d.datasetTimestamp as number)}
            y0={(d) => {
              const lowerThreshold = getThresholdLower(d);
              return yScale(typeof lowerThreshold !== 'number' || lowerThreshold < 0 ? 0 : lowerThreshold);
            }}
            y1={(d) => yScale(getThresholdUpper(d) ?? 0)}
            yScale={yScale}
            fill={colorScale(usedMonitorThresholdName)}
            fillOpacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
            stroke={DEFAULT_THRESHOLD_AREA_STROKE}
            strokeOpacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
          />
        )}
        {!legendState.includes(MISSING_RATIO) && (
          <LinePath<MissingValue>
            curve={curveLinear}
            data={nonEmptyData}
            x={(d) => xScale(d.dateInMillis)}
            y={(d) => yScale(showRatio ? d.nullRatio : d.nullCount)}
            stroke={colorScale(missingValueLabel)}
            strokeWidth={LINE_WIDTH}
            shapeRendering="geometricPrecision"
          />
        )}
        {manualPreview.focused && manualPreview.graphType === 'missingValues' && (
          <>
            {manualPreview.thresholdMin < yScale.domain()[1] && (
              <LinePath
                data={datedData}
                x={(d) => xScale(d.dateInMillis)}
                y={() => yScale(manualPreview.thresholdMin)}
                stroke={colorScale('preview minThreshold')}
                strokeDasharray="5, 2"
                strokeWidth={LINE_WIDTH}
              />
            )}
            {manualPreview.thresholdMax < yScale.domain()[1] && (
              <LinePath
                data={datedData}
                x={(d) => xScale(d.dateInMillis)}
                y={() => yScale(manualPreview.thresholdMax)}
                stroke={colorScale('preview maxThreshold')}
                strokeDasharray="5, 2"
                strokeWidth={LINE_WIDTH}
              />
            )}
          </>
        )}
      </>
    );
  };

  const profilesWithData = new Set(alignedData.map((d) => d?.dateInMillis).filter((d): d is number => !!d));

  const renderHoverLine = () => (
    <HoverLine
      name="missing-value"
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      cardType="missingValues"
      decorationCardType={decorationType}
      data={datedData}
      navigationInformation={{ columnId: manualColumnId }}
      xScale={xScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      graphLeftOffset={10}
      graphTopOffset={0}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      profilesWithData={profilesWithData}
      hideTooltip={hideTooltip}
      alerts={anomalies}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
            value: showRatio ? alignedData[index]?.nullRatio : alignedData[index]?.nullCount,
            analysisResult: analysisResults.find((an) => an.datasetTimestamp === datedData[index]?.dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
    />
  );

  const renderAlertIcons = () => (
    <AlertIcons
      name="missing-value"
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      cardType="missingValues"
      decorationCardType={decorationType}
      profilesWithData={profilesWithData}
      navigationInformation={{ columnId: manualColumnId }}
      data={datedData}
      xScale={xScale}
      hoverDispatch={hoverDispatch}
      alerts={anomalies.filter((an) => an.isAnomaly)}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
            value: showRatio ? alignedData[index]?.nullRatio : alignedData[index]?.nullCount,
            analysisResult: analysisResults.find((an) => an.datasetTimestamp === datedData[index].dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
      hideTooltip={hideTooltip}
    />
  );

  const tooltipMetrics = [
    {
      label: missingValueLabel,
      value: tooltipData?.value,
      color: colorScale(missingValueLabel),
      shape: shapeScale(missingValueLabel),
    },
  ];

  return (
    <div className={styles.longGraphContainer}>
      <svg width={width} height={height + FLEXIBLE_GRAPH_SVG_PADDING}>
        <Group top={0} left={10}>
          <FlexibleFrame
            yScale={yScale}
            timeScale={xScale}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            height={height + FLEXIBLE_GRAPH_SVG_PADDING}
            width={graphWidth}
            batchFrequency={batchFrequency}
          />
          {renderLines()}
          {renderLinePoints()}
          <StandardVerticalAxis yScale={yScale} label="Missing value to total count ratio" squishText />
          <DateBottomAxis
            xScale={xScale}
            width={width}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            horizontalBuffer={GRAPH_HORIZONTAL_BUFFER}
            batchFrequency={batchFrequency}
          />
          {renderSelectedProfile()}
          {renderHoverLine()}
          {renderAlertIcons()}
        </Group>
      </svg>
      {renderLegend(
        manualPreview.focused && manualPreview.graphType === 'missingValues'
          ? []
          : [PREVIEW_MIN_THRESHOLD, PREVIEW_MAX_THRESHOLD],
      )}
      <MetricThresholdTooltip
        analysisResult={tooltipData?.analysisResult}
        batchFrequency={batchFrequency}
        metrics={tooltipMetrics}
        primaryMetricLabel={missingValueLabel}
        open={tooltipOpen && !drawnMenuState.open}
        timestamp={tooltipData?.timestamp}
        lastUploadTimestamp={tooltipData?.lastUploadTimestamp}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
      />
    </div>
  );
};

export default ThresholdLineVisxChart;
