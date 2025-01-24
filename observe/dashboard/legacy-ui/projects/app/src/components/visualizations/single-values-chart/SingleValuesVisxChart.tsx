import { useCallback, useContext, useMemo } from 'react';

import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import { curveLinear } from '@visx/curve';

import { Y_RANGE_BUFFER_RATIO } from 'ui/constants';
import { useDeepCompareMemo } from 'use-deep-compare';
import { isValidNumber } from 'utils/numberUtils';
import { useTooltip } from '@visx/tooltip';
import { ThresholdAnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { Colors } from '@whylabs/observatory-lib';
import { DatedKeyedQuantileSummary } from 'utils/createDatedQuantiles';
import { LabelItem } from 'types/graphTypes';
import { useLegendHiding } from 'hooks/useLegendHiding';
import MetricThresholdTooltip from 'components/tooltips/MetricThresholdTooltip';
import { getThresholdLower, getThresholdUpper } from 'utils/analysisUtils';
import { useTheme } from '@material-ui/core';
import { useHover } from 'hooks/useHover';
import { useRecoilState } from 'recoil';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { isNumber } from 'utils/typeGuards';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { clipSeriesData, generateUnionArrays } from '../vizutils/dataUtils';

import { generateDatedXScale, generateYBoundsFromData, generateYScaleFromFixedValues } from '../vizutils/scaleUtils';
import { DateBottomAxis, FlexibleFrame, AlertIcons, HoverLine, StandardVerticalAxis, BoxLegend } from '../components';
import { LegendShape, renderCircle, STANDARD_POINT_WIDTH } from '../vizutils/shapeUtils';
import {
  createAreaDataForAnomalyThresholds,
  DEFAULT_THRESHOLD_AREA_FILL_OPACITY,
  DEFAULT_THRESHOLD_AREA_STROKE,
  filterEmptyAndInvalidAnomalyThresholds,
  MonitorThresholdName,
  pickMonitorThresholdName,
} from '../vizutils/thresholdUtils';
import { SelectedProfileLine } from '../components/HoverLine';
import { PairedTimestamp } from '../utils';
import { CardType } from '../../cards/why-card/types';

const RANGE_EPSILON_DIVIDER = 1000;
const SINGLE_CHART_Y_BUFFER_RATIO = Y_RANGE_BUFFER_RATIO / 4;
const HORIZONTAL_BUFFER = 48;
const VERTICAL_BUFFER = 12;

export enum GraphType {
  EstMedian = 'Est. med',
  Mean = 'Mean',
  Min = 'Min',
  Max = 'Max',
  StdDev = 'Std. dev',
  Quantile99 = 'P99',
}

function translateGraphTypeToLabel(graphType: GraphType | string | undefined): string | undefined {
  if (graphType === GraphType.EstMedian) {
    return 'Est. median';
  }
  if (graphType === GraphType.Quantile99) {
    return '99th Percentile';
  }
  return graphType;
}

export const decorationToGraphType = new Map<WhyCardDecorationType, GraphType>([
  ['single_values_est_median', GraphType.EstMedian],
  ['single_values_mean', GraphType.Mean],
  ['single_values_min', GraphType.Min],
  ['single_values_max', GraphType.Max],
  ['single_values_stddev', GraphType.StdDev],
  ['single_values_q99', GraphType.Quantile99],
]);

interface SingleValuesVisxChartProps {
  height: number;
  width: number;
  timestamps: PairedTimestamp[];
  data: { label: string; values: (number | null)[]; color: string }[];
  legacyData: DatedKeyedQuantileSummary[];
  name: string;
  decimals?: number;
  yRange?: [number, number];
  percentage?: boolean;
  batchFrequency?: TimePeriod;
  featurePage?: boolean;
  labelForSingleValues?: string;
  showForecast?: boolean;
  anomalies: ThresholdAnalysisDataFragment[];
  useAnomalies?: boolean;
  runningAdHoc?: boolean;
  showThresholdPoints?: boolean;
  isCorrelatedAnomalies: boolean;
  activeGraphType?: GraphType;
  decorationCardType?: WhyCardDecorationType;
  cardType: CardType;
  manualColumnId?: string;
}

interface TooltipDatum {
  timestamp: number;
  lastUploadTimestamp?: number;
  data: {
    label: string;
    value: number | null;
    color: string;
    minValue: number | null;
    maxValue: number | null;
  } | null;
  analysisResult?: ThresholdAnalysisDataFragment;
}

const VALUE_MEDIAN = 'Median';
const SingleValuesVisxChart: React.FC<SingleValuesVisxChartProps> = ({
  height,
  width,
  timestamps,
  data,
  name,
  yRange,
  batchFrequency,
  labelForSingleValues,
  showForecast = false,
  anomalies,
  runningAdHoc = false,
  showThresholdPoints = false,
  isCorrelatedAnomalies = false,
  activeGraphType,
  decorationCardType,
  manualColumnId,
  cardType,
}) => {
  const theme = useTheme();
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);

  const [legendState, legendDispatch] = useLegendHiding();
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);
  const usedLabel = translateGraphTypeToLabel(labelForSingleValues) ?? VALUE_MEDIAN;
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const { clippedData, clippedTimestamps, validPairing } = clipSeriesData(timestamps, data, [from, to]);
  const usedData = validPairing ? clippedData : data;
  const usedTimestamps = validPairing ? clippedTimestamps : timestamps;

  const handleClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };

  const validAnomalies = anomalies
    .filter((a) => isValidNumber(a.datasetTimestamp) && a.datasetTimestamp >= from && a.datasetTimestamp <= to)
    .sort((a, b) => (a!.datasetTimestamp as number) - (b!.datasetTimestamp as number));

  // for quantiles
  const datesFromTimestamps = usedTimestamps.map((t, idx) => ({
    dateInMillis: t.timestamp,
    lastUploadTimestamp: t.lastUploadTimestamp,
    seriesData: usedData.map((ser) => ({ label: ser.label, color: ser.color, datum: ser.values[idx] })),
  }));

  const {
    alignedData,
    datedData,
    alignedEvents: alignedAnomalies,
  } = useDeepCompareMemo(
    () => generateUnionArrays(datesFromTimestamps, validAnomalies, [from, to], batchFrequency),
    [validAnomalies, batchFrequency, datesFromTimestamps],
  );

  const nonEmptyMappedAnomalies = filterEmptyAndInvalidAnomalyThresholds(alignedAnomalies);
  const usedMonitorThresholdName = pickMonitorThresholdName(nonEmptyMappedAnomalies);
  const colorScale = scaleOrdinal<string, string>({
    domain: [usedMonitorThresholdName, usedLabel],
    range: [Colors.quantileLight, Colors.chartPrimary],
  });

  const shapeScale = scaleOrdinal<string, LegendShape>({
    domain: [usedMonitorThresholdName, usedLabel],
    range: ['box', 'line'],
  });
  const [hoverState, hoverDispatch] = useHover();
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipDatum>();

  const totalVerticalBuffer = VERTICAL_BUFFER + 2 * theme.spacing(1);
  const totalHorizontalBuffer = HORIZONTAL_BUFFER + 2 * theme.spacing(1);

  const xScale = useDeepCompareMemo(
    () => generateDatedXScale(datedData, width - totalHorizontalBuffer, totalHorizontalBuffer, 0, [from, to]),
    [datedData, width, from, to],
  );
  const yScale = useDeepCompareMemo(() => {
    let graphMaxY;
    let graphMinY: number;

    if (yRange) {
      [graphMinY, graphMaxY] = yRange;
    } else {
      const dataNumbers = usedData.reduce<number[]>(
        (acc, curr) => acc.concat(curr.values.filter((v) => v !== null).map((v) => v as number)),
        [],
      );
      const anomalyNumbers = validAnomalies
        .flatMap((an) => [getThresholdLower(an), getThresholdUpper(an)])
        .filter((v) => isValidNumber(v))
        .map((v) => v as number);

      [graphMinY, graphMaxY] = generateYBoundsFromData(
        [...dataNumbers, ...anomalyNumbers],
        SINGLE_CHART_Y_BUFFER_RATIO,
        RANGE_EPSILON_DIVIDER,
      );
    }
    return generateYScaleFromFixedValues(height - totalVerticalBuffer, totalVerticalBuffer, graphMinY, graphMaxY);
  }, [usedData, totalVerticalBuffer, yRange, validAnomalies]);

  const getGrayOrRedDot = useCallback(
    (timestamp: number): string => {
      const tempAnomaly = anomalies.find((an) => an.datasetTimestamp === timestamp && an.isAnomaly);
      if (runningAdHoc) {
        return Colors.chartOrange;
      }
      if (!tempAnomaly || tempAnomaly.isFalseAlarm) {
        return Colors.grey;
      }
      return Colors.red;
    },
    [anomalies, runningAdHoc],
  );

  const zippedData = useMemo(
    () =>
      usedData.map((series) => {
        // Ensure that we only use timestamps that have a value because TS can't save us from values[idx].timestamp being null
        const validTimes = [...usedTimestamps].filter((t, idx) => series.values[idx] !== null && !!t.timestamp);
        const validSeries = series.values.filter((v) => v !== null).map((v) => v as number);
        return {
          label: series.label,
          points: validSeries.map((y, idx) => ({
            x: validTimes[idx].timestamp,
            y,
            colorDot: anomalies.find((an) => an.datasetTimestamp === validTimes[idx].timestamp && an.isAnomaly)
              ? getGrayOrRedDot(validTimes[idx].timestamp)
              : series.color,
          })),
          color: series.color,
          validTimestamps: validTimes,
        };
      }),
    [usedData, usedTimestamps, getGrayOrRedDot, anomalies],
  );

  const areaData = createAreaDataForAnomalyThresholds(nonEmptyMappedAnomalies);

  const renderLines = () => {
    return (
      <>
        {zippedData
          .slice()
          .reverse()
          .map((series, indx) => (
            <LinePath
              curve={curveLinear}
              data={series.points}
              key={`line-path-${series.label}`}
              x={(d) => xScale(d.x)}
              y={(d) => yScale(d.y)}
              stroke={series.color}
              strokeWidth={1}
              shapeRendering="geometricPrecision"
            />
          ))}
      </>
    );
  };
  const renderLinePoints = () => (
    <>
      {zippedData
        .slice()
        .reverse()
        .map((series) => {
          return series.points.map((pt, indx) =>
            renderCircle(
              xScale(pt.x),
              yScale(pt.y),
              pt.colorDot,
              true,
              `timeseries-${series.label}-${pt.x}-line-pt`,
              STANDARD_POINT_WIDTH,
            ),
          );
        })}
    </>
  );

  const renderForecastAreaSegments = () => (
    <>
      {areaData
        .filter((seg) => seg.length > 0)
        .map((seg) => (
          <AreaClosed
            data={seg}
            key={`forecast-area-${Math.random()}-${name}`}
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
            fill={colorScale(usedMonitorThresholdName)}
            fillOpacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
            stroke={DEFAULT_THRESHOLD_AREA_STROKE}
            strokeOpacity={DEFAULT_THRESHOLD_AREA_FILL_OPACITY}
          />
        ))}
    </>
  );

  /* eslint-enable react/no-array-index-key */
  const renderIfLegendIncludesValue = !legendState.includes(usedLabel) ? (
    <>
      {' '}
      {renderLines()} {renderLinePoints()}{' '}
    </>
  ) : (
    <></>
  );

  const profilesWithData = new Set(alignedData.filter((d) => !!d).map((d) => d!.dateInMillis));

  const tooltipDataForRender = (index: number) => {
    return {
      timestamp: datedData[index]?.dateInMillis,
      label: labelForSingleValues ? `${labelForSingleValues}:` : '',
      value: alignedData[index]?.seriesData[0]?.datum ?? null,
      color: Colors.chartPrimary,
      minValue: getThresholdLower(alignedAnomalies[index]) ?? null,
      maxValue: getThresholdUpper(alignedAnomalies[index]) ?? null,
    };
  };

  const { getAnalysisState } = useStateUrlEncoder();
  const renderSelectedProfile = (): React.ReactNode => {
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    const { graphDecorationType } = actionState ?? {};
    const correlatedSectionActive = activeCorrelatedAnomalies?.referenceFeature;
    const foundGraphType = graphDecorationType && decorationToGraphType.get(graphDecorationType);
    if (correlatedSectionActive || (foundGraphType && foundGraphType === activeGraphType)) {
      return <SelectedProfileLine xScale={xScale} height={height - totalVerticalBuffer} yStart={totalVerticalBuffer} />;
    }
    return null;
  };

  const renderHoverLine = () => (
    <HoverLine
      cardType={cardType}
      decorationCardType={decorationCardType}
      name={name}
      data={datedData}
      navigationInformation={{ columnId: manualColumnId }}
      profilesWithData={profilesWithData}
      xScale={xScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      hideTooltip={hideTooltip}
      graphLeftOffset={10}
      graphTopOffset={0}
      graphHeight={height - totalVerticalBuffer}
      graphVerticalBuffer={totalVerticalBuffer}
      graphWidth={width - totalHorizontalBuffer}
      alerts={anomalies.filter((an) => an.isAnomaly)}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
            data: tooltipDataForRender(index),
            analysisResult: anomalies.find((an) => an.datasetTimestamp === datedData[index].dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
    />
  );
  const renderAlertIcons = () => (
    <AlertIcons
      name={name}
      cardType={cardType}
      decorationCardType={decorationCardType}
      profilesWithData={profilesWithData}
      data={datedData}
      xScale={xScale}
      navigationInformation={{ columnId: manualColumnId }}
      hoverDispatch={hoverDispatch}
      alerts={anomalies.filter((an) => an.isAnomaly)}
      graphHeight={height}
      graphVerticalBuffer={totalVerticalBuffer}
      graphWidth={width - totalHorizontalBuffer}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
            data: tooltipDataForRender(index),
            analysisResult: anomalies.find((an) => an.datasetTimestamp === datedData[index].dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
      hideTooltip={hideTooltip}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
    />
  );

  const tooltipMetrics = [
    {
      label: usedLabel,
      value: tooltipData?.data?.value,
      color: colorScale(usedLabel),
      shape: shapeScale(usedLabel),
    },
  ];

  return (
    <div style={{ width }}>
      <svg width={width} height={height}>
        <Group top={0} left={10}>
          <FlexibleFrame
            yScale={yScale}
            timeScale={xScale}
            ticksInMillis={usedTimestamps.map((t) => t.timestamp)}
            height={height}
            verticalBuffer={totalVerticalBuffer}
            width={width}
            horizontalBuffer={totalHorizontalBuffer}
            batchFrequency={batchFrequency}
          />
          <StandardVerticalAxis
            squishTicks
            squishLabel
            yScale={yScale}
            label={translateGraphTypeToLabel(labelForSingleValues)}
            squishText
          />
          {showForecast && !legendState.includes(usedMonitorThresholdName) && renderForecastAreaSegments()}
          {showForecast ? (
            <>{renderIfLegendIncludesValue}</>
          ) : (
            <>
              {renderLines()}
              {renderLinePoints()}
            </>
          )}
          <DateBottomAxis
            xScale={xScale}
            ticksInMillis={usedTimestamps.map((t) => t.timestamp)}
            width={width}
            horizontalBuffer={totalHorizontalBuffer}
            height={height - totalVerticalBuffer}
            batchFrequency={batchFrequency}
          />

          {renderSelectedProfile()}
          {renderHoverLine()}
          {renderAlertIcons()}
        </Group>
      </svg>
      {showForecast && (
        <BoxLegend
          name="quantile"
          colorScale={colorScale}
          hoverState={hoverState}
          hoverDispatch={hoverDispatch}
          onClick={handleClick}
          hiddenLegendItems={legendState}
          shapeScale={shapeScale}
        />
      )}
      <MetricThresholdTooltip
        analysisResult={tooltipData?.analysisResult}
        batchFrequency={batchFrequency}
        metrics={tooltipMetrics}
        primaryMetricLabel={labelForSingleValues}
        open={tooltipOpen && !drawnMenuState.open}
        timestamp={tooltipData?.timestamp}
        lastUploadTimestamp={tooltipData?.lastUploadTimestamp}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
      />
    </div>
  );
};

export default SingleValuesVisxChart;
