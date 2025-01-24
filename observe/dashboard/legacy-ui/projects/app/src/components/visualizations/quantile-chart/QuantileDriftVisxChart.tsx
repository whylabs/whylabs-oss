import { useCallback, useContext, useEffect, useMemo } from 'react';
import { DatedKeyedQuantileSummary } from 'utils/createDatedQuantiles';
import { AreaClosed, LinePath } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { useTooltip } from '@visx/tooltip';
import { Colors } from '@whylabs/observatory-lib';
import {
  FLEXIBLE_GRAPH_SVG_PADDING,
  GRAPH_HEIGHT,
  GRAPH_HORIZONTAL_BUFFER,
  GRAPH_VERTICAL_BUFFER,
  GRAPH_WIDTH,
  STANDARD_GRAPH_HORIZONTAL_BORDERS,
  Y_RANGE_BUFFER_RATIO,
} from 'ui/constants';
import { DatedData, LabelItem } from 'types/graphTypes';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { useLegendHiding } from 'hooks/useLegendHiding';
import { getAlertTime } from 'utils/createAlerts';
import { useHover } from 'hooks/useHover';
import { AnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { useDeepCompareMemo } from 'use-deep-compare';
import {
  LegendShape,
  LINE_WIDTH,
  renderCircle,
  STANDARD_POINT_WIDTH,
} from 'components/visualizations/vizutils/shapeUtils';
import { generateUnionArrays } from 'components/visualizations/vizutils/dataUtils';
import { arrayOfLength } from 'utils/arrayUtils';
import { useRecoilState } from 'recoil';
import { analysisTooltipsCacheAtom } from 'atoms/analysisTooltipsCacheAtom';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { getAlgorithmByString } from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import DateBottomAxis from '../components/DateBottomAxis';
import {
  AlertIcons,
  BoxLegend,
  FlexibleFrame,
  HoverLine,
  SecondaryVerticalAxis,
  StandardVerticalAxis,
} from '../components';
import { generateDatedXScale } from '../vizutils/scaleUtils';
import { mapAlgorithmsName } from './helpers';
import { SelectedProfileLine } from '../components/HoverLine';
import {
  AnalysisChartTooltip,
  AnalysisTooltipDatum,
  useMountQuantilesTooltip,
} from '../drift-graphs/DistributionTooltip';
import { CardDataContext } from '../../cards/why-card/CardDataContext';

interface QuantilesDriftVisxChartProps {
  data: DatedKeyedQuantileSummary[];
  alerts: AnalysisDataFragment[];
  analysisResults: AnalysisDataFragment[];
  manualColumnId: string;
  manualRange?: [number, number];
  height?: number;
  width?: number;
  batchFrequency?: TimePeriod;
  isCorrelatedAnomalies: boolean;
  unionDataListener?: (data: DatedData[], isDiscrete: boolean) => void;
}

interface areaDataType {
  t: number;
  v0: number;
  v1: number;
}

interface lineDataType {
  t: number;
  v: number;
}

const ROUNDING_THRESHOLD = 10;
const DECIMAL_SCALOR = 100;
const BUFFER_MULTIPLE = 0.2;

const MAX_LINE_NAME = 'Max';
const MIN_LINE_NAME = 'Min';
const OUTER_RANGE_NAME = '5-95%';
const INNER_RANGE_NAME = '25-75%';
const LINE_NAME = '50%';
const DISTANCE_NAME = 'Drift distance';

function getYBounds(data: DatedKeyedQuantileSummary[], legendState: string[]) {
  let minY = Number.MAX_SAFE_INTEGER;
  let maxY = Number.MIN_SAFE_INTEGER;
  const hideOuter = legendState.includes(OUTER_RANGE_NAME);
  const hideInner = legendState.includes(INNER_RANGE_NAME);
  const hideMiddle = legendState.includes(LINE_NAME);
  const hideMax = legendState.includes(MAX_LINE_NAME.toLowerCase());
  const hideMin = legendState.includes(MIN_LINE_NAME.toLowerCase());
  // [ 0 ,   1 ,    2,    3,     4,     5,     6,     7,      8]
  // ["0%", "1%", "5%", "25%", "50%", "75%", "95%", "99%", "100%"]
  // Note: we use 2,7 as the range because we intend to slice the array
  // and when slicing, the second index is _exclusive_
  // so slice(2, 7) will give us the 5%-95% range
  let minIndex = 2;
  let maxIndex = 7;
  if (hideOuter) {
    minIndex = 3;
    maxIndex = 6;
  }
  if (hideInner) {
    minIndex = hideOuter ? 4 : minIndex;
    maxIndex = hideOuter ? 5 : maxIndex;
  }
  if (hideInner && hideOuter && hideMiddle && hideMax && hideMin) {
    return [0, 1];
  }
  if (!hideMax) {
    maxIndex = 9;
  }
  if (!hideMin) {
    minIndex = 0;
  }

  data.forEach((datum) => {
    minY = Math.min(minY, ...datum.quantiles.counts.slice(minIndex, maxIndex));
    maxY = Math.max(maxY, ...datum.quantiles.counts.slice(minIndex, maxIndex));
  });
  const naturalRange = maxY - minY;
  if (naturalRange < 1 / ROUNDING_THRESHOLD) {
    // Just have really long decimals if the numbers are this close together.
    const buffer = naturalRange ? naturalRange * BUFFER_MULTIPLE : BUFFER_MULTIPLE;
    minY -= buffer;
    maxY += buffer;
    return [minY, maxY];
  }

  if (naturalRange < ROUNDING_THRESHOLD) {
    const buffer = Math.round(naturalRange * BUFFER_MULTIPLE * DECIMAL_SCALOR) / DECIMAL_SCALOR;
    minY -= buffer;
    maxY += buffer;
    return [Math.round(minY * DECIMAL_SCALOR) / DECIMAL_SCALOR, Math.round(maxY * DECIMAL_SCALOR) / DECIMAL_SCALOR];
  }
  const buffer = Math.round((maxY - minY) * Y_RANGE_BUFFER_RATIO);
  minY -= buffer;
  maxY += buffer;
  return [Math.round(minY), Math.round(maxY)];
}

const QuantileDriftVisxChart: React.FC<QuantilesDriftVisxChartProps> = ({
  data,
  alerts,
  analysisResults,
  manualColumnId,
  manualRange,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  batchFrequency = TimePeriod.P1D,
  isCorrelatedAnomalies,
  unionDataListener,
}) => {
  const TOOLTIP_CACHE_KEY = `${manualColumnId}--drift--est_quantile_drift`;
  const algorithmType = getAlgorithmByString.get(analysisResults?.[0]?.algorithm ?? '');
  const algorithmName = (algorithmType && mapAlgorithmsName.get(algorithmType)) || DISTANCE_NAME;
  const { classes: styles } = useCommonStyles();
  const { getAnalysisState } = useStateUrlEncoder();
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);

  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const { cardDataState } = useContext(CardDataContext);
  const disableDrift = !activeCorrelatedAnomalies?.referenceFeature || !isCorrelatedAnomalies;
  const graphWidth = width - (disableDrift ? 0 : STANDARD_GRAPH_HORIZONTAL_BORDERS);
  const [hoverState, hoverDispatch] = useHover();
  const [legendState, legendDispatch] = useLegendHiding();
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } =
    useTooltip<AnalysisTooltipDatum>();
  const filteredData = data.filter((d) => d.dateInMillis >= from && d.dateInMillis <= to);
  const filteredAnalysis = useMemo(
    () =>
      analysisResults.filter((ar) => ar.datasetTimestamp && ar.datasetTimestamp >= from && ar.datasetTimestamp <= to),
    [analysisResults, from, to],
  );

  const { datedData, alignedData, alignedEvents } = useDeepCompareMemo(
    () =>
      generateUnionArrays(
        filteredData,
        filteredAnalysis.filter((an) => !an.failureType),
        [from, to],
        batchFrequency,
      ),
    [filteredData, filteredAnalysis, from, to, batchFrequency, generateUnionArrays],
  );

  useEffect(() => {
    unionDataListener?.(datedData, false);
  }, [datedData, unionDataListener]);

  const xScale = useMemo(
    () => generateDatedXScale(datedData, graphWidth - GRAPH_HORIZONTAL_BUFFER, GRAPH_HORIZONTAL_BUFFER, 0, [from, to]),
    [datedData, graphWidth, from, to],
  );

  const mountTooltip = useMountQuantilesTooltip({ algorithmName, filteredAnalysis, batchFrequency });

  const [lineData, areaData] = useDeepCompareMemo(() => {
    const lines: { [key: string]: Array<lineDataType> } = {
      min: [],
      max: [],
      median: [],
    };
    const areas: { [key: string]: Array<areaDataType> } = {
      middle90: [],
      middle50: [],
    };
    const first = alignedData.find((datum) => !!datum);
    if (!first) {
      return [lines, areas];
    }

    const indices = {
      '0%': first.quantiles.bins.indexOf('0%'),
      '5%': first.quantiles.bins.indexOf('5%'),
      '25%': first.quantiles.bins.indexOf('25%'),
      '50%': first.quantiles.bins.indexOf('50%'),
      '75%': first.quantiles.bins.indexOf('75%'),
      '95%': first.quantiles.bins.indexOf('95%'),
      '100%': first.quantiles.bins.indexOf('100%'),
    };

    alignedData.forEach((datum) => {
      if (!datum) {
        return null;
      }
      const { counts } = datum.quantiles;

      if (counts[indices['50%']] !== undefined) {
        lines.median.push({
          t: datum.dateInMillis,
          v: counts[indices['50%']],
        });
      }
      if (counts[indices['0%']] !== undefined) {
        lines.min.push({
          t: datum.dateInMillis,
          v: counts[indices['0%']],
        });
      }
      if (counts[indices['100%']] !== undefined) {
        lines.max.push({
          t: datum.dateInMillis,
          v: counts[indices['100%']],
        });
      }

      if (counts[indices['5%']] !== undefined && counts[indices['95%']] !== undefined) {
        areas.middle90.push({
          t: datum.dateInMillis,
          v0: counts[indices['5%']],
          v1: counts[indices['95%']],
        });
      }
      if (counts[indices['25%']] !== undefined && counts[indices['75%']] !== undefined) {
        areas.middle50.push({
          t: datum.dateInMillis,
          v0: counts[indices['25%']],
          v1: counts[indices['75%']],
        });
      }
      return null;
    });
    return [lines, areas];
  }, [alignedData]);

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [height, GRAPH_VERTICAL_BUFFER],
        domain: manualRange || getYBounds(filteredData, legendState),
      }).nice(),
    [filteredData, height, legendState, manualRange],
  );

  const calculateMaxDriftMetricValue = useCallback(() => {
    if (!filteredAnalysis.length) return 1;
    return (
      filteredAnalysis?.reduce((prev, curr) => {
        return (prev?.drift_metricValue ?? 0) > (curr?.drift_metricValue ?? 0) ? prev : curr;
      })?.drift_metricValue ?? 1
    );
  }, [filteredAnalysis]);

  const secondaryYScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [height, GRAPH_VERTICAL_BUFFER],
        domain: [0, Math.max(calculateMaxDriftMetricValue(), 1)],
      }).nice(),
    [calculateMaxDriftMetricValue, height],
  );

  const colorScale = scaleOrdinal<string, string>({
    domain: [
      OUTER_RANGE_NAME,
      INNER_RANGE_NAME,
      LINE_NAME,
      ...(!disableDrift ? [algorithmName] : []),
      MIN_LINE_NAME.toLowerCase(),
      MAX_LINE_NAME.toLowerCase(),
    ],
    range: [
      Colors.quantileLight,
      Colors.quantileMedium,
      Colors.chartPrimary,
      ...(!disableDrift ? [Colors.chartPurple] : []),
      Colors.chartYellow,
      Colors.chartYellow,
    ],
  });
  const shapeScale = scaleOrdinal<string, LegendShape>({
    domain: [
      OUTER_RANGE_NAME,
      INNER_RANGE_NAME,
      LINE_NAME,
      algorithmName,
      MIN_LINE_NAME.toLowerCase(),
      MAX_LINE_NAME.toLowerCase(),
    ],
    range: ['box', 'box', 'line', 'line', 'line', 'line'],
  });

  const [tooltipsCache, setTooltipsCache] = useRecoilState(analysisTooltipsCacheAtom);
  const tooltipsCacheCalculated = useDeepCompareMemo(() => {
    const cardsTooltips: { [index: number]: AnalysisTooltipDatum } = {};
    arrayOfLength(datedData.length).forEach((_, index) => {
      cardsTooltips[index] = mountTooltip({
        timestamp: datedData[index].dateInMillis,
        lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
        event: alignedEvents[index],
        item: alignedData[index],
      });
    });
    return cardsTooltips;
  }, [datedData, alignedEvents, alignedData, mountTooltip]);
  if (tooltipsCache[TOOLTIP_CACHE_KEY] !== tooltipsCacheCalculated) {
    setTooltipsCache((state) => ({
      ...state,
      [TOOLTIP_CACHE_KEY]: tooltipsCacheCalculated,
    }));
  }

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
  const handleClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };

  const renderLegend = () => (
    <BoxLegend
      name="quantile"
      colorScale={colorScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      onClick={handleClick}
      shapeScale={shapeScale}
      hiddenLegendItems={legendState}
    />
  );

  const profilesWithData = new Set(datedData.map((d) => d.dateInMillis).filter((_, i) => !!alignedData[i]));

  const renderAlertIcons = () => {
    if (disableDrift) return null;
    return (
      <AlertIcons
        cardType="drift"
        decorationCardType="est_quantile_drift"
        name="quantile"
        navigationInformation={{ columnId: manualColumnId }}
        data={datedData}
        profilesWithData={profilesWithData}
        xScale={xScale}
        isCorrelatedAnomalies={isCorrelatedAnomalies}
        hoverDispatch={hoverDispatch}
        alerts={alerts}
        graphHeight={height}
        graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
        graphWidth={width}
        showTooltip={({ index, mouseX, mouseY }) => {
          showTooltip({
            tooltipData: tooltipsCache[TOOLTIP_CACHE_KEY]?.[index],
            tooltipTop: mouseY,
            tooltipLeft: mouseX,
          });
        }}
        hideTooltip={hideTooltip}
      />
    );
  };
  const renderSelectedProfile = (): React.ReactNode => {
    const state = getAnalysisState(ACTION_STATE_TAG);
    const showSelectedProfile = !state || state.graphDecorationType === 'est_quantile_drift';
    return showSelectedProfile ? (
      <SelectedProfileLine
        xScale={xScale}
        height={height}
        yStart={GRAPH_VERTICAL_BUFFER}
        profileTimestamp={cardDataState.selectedProfile ?? undefined}
      />
    ) : null;
  };
  const renderHoverLine = () => (
    <HoverLine
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      cardType="drift"
      decorationCardType="est_quantile_drift"
      name="quantile"
      data={datedData}
      profilesWithData={profilesWithData}
      xScale={xScale}
      navigationInformation={{ columnId: manualColumnId }}
      allowBaselineComparison
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      hideTooltip={hideTooltip}
      graphLeftOffset={10}
      graphTopOffset={0}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      alerts={alerts}
      showTooltip={({ index, mouseX, mouseY }) => {
        showTooltip({
          tooltipData: tooltipsCache[TOOLTIP_CACHE_KEY]?.[index],
          tooltipTop: mouseY,
          tooltipLeft: mouseX,
        });
      }}
    />
  );

  const renderDqePoints = () => {
    if (disableDrift) return null;
    return alignedEvents.map((dqe) => {
      if (dqe === null) {
        return null;
      }

      return renderCircle(
        xScale(dqe.datasetTimestamp ?? 0),
        secondaryYScale(dqe.drift_metricValue ?? 0),
        Colors.chartPurple,
        true,
        `drift-0th-key-${dqe.datasetTimestamp}`,
        STANDARD_POINT_WIDTH,
      );
    });
  };

  const renderMappedPoints = () => {
    return (
      <>
        {!legendState.includes(MIN_LINE_NAME.toLowerCase()) &&
          lineData.min.map((datum) => {
            return renderCircle(
              xScale(datum.t),
              yScale(datum.v),
              Colors.chartYellow,
              true,
              `circle-0-percent-${datum.t}`,
              STANDARD_POINT_WIDTH,
            );
          })}
        {!legendState.includes(MAX_LINE_NAME.toLowerCase()) &&
          lineData.max.map((datum) => {
            return renderCircle(
              xScale(datum.t),
              yScale(datum.v),
              Colors.chartYellow,
              true,
              `circle-100-percent-${datum.t}`,
              STANDARD_POINT_WIDTH,
            );
          })}
        {!legendState.includes(LINE_NAME) &&
          lineData.median.map((datum) => {
            return renderCircle(
              xScale(datum.t),
              yScale(datum.v),
              Colors.chartPrimary,
              true,
              `circle-50-percent-${datum.t}`,
              STANDARD_POINT_WIDTH,
            );
          })}
      </>
    );
  };

  const renderDriftLine = () => {
    if (disableDrift) return null;
    return (
      <LinePath
        data={alignedEvents.filter((ev) => !!ev) as AnalysisDataFragment[]}
        x={(d) => xScale(getAlertTime(d))}
        y={(d) => secondaryYScale(d.drift_metricValue ?? 0)}
        stroke={Colors.chartPurple}
        strokeWidth={LINE_WIDTH}
      />
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
          {!legendState.includes(OUTER_RANGE_NAME) && (
            <AreaClosed
              data={areaData.middle90}
              x={(d) => xScale(d.t)}
              y0={(d) => yScale(d.v0)}
              y1={(d) => yScale(d.v1)}
              yScale={yScale}
              fill={Colors.quantileLight}
              fillOpacity={0.55}
              strokeOpacity={0.55}
              stroke={Colors.quantileMedium}
            />
          )}
          {!legendState.includes(INNER_RANGE_NAME) && (
            <AreaClosed
              data={areaData.middle50}
              x={(d) => xScale(d.t)}
              y0={(d) => yScale(d.v0)}
              y1={(d) => yScale(d.v1)}
              yScale={yScale}
              fill={Colors.quantileMedium}
              fillOpacity={0.5}
              stroke={Colors.quantileMedium}
            />
          )}
          {!legendState.includes(MAX_LINE_NAME.toLowerCase()) && (
            <LinePath
              data={lineData.max}
              x={(d) => xScale(d.t)}
              y={(d) => yScale(d.v)}
              stroke={Colors.chartYellow}
              strokeWidth={LINE_WIDTH}
            />
          )}
          {!legendState.includes(MIN_LINE_NAME.toLowerCase()) && (
            <LinePath
              data={lineData.min}
              x={(d) => xScale(d.t)}
              y={(d) => yScale(d.v)}
              stroke={Colors.chartYellow}
              strokeWidth={LINE_WIDTH}
            />
          )}
          {!legendState.includes(algorithmName) && analysisResults && renderDriftLine()}
          {!legendState.includes(LINE_NAME) && (
            <LinePath
              data={lineData.median}
              x={(d) => xScale(d.t)}
              y={(d) => yScale(d.v)}
              stroke={Colors.chartPrimary}
              strokeWidth={LINE_WIDTH}
            />
          )}
          {renderMappedPoints()}
          {!legendState.includes(algorithmName) && renderDqePoints()}
          <StandardVerticalAxis yScale={yScale} label={`${manualColumnId} range`} />
          {!disableDrift && (
            <>
              <SecondaryVerticalAxis
                yScale={secondaryYScale}
                label={algorithmName}
                right={graphWidth - GRAPH_HORIZONTAL_BUFFER}
              />
            </>
          )}
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
      {renderLegend()}
      {renderTooltip()}
    </div>
  );
};

export default QuantileDriftVisxChart;
