import { useMemo, Fragment, useContext } from 'react';

import { useCommonStyles } from 'hooks/useCommonStyles';
import { useHover } from 'hooks/useHover';
import { DatedUniqueSummary } from 'utils/createDatedUniqueSummaries';
import { useTooltip } from '@visx/tooltip';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { useDeepCompareMemo } from 'use-deep-compare';
import { useRecoilState } from 'recoil';

import {
  GRAPH_HEIGHT,
  GRAPH_HORIZONTAL_BUFFER,
  GRAPH_VERTICAL_BUFFER,
  GRAPH_WIDTH,
  FLEXIBLE_GRAPH_SVG_PADDING,
  STANDARD_GRAPH_HORIZONTAL_BORDERS,
} from 'ui/constants';
import { Colors } from '@whylabs/observatory-lib';
import { manualThresholdInputAtom, ManualThresholdInputProps } from 'atoms/manualThresholdInputAtom';
import { AreaClosed, LinePath } from '@visx/shape';
import { curveLinear } from '@visx/curve';
import { Group } from '@visx/group';
import { LabelItem } from 'types/graphTypes';
import { useLegendHiding } from 'hooks/useLegendHiding';
import { AnalysisResult, ThresholdAnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { useAdHoc } from 'atoms/adHocAtom';
import MetricThresholdTooltip from 'components/tooltips/MetricThresholdTooltip';
import { getThresholdLower, getThresholdUpper } from 'utils/analysisUtils';
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

interface UniqueRatiosVisxChartProps {
  data: DatedUniqueSummary[];
  height?: number;
  width?: number;
  batchFrequency?: TimePeriod;
  anomalies: AnalysisResult[];
  isCorrelatedAnomalies: boolean;
  decorationCardType?: WhyCardDecorationType;
  manualColumnId?: string;
}

interface TooltipDatum {
  timestamp: number;
  lastUploadTimestamp?: number;
  datum: DatedUniqueSummary | null;
  analysisResult: ThresholdAnalysisDataFragment | undefined;
}

const RANGE_NAME = 'range';
const ESTIMATE_NAME = 'estimate';
const PREVIEW_MAX_NAME = 'preview max threshold';
const PREVIEW_MIN_NAME = 'preview min threshold';
const RATIO_NAME = 'Est. unique ratio';
const OMITTED_LEGEND_ITEMS = [RANGE_NAME, ESTIMATE_NAME];

const UniqueRatiosVisxChart: React.FC<UniqueRatiosVisxChartProps> = ({
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
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);

  const [hoverState, hoverDispatch] = useHover();
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const [manualPreview] = useRecoilState<ManualThresholdInputProps>(manualThresholdInputAtom);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipDatum>();
  const [legendState, legendDispatch] = useLegendHiding();
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);
  const [adHocRunId] = useAdHoc();

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
      Colors.brandRed1,
      Colors.brandRed2,
      Colors.chartPrimary,
    ],
  });

  const shapeScale = scaleOrdinal<string, LegendShape>({
    domain: ORDINAL_DOMAIN,
    range: ['box', 'line', 'box', 'linedash', 'linedash', 'line'],
  });

  const { datedData, alignedData } = useDeepCompareMemo(
    () => generateUnionArrays(filteredData, [], [from, to], batchFrequency),
    [data, batchFrequency, from, to],
  );

  const xScale = useDeepCompareMemo(
    () => generateDatedXScale(datedData, width - GRAPH_HORIZONTAL_BUFFER, GRAPH_HORIZONTAL_BUFFER, 0, [from, to]),
    [datedData, width],
  );

  const yScale = useMemo(() => {
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
      filteredData.reduce((min, d) => (d.ratio < min ? d.ratio : min), 0),
    );
    maxVal = Math.max(
      maxVal,
      filteredData.reduce((max, d) => (d.ratio > max ? d.ratio : max), 0),
    );

    return scaleLinear<number>({
      range: [height, GRAPH_VERTICAL_BUFFER],
      domain: [minVal, maxVal],
    }).nice();
  }, [height, filteredAnomalies, filteredData]);

  const renderLegend = (omittedLegendItems: string[]) => (
    <BoxLegend
      name="uniques"
      colorScale={colorScale}
      shapeScale={shapeScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      onClick={handleClick}
      omittedLegendItems={omittedLegendItems}
    />
  );

  const handleClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };

  const profilesWithData = new Set(alignedData.map((d) => d?.dateInMillis).filter((d): d is number => !!d));

  const renderHoverLine = () => {
    return (
      <HoverLine
        name="UniqueRatios"
        cardType="uniqueValues"
        decorationCardType={decorationCardType}
        data={datedData}
        isCorrelatedAnomalies={isCorrelatedAnomalies}
        profilesWithData={profilesWithData}
        xScale={xScale}
        hoverState={hoverState}
        hoverDispatch={hoverDispatch}
        navigationInformation={{ columnId: manualColumnId }}
        hideTooltip={hideTooltip}
        graphHeight={height}
        graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
        graphWidth={width}
        graphLeftOffset={10}
        graphTopOffset={0}
        alerts={filteredAnomalies.filter((a) => a.isAnomaly)}
        showTooltip={({ index, left, top }) => {
          showTooltip({
            tooltipData: {
              timestamp: datedData[index].dateInMillis,
              lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
              datum: alignedData[index],
              analysisResult: filteredAnomalies.find((a) => a.datasetTimestamp === alignedData[index]?.dateInMillis),
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
    if (correlatedSectionActive || (graphDecorationType && graphDecorationType === 'est_unique_ratio')) {
      return <SelectedProfileLine xScale={xScale} height={height} yStart={GRAPH_VERTICAL_BUFFER} />;
    }
    return null;
  };

  const renderAlertIcons = () => (
    <AlertIcons
      name="uniques"
      cardType="uniqueValues"
      decorationCardType={decorationCardType}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      data={datedData}
      profilesWithData={profilesWithData}
      navigationInformation={{ columnId: manualColumnId }}
      xScale={xScale}
      hoverDispatch={hoverDispatch}
      alerts={filteredAnomalies.filter((a) => a.isAnomaly)}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
            datum: alignedData[index],
            analysisResult: filteredAnomalies.find((a) => a.datasetTimestamp === alignedData[index]?.dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
      hideTooltip={hideTooltip}
    />
  );

  const getGrayOrRedDot = (timestamp: number): string => {
    const tempAnomaly = filteredAnomalies.find((alert) => alert.datasetTimestamp === timestamp);
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
        {!legendState.includes(RATIO_NAME) &&
          alignedData.map(
            (event) =>
              event !== null && (
                <Fragment key={`event-points-ratio-${event.dateInMillis}`}>
                  {renderCircle(
                    xScale(event.dateInMillis),
                    yScale(event.ratio),
                    filteredAnomalies.find((alert) => alert.isAnomaly && alert.datasetTimestamp === event?.dateInMillis)
                      ? getGrayOrRedDot(event.dateInMillis)
                      : colorScale(RATIO_NAME),
                    true,
                    `min-unique-thresh-point-${event.dateInMillis}`,
                    STANDARD_POINT_WIDTH,
                  )}
                </Fragment>
              ),
          )}
      </>
    );
  };

  const nonEmptyData = useMemo(() => alignedData.filter((d) => !!d) as DatedUniqueSummary[], [alignedData]);

  const renderLines = () => {
    return (
      <>
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
        {manualPreview.focused && manualPreview.graphType === 'uniqueValues' && (
          <AreaClosed
            data={datedData}
            x={(d) => xScale(d.dateInMillis)}
            y0={() => yScale(manualPreview.thresholdMin)}
            y1={() => yScale(manualPreview.thresholdMax)}
            yScale={yScale}
            stroke={colorScale(PREVIEW_MIN_NAME)}
            fill={colorScale(PREVIEW_MAX_NAME)}
            opacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
            strokeDasharray="5, 2"
            strokeWidth={LINE_WIDTH}
          />
        )}
        {!legendState.includes(RATIO_NAME) && (
          <LinePath<DatedUniqueSummary>
            curve={curveLinear}
            data={nonEmptyData}
            x={(d) => xScale(d.dateInMillis)}
            y={(d) => yScale(d.ratio)}
            stroke={colorScale(RATIO_NAME)}
            strokeWidth={LINE_WIDTH}
          />
        )}
      </>
    );
  };

  const tooltipMetrics = [
    {
      label: RATIO_NAME,
      value: tooltipData?.datum?.ratio,
      color: colorScale(RATIO_NAME),
      shape: shapeScale(RATIO_NAME),
    },
  ];

  return (
    <div className={styles.longGraphContainer}>
      <svg width={width + STANDARD_GRAPH_HORIZONTAL_BORDERS} height={height + FLEXIBLE_GRAPH_SVG_PADDING}>
        <Group top={0} left={10}>
          <FlexibleFrame
            yScale={yScale}
            timeScale={xScale}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            height={height + FLEXIBLE_GRAPH_SVG_PADDING}
            width={width}
            batchFrequency={batchFrequency}
          />
          {renderLines()}
          {renderLinePoints()}
          <StandardVerticalAxis yScale={yScale} label="Unique Value Ratio" />
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
        manualPreview.focused && manualPreview.graphType === 'uniqueValues'
          ? OMITTED_LEGEND_ITEMS
          : [...OMITTED_LEGEND_ITEMS, PREVIEW_MIN_NAME, PREVIEW_MAX_NAME],
      )}
      <MetricThresholdTooltip
        analysisResult={tooltipData?.analysisResult ?? undefined}
        batchFrequency={batchFrequency}
        metrics={tooltipMetrics}
        primaryMetricLabel={RATIO_NAME}
        open={tooltipOpen && !drawnMenuState.open}
        timestamp={tooltipData?.timestamp}
        lastUploadTimestamp={tooltipData?.lastUploadTimestamp}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
      />
    </div>
  );
};

export default UniqueRatiosVisxChart;
