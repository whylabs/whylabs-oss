import { useMemo } from 'react';

import { Group } from '@visx/group';
import { AreaClosed, LinePath } from '@visx/shape';
import { curveLinear } from '@visx/curve';
import { Colors } from '@whylabs/observatory-lib';
import { Y_RANGE_BUFFER_RATIO } from 'ui/constants';
import { useDeepCompareMemo } from 'use-deep-compare';
import { getMinAndMaxValueFromArray } from 'utils/numberUtils';
import { useTheme } from '@material-ui/core';
import { useHover } from 'hooks/useHover';
import { useTooltip } from '@visx/tooltip';
import { TimePeriod, AnalysisDataFragment } from 'generated/graphql';
import { getThresholdDomain, getThresholdLower, getThresholdUpper, hasAtLeastOneThreshold } from 'utils/analysisUtils';
import MetricThresholdTooltip from 'components/tooltips/MetricThresholdTooltip';
import { MetricSeriesData } from 'types/graphTypes';
import { useRecoilState } from 'recoil';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { isNumber } from 'utils/typeGuards';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { DateBottomAxis, FlexibleFrame, HoverLine, StandardVerticalAxis, AlertIcons } from '../components';
import { renderCircle, STANDARD_POINT_WIDTH } from '../vizutils/shapeUtils';
import { clipNumericTimestampData, generateUnionArrays } from '../vizutils/dataUtils';
import { generateDatedXScale } from '../vizutils/scaleUtils';
import { generateYRange } from '../simple-line-chart/rangeUtils';

const MIN_Y_RANGE = 0.2;
const HORIZONTAL_BUFFER = 0;
const LEFT_MARGIN = 63;
const VERTICAL_BUFFER = 12;

interface NoLegendTimeSeriesProps {
  height: number;
  width: number;
  timestamps: number[];
  data: MetricSeriesData[];
  alerts: AnalysisDataFragment[];
  name: string;
  decimals?: number;
  percentage?: boolean;
  batchFrequency?: TimePeriod;
  featurePage?: boolean;
  labelForSingleValues?: string;
  splitWidth?: number;
}

interface TooltipDatum {
  timestamp: number;
  data: { label: string; value: number | null; color: string; datasetName?: string; shape: string }[] | null;
  alert?: AnalysisDataFragment;
}

const NoLegendTimeSeries: React.FC<NoLegendTimeSeriesProps> = ({
  height,
  width,
  timestamps,
  data,
  name,
  decimals = 2,
  percentage = false,
  alerts,
  batchFrequency,
  featurePage = false,
  labelForSingleValues,
  splitWidth = 0,
}) => {
  const theme = useTheme();
  const { dateRange } = useSuperGlobalDateRange();

  const { from, to } = openEndDateRangeTransformer(dateRange);

  const [hoverState, hoverDispatch] = useHover();
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipDatum>();

  const { clippedTimestamps, clippedData, validPairing } = clipNumericTimestampData(timestamps, data, [from, to]);

  if (!validPairing) {
    console.error(
      `Invalid performance metric data and timestamp grouping. Timestamp count: ${
        timestamps.length
      }, data: ${JSON.stringify(data)}`,
    );
  }
  const datesFromTimestamps = clippedTimestamps.map((t, idx) => ({
    dateInMillis: t,
    seriesData: clippedData.map((ser) => ({
      label: ser.label,
      color: ser.color,
      datum: ser.values[idx],
      datasetName: ser.datasetName,
    })),
  }));

  const totalVerticalBuffer = VERTICAL_BUFFER + 2 * theme.spacing(1);
  const leftMargin = LEFT_MARGIN + HORIZONTAL_BUFFER;
  const rightMargin = HORIZONTAL_BUFFER;
  const totalHorizontalBuffer = leftMargin + rightMargin;
  const chartWidth = width - totalHorizontalBuffer;

  const { datedData, alignedData } = useDeepCompareMemo(
    () => generateUnionArrays(datesFromTimestamps, alerts, [from, to], batchFrequency),
    [datesFromTimestamps, batchFrequency, alerts, from, to],
  );

  const xScale = useDeepCompareMemo(
    () => generateDatedXScale(datedData, leftMargin + chartWidth, leftMargin, 0, [from, to]),
    [datedData, width],
  );

  const thresholdDomain = useMemo(() => getThresholdDomain(alerts), [alerts]);

  const yScale = useDeepCompareMemo(() => {
    const [yMin, yMax] = getMinAndMaxValueFromArray([
      ...clippedData.reduce<number[]>((acc, d) => [...acc, ...d.values.filter(isNumber)], []),
      ...thresholdDomain,
    ]);

    return generateYRange({
      graphTop: height - totalVerticalBuffer,
      graphBottom: totalVerticalBuffer,
      valueRange: [yMin, yMax || 1],
      yBufferRatio: Y_RANGE_BUFFER_RATIO,
      minRange: MIN_Y_RANGE,
    });
  }, [data, totalVerticalBuffer, thresholdDomain]);

  const zippedData = useMemo(
    () =>
      clippedData.map((series) => {
        const validTimes = [...clippedTimestamps].filter((_t, idx) => series.values[idx] !== null);
        const validSeries = series.values.filter((v) => v !== null).map((v) => v as number);

        return {
          label: series.label,
          points: validSeries.map((y, idx) => ({
            x: validTimes[idx],
            y,
          })),
          color: series.color,
          datasetName: series.datasetName,
        };
      }),
    [clippedData, clippedTimestamps],
  );

  const renderLines = () => (
    <>
      {zippedData
        .slice()
        .reverse()
        .map((series, i) => (
          <LinePath
            curve={curveLinear}
            data={series.points}
            key={`line-path-${series.label}-${series.datasetName}`}
            x={(d) => xScale(d.x)}
            y={(d) => yScale(d.y)}
            stroke={series.color}
            strokeWidth={1}
            shapeRendering="geometricPrecision"
          />
        ))}
    </>
  );

  const renderLinePoints = () => (
    <>
      {zippedData
        .slice()
        .reverse()
        .map((series) => {
          return series.points.map((pt) =>
            renderCircle(
              xScale(pt.x),
              yScale(pt.y),
              series.color,
              true,
              `timeseries-${series.label}-${pt.x}-line-pt`,
              STANDARD_POINT_WIDTH,
            ),
          );
        })}
    </>
  );

  const alertsMap = useMemo(() => {
    const aMap: Map<number, AnalysisDataFragment> = new Map<number, AnalysisDataFragment>();
    alerts.forEach((al) => {
      if ('datasetTimestamp' in al && typeof al.datasetTimestamp === 'number') {
        aMap.set(al.datasetTimestamp, al);
      }
    });
    return aMap;
  }, [alerts]);

  const profilesWithData = new Set(alignedData.filter((d) => !!d).map((d) => d!.dateInMillis));
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);
  const renderHoverLine = () => (
    <HoverLine
      isCorrelatedAnomalies={false}
      name={name}
      data={datedData}
      xScale={xScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      graphLeftOffset={0}
      alerts={alerts.filter((a) => a.isAnomaly)}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            data: alignedData[index]
              ? alignedData[index]!.seriesData.map((sd) => ({
                  label: sd.label,
                  value: sd.datum,
                  color: sd.color,
                  datasetName: sd.datasetName,
                  shape: 'line',
                }))
              : null,
            alert: alertsMap.get(datedData[index].dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left - leftMargin * 2,
        });
      }}
      hideTooltip={hideTooltip}
      graphHeight={height - totalVerticalBuffer}
      graphTopOffset={totalVerticalBuffer}
      graphVerticalBuffer={totalVerticalBuffer}
      graphWidth={width}
      profilesWithData={profilesWithData}
    />
  );

  const renderAlertIcons = () => (
    <AlertIcons
      name="accuracy"
      isCorrelatedAnomalies={false}
      profilesWithData={profilesWithData}
      data={datedData}
      xScale={xScale}
      hoverDispatch={hoverDispatch}
      alerts={alerts.filter((a) => a.isAnomaly)}
      graphHeight={height}
      graphVerticalBuffer={VERTICAL_BUFFER}
      graphWidth={width}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            data: alignedData[index]
              ? alignedData[index]!.seriesData.map((sd) => ({
                  label: sd.label,
                  value: sd.datum,
                  color: sd.color,
                  datasetName: sd.datasetName,
                  shape: 'line',
                }))
              : null,
            alert: alertsMap.get(datedData[index].dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
      hideTooltip={hideTooltip}
    />
  );

  const left = tooltipLeft ? tooltipLeft + splitWidth + leftMargin : splitWidth + leftMargin;
  const top = tooltipTop ? tooltipTop + totalVerticalBuffer : totalVerticalBuffer;

  return (
    <div style={{ width, height }}>
      <div>
        <MetricThresholdTooltip
          analysisResult={tooltipData?.alert}
          batchFrequency={batchFrequency}
          metrics={tooltipData?.data ?? []}
          primaryMetricLabel={name}
          open={tooltipOpen && !drawnMenuState.open}
          timestamp={tooltipData?.timestamp}
          tooltipLeft={left - leftMargin}
          tooltipTop={top}
        />
        <svg width={width} height={height}>
          {featurePage ? (
            <StandardVerticalAxis squishTicks squishLabel yScale={yScale} label={labelForSingleValues} squishText />
          ) : (
            <StandardVerticalAxis yScale={yScale} squishText percentage={percentage} squishTicks />
          )}

          <Group top={0} left={0}>
            <FlexibleFrame
              yScale={yScale}
              timeScale={xScale}
              ticksInMillis={clippedTimestamps}
              height={height}
              verticalBuffer={totalVerticalBuffer}
              width={width}
              horizontalBuffer={leftMargin}
              endHorizontalBuffer={rightMargin}
              batchFrequency={batchFrequency}
            />
            <AreaClosed
              data={alerts.filter((a) => a.datasetTimestamp !== null && hasAtLeastOneThreshold(a))}
              x={(d) => {
                return xScale(d.datasetTimestamp ?? 0);
              }}
              // If a threshold value is missing, default to the yScale min and max
              y0={(d) => yScale(getThresholdLower(d) ?? yScale.domain()[0])}
              y1={(d) => yScale(getThresholdUpper(d) ?? yScale.domain()[1])}
              yScale={yScale}
              fill={Colors.quantileMedium}
              fillOpacity={0.5}
              stroke={Colors.quantileMedium}
              strokeOpacity={0.5}
            />
            {renderLines()}
            {renderLinePoints()}
            <DateBottomAxis
              xScale={xScale}
              width={chartWidth}
              ticksInMillis={clippedTimestamps}
              horizontalBuffer={totalHorizontalBuffer}
              height={height - totalVerticalBuffer}
              batchFrequency={batchFrequency}
            />
            {renderHoverLine()}
            {renderAlertIcons()}
          </Group>
        </svg>
      </div>
    </div>
  );
};

export default NoLegendTimeSeries;
