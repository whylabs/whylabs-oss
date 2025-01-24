import { useContext, useMemo } from 'react';

import { useCommonStyles } from 'hooks/useCommonStyles';
import { useHover } from 'hooks/useHover';
import { DatedUniqueSummary } from 'utils/createDatedUniqueSummaries';
import { useTooltip } from '@visx/tooltip';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { useDeepCompareMemo } from 'use-deep-compare';

import {
  GRAPH_HEIGHT,
  GRAPH_HORIZONTAL_BUFFER,
  GRAPH_VERTICAL_BUFFER,
  GRAPH_WIDTH,
  STANDARD_GRAPH_HORIZONTAL_BORDERS,
  FLEXIBLE_GRAPH_SVG_PADDING,
} from 'ui/constants';
import { Colors } from '@whylabs/observatory-lib';
import { AreaClosed, LinePath } from '@visx/shape';
import { curveLinear } from '@visx/curve';
import { Group } from '@visx/group';
import { LabelItem } from 'types/graphTypes';
import { useLegendHiding } from 'hooks/useLegendHiding';
import { TimePeriod, ThresholdAnalysisDataFragment, AnalysisResult } from 'generated/graphql';
import { useAdHoc } from 'atoms/adHocAtom';
import MetricThresholdTooltip from 'components/tooltips/MetricThresholdTooltip';
import { getThresholdLower, getThresholdUpper } from 'utils/analysisUtils';
import { useRecoilState } from 'recoil';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { LegendShape, LINE_WIDTH, renderCircle, STANDARD_POINT_WIDTH } from '../vizutils/shapeUtils';
import { generateDatedXScale } from '../vizutils/scaleUtils';
import { BoxLegend, DateBottomAxis, HoverLine, AlertIcons, StandardVerticalAxis, FlexibleFrame } from '../components';
import { generateUnionArrays } from '../vizutils/dataUtils';
import { SelectedProfileLine } from '../components/HoverLine';
import {
  DEFAULT_THRESHOLD_AREA_FILL_OPACITY,
  DEFAULT_THRESHOLD_AREA_STROKE,
  filterEmptyAndInvalidAnomalyThresholds,
  pickMonitorThresholdName,
} from '../vizutils/thresholdUtils';

interface UniqueValuesVisxChartProps {
  data: DatedUniqueSummary[];
  height?: number;
  width?: number;
  batchFrequency?: TimePeriod;
  anomalies: ThresholdAnalysisDataFragment[];
  isCorrelatedAnomalies: boolean;
  decorationCardType?: WhyCardDecorationType;
  manualColumnId?: string;
}

interface TooltipDatum {
  timestamp: number;
  lastUploadTimestamp?: number;
  datum: DatedUniqueSummary | null;
  anomaly?: ThresholdAnalysisDataFragment;
}

const RANGE_NAME = 'range';
const ESTIMATE_NAME = 'estimate';
const PREVIEW_MAX_NAME = 'preview max threshold';
const PREVIEW_MIN_NAME = 'preview min threshold';
const RATIO_NAME = 'Est. unique ratio';
const OMITTED_LEGEND_ITEMS = [RATIO_NAME];

const UniqueValuesVisxChart: React.FC<UniqueValuesVisxChartProps> = ({
  data,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  batchFrequency = TimePeriod.P1D,
  anomalies,
  isCorrelatedAnomalies,
  decorationCardType,
  manualColumnId,
}) => {
  const { classes: styles } = useCommonStyles();
  const graphWidth = width - STANDARD_GRAPH_HORIZONTAL_BORDERS;
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);

  const [hoverState, hoverDispatch] = useHover();
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipDatum>();
  const [legendState, legendDispatch] = useLegendHiding();
  const [adHocRunId] = useAdHoc();
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);

  const filteredData = data.filter((d) => d.dateInMillis >= from && d.dateInMillis <= to);
  const filteredAnomalies = anomalies.filter(
    (a) => a.datasetTimestamp && a.datasetTimestamp >= from && a.datasetTimestamp <= to,
  );

  const nonEmptyMappedAnomalies = filterEmptyAndInvalidAnomalyThresholds(filteredAnomalies);
  const usedMonitorThresholdName = pickMonitorThresholdName(nonEmptyMappedAnomalies);

  const ORDINAL_DOMAIN = [
    RANGE_NAME,
    ESTIMATE_NAME,
    usedMonitorThresholdName,
    PREVIEW_MAX_NAME,
    PREVIEW_MIN_NAME,
    RATIO_NAME,
  ];

  const colorScale = scaleOrdinal<string, string>({
    domain: ORDINAL_DOMAIN,
    range: [
      Colors.chartAqua,
      Colors.chartPrimary,
      Colors.quantileLight,
      Colors.brandSecondary600,
      Colors.brandSecondary600,
      Colors.chartOrange,
    ],
  });

  const shapeScale = scaleOrdinal<string, LegendShape>({
    domain: ORDINAL_DOMAIN,
    range: ['box', 'line', 'box', 'linedash', 'linedash', 'line'],
  });

  const { datedData, alignedData } = useDeepCompareMemo(
    () => generateUnionArrays(filteredData, [], [from, to], batchFrequency),
    [filteredData, batchFrequency, from, to],
  );

  const xScale = useDeepCompareMemo(
    () => generateDatedXScale(datedData, graphWidth - GRAPH_HORIZONTAL_BUFFER, GRAPH_HORIZONTAL_BUFFER, 0, [from, to]),
    [datedData, width],
  );
  const yScale = useDeepCompareMemo(() => {
    let minVal = filteredAnomalies.reduce((min, a) => {
      const lower = getThresholdLower(a);
      return typeof lower === 'number' && lower < min ? lower : min;
    }, 0);
    let maxVal = filteredAnomalies.reduce((max, a) => {
      const upper = getThresholdUpper(a);
      return typeof upper === 'number' && upper > max ? upper : max;
    }, 0);
    minVal = Math.min(
      minVal,
      filteredData.reduce((min, d) => (d.lower < min ? d.lower : min), 0),
    );
    maxVal = Math.max(
      maxVal,
      filteredData.reduce((max, d) => (d.upper > max ? d.upper : max), 0),
    );

    return scaleLinear<number>({
      range: [height, GRAPH_VERTICAL_BUFFER],
      round: true,
      domain: [minVal, maxVal],
    }).nice();
  }, [filteredData, filteredAnomalies]);

  const handleClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };

  const renderLegend = (omittedLegendItems: string[]) => (
    <BoxLegend
      name="uniques"
      colorScale={colorScale}
      shapeScale={shapeScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      onClick={handleClick}
      omittedLegendItems={omittedLegendItems}
      hiddenLegendItems={legendState}
    />
  );

  const profilesWithData = new Set(alignedData.map((d) => d?.dateInMillis).filter((d): d is number => !!d));

  const renderHoverLine = () => {
    return (
      <HoverLine
        name="UniqueValues"
        isCorrelatedAnomalies={isCorrelatedAnomalies}
        cardType="uniqueValues"
        decorationCardType={decorationCardType}
        navigationInformation={{ columnId: manualColumnId }}
        data={datedData}
        profilesWithData={profilesWithData}
        xScale={xScale}
        hoverState={hoverState}
        hoverDispatch={hoverDispatch}
        hideTooltip={hideTooltip}
        graphHeight={height}
        graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
        graphWidth={width}
        graphLeftOffset={10}
        graphTopOffset={0}
        alerts={anomalies}
        showTooltip={({ index, left, top }) => {
          showTooltip({
            tooltipData: {
              timestamp: datedData[index].dateInMillis,
              lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
              datum: alignedData[index],
              anomaly: filteredAnomalies.find((an) => an.datasetTimestamp === datedData[index].dateInMillis),
            },
            tooltipTop: top,
            tooltipLeft: left,
          });
        }}
      />
    );
  };

  const { getAnalysisState } = useStateUrlEncoder();
  const renderSelectedProfile = (): React.ReactNode => {
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    const { graphDecorationType } = actionState ?? {};
    const correlatedSectionActive = activeCorrelatedAnomalies?.referenceFeature;
    if (correlatedSectionActive || (graphDecorationType && graphDecorationType === 'est_unique_values')) {
      return <SelectedProfileLine xScale={xScale} height={height} yStart={GRAPH_VERTICAL_BUFFER} />;
    }
    return null;
  };

  const renderAlertIcons = () => (
    <AlertIcons
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      name="uniques"
      profilesWithData={profilesWithData}
      cardType="uniqueValues"
      decorationCardType={decorationCardType}
      data={datedData}
      navigationInformation={{ columnId: manualColumnId }}
      xScale={xScale}
      hoverDispatch={hoverDispatch}
      alerts={filteredAnomalies.filter((an) => an.isAnomaly)}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
            datum: alignedData[index],
            anomaly: filteredAnomalies.find((an) => an.datasetTimestamp === datedData[index].dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
      hideTooltip={hideTooltip}
    />
  );

  const getGrayOrRedDot = (i: number): string => {
    const tempAnomaly = filteredAnomalies.find((an) => an.datasetTimestamp === i && an.isAnomaly);
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
      <>
        {!legendState.includes(ESTIMATE_NAME) &&
          alignedData.map(
            (datum, i) =>
              datum !== null &&
              renderCircle(
                xScale(datum.dateInMillis),
                yScale(datum.estimate),
                filteredAnomalies.find((alert) => alert.isAnomaly && alert.datasetTimestamp === datum.dateInMillis)
                  ? getGrayOrRedDot(datum.dateInMillis)
                  : colorScale(ESTIMATE_NAME),
                true,
                `estimate-uniques-point-${datum.dateInMillis}`,
                STANDARD_POINT_WIDTH,
              ),
          )}
      </>
    );
  };

  const nonEmptyData = useMemo(() => alignedData.filter((d) => !!d) as DatedUniqueSummary[], [alignedData]);

  const tooltipMetrics = [
    {
      label: ESTIMATE_NAME,
      value: tooltipData?.datum?.estimate,
      color: colorScale(ESTIMATE_NAME),
      shape: shapeScale(ESTIMATE_NAME),
    },
    {
      label: `${RANGE_NAME} lower`,
      value: tooltipData?.datum?.lower,
      color: colorScale(RANGE_NAME),
      shape: shapeScale(RANGE_NAME),
    },
    {
      label: `${RANGE_NAME} upper`,
      value: tooltipData?.datum?.upper,
      color: colorScale(RANGE_NAME),
      shape: shapeScale(RANGE_NAME),
    },
  ];

  const renderLines = () => {
    return (
      <>
        {!legendState.includes(RANGE_NAME) && (
          <AreaClosed<DatedUniqueSummary>
            data={nonEmptyData}
            x={(d) => xScale(d.dateInMillis)}
            y0={(d) => yScale(d.lower)}
            y1={(d) => yScale(d.upper)}
            yScale={yScale}
            fill={colorScale(RANGE_NAME)}
            fillOpacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
            stroke={DEFAULT_THRESHOLD_AREA_STROKE}
            strokeOpacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
          />
        )}
        {!legendState.includes(usedMonitorThresholdName) && (
          <AreaClosed<AnalysisResult>
            data={filteredAnomalies}
            x={(d) => xScale(d.datasetTimestamp as number)}
            y0={(d) => yScale(getThresholdLower(d) ?? 0)}
            y1={(d) => yScale(getThresholdUpper(d) ?? 0)}
            yScale={yScale}
            fill={colorScale(usedMonitorThresholdName)}
            fillOpacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
            stroke={DEFAULT_THRESHOLD_AREA_STROKE}
            strokeOpacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
          />
        )}
        {!legendState.includes(ESTIMATE_NAME) && (
          <LinePath<DatedUniqueSummary>
            curve={curveLinear}
            data={nonEmptyData}
            x={(d) => xScale(d.dateInMillis)}
            y={(d) => yScale(d.estimate)}
            stroke={colorScale(ESTIMATE_NAME)}
            strokeWidth={LINE_WIDTH}
            shapeRendering="geometricPrecision"
          />
        )}
      </>
    );
  };

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
          <StandardVerticalAxis yScale={yScale} label="Unique Value Count" />
          <DateBottomAxis
            xScale={xScale}
            width={graphWidth}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            horizontalBuffer={GRAPH_HORIZONTAL_BUFFER}
            batchFrequency={batchFrequency}
          />
          {renderSelectedProfile()}
          {renderHoverLine()}
          {renderAlertIcons()}
        </Group>
      </svg>
      {renderLegend([...OMITTED_LEGEND_ITEMS, PREVIEW_MIN_NAME, PREVIEW_MAX_NAME])}
      <MetricThresholdTooltip
        analysisResult={tooltipData?.anomaly}
        batchFrequency={batchFrequency}
        metrics={tooltipMetrics}
        primaryMetricLabel="Unique Value Count"
        open={tooltipOpen && !drawnMenuState.open}
        timestamp={tooltipData?.timestamp}
        lastUploadTimestamp={tooltipData?.lastUploadTimestamp}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
      />
    </div>
  );
};

export default UniqueValuesVisxChart;
