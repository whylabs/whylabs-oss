import { useMemo, useState } from 'react';
import { scaleLinear, scaleOrdinal, scaleTime } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { useTooltip, defaultStyles, useTooltipInPortal } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import { Colors } from '@whylabs/observatory-lib';
import { format } from 'd3-format';
import { utcFormat } from 'd3-time-format';
import { generateXTicks } from 'components/visualizations/vizutils/scaleUtils';
import { TimePeriod } from 'generated/graphql';
import { ONE_DAY_IN_MILLIS } from 'ui/constants';
import { alertVariants, BucketedAlertCount } from 'components/controls/table/cells/AnomalyTypes';
import AnomalyTooltip from 'components/controls/table/AnomalyTooltip';
import { TypedEntries } from 'utils/arrayUtils';

const useStyles = makeStyles(() =>
  createStyles({
    svgContainer: { position: 'relative', backgroundColor: Colors.chartYellow },
    tooltipHeaderText: {
      fontWeight: 600,
    },
    tooltipText: {
      fontFamily: 'Asap',
      fontSize: 11,
      color: Colors.brandSecondary900,
    },
    tooltipWarning: {
      fontStyle: 'italic',
    },
  }),
);

const MAX_BAR_SIZE_IN_PX = 48;
const MIN_BAR_SIZE_IN_PX = 3;

interface LongHistogramVisxChartProps {
  name: string;
  svgHeight: number;
  svgWidth: number;
  graphVerticalBuffer: number;
  graphHorizontalBuffer: number;
  bucketedAlertCounts: BucketedAlertCount[];
  batchFrequency?: TimePeriod;
}

const LongHistogramVisxChart: React.FC<LongHistogramVisxChartProps> = ({
  name,
  svgHeight,
  svgWidth,
  graphHorizontalBuffer,
  graphVerticalBuffer,
  bucketedAlertCounts,
  batchFrequency = TimePeriod.P1D,
}) => {
  const [hoveredBarIndex, setHoveredBarIndex] = useState(-1);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<number>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    scroll: true,
    detectBounds: true,
  });
  const styles = useStyles();

  const tooltipStyles = {
    ...defaultStyles,
    minWidth: '110px',
    padding: 0,
    background: 'transparent',
    zIndex: 3,
  };

  const smallWidth = Math.min(bucketedAlertCounts.length * MAX_BAR_SIZE_IN_PX, svgWidth);
  const graphWidth =
    smallWidth < svgWidth ? smallWidth : Math.max(svgWidth, bucketedAlertCounts.length * MIN_BAR_SIZE_IN_PX);
  // Careful not to divide by zero here
  const barWidth = bucketedAlertCounts.length > 0 ? graphWidth / bucketedAlertCounts.length : MAX_BAR_SIZE_IN_PX;
  const manualFiddling = Math.min(barWidth / 3, 3);
  const xMin = bucketedAlertCounts[0].from;
  const xMax = bucketedAlertCounts[bucketedAlertCounts.length - 1].to;
  const yMax =
    bucketedAlertCounts.reduce(
      (acc, curr) =>
        Math.max(
          acc,
          Object.values(curr.counts).reduce((sum, c) => sum + c, 0),
        ),
      0,
    ) || 2;

  const xScale = useMemo(
    () =>
      scaleTime({
        range: [graphHorizontalBuffer, graphWidth - graphHorizontalBuffer],
        round: true,
        domain: [xMin, xMax],
      }),
    [xMin, xMax, graphWidth, graphHorizontalBuffer],
  );

  const rangeMax = svgHeight - graphVerticalBuffer;
  const yScale = useMemo(
    () =>
      // const graphMaxY = Math.round(yMax);
      scaleLinear<number>({
        range: [svgHeight - graphVerticalBuffer, graphVerticalBuffer / 2],
        round: true,
        domain: [0, yMax],
      }).nice(),
    [svgHeight, graphVerticalBuffer, yMax],
  );

  const keys = alertVariants.map((variant) => variant.key);
  const colorScale = scaleOrdinal({
    domain: keys,
    range: Colors.alertStackedBarArray,
  });

  const maxTooltipTop = (3 * (svgHeight - graphVerticalBuffer * 1.5)) / 4;

  const handleMouseOver = (event: React.MouseEvent, index: number) => {
    const coords = localPoint(event);
    if (!coords) {
      return;
    }
    showTooltip({
      tooltipLeft: coords.x,
      tooltipTop: Math.min(coords.y, maxTooltipTop),
      tooltipData: index,
    });
  };

  const renderBars = () => {
    if (bucketedAlertCounts.length > 1) {
      return bucketedAlertCounts.map((bac) => {
        const barStackX = xScale(bac.from) + 1;
        const barStackXEnd = xScale(bac.to);
        let offsetYFromPreviousRect = 0;
        return TypedEntries(bac.counts).map(([variant, count]) => {
          const barStackPortionY = yScale(count);
          const barStackPortionHeight = svgHeight - graphVerticalBuffer - barStackPortionY;
          const barStackPortionYOffset = barStackPortionY - offsetYFromPreviousRect;
          offsetYFromPreviousRect += barStackPortionHeight;
          const barStackPortionColor = colorScale(variant);

          return (
            <rect
              key={`histogram-bar-${name}-${barStackX}-${barStackPortionY}-${variant}`}
              x={barStackX}
              y={barStackPortionYOffset}
              width={barStackXEnd - barStackX}
              height={barStackPortionHeight}
              fill={barStackPortionColor}
            />
          );
        });
      });
    }

    if (bucketedAlertCounts.length === 1) {
      const bac = bucketedAlertCounts[0];
      let offsetYFromPreviousRect = 0;
      return TypedEntries(bac.counts).map(([variant, count]) => {
        const barStackPortionY = yScale(count);
        const barStackPortionHeight = svgHeight - graphVerticalBuffer - barStackPortionY;
        const barStackPortionYOffset = barStackPortionY - offsetYFromPreviousRect;
        offsetYFromPreviousRect += barStackPortionHeight;
        const barStackPortionColor = colorScale(variant);

        return (
          <rect
            key={`histogram-bar-${name}-${barStackPortionY}-${variant}`}
            x={xScale(xMin)}
            y={barStackPortionYOffset}
            width={graphWidth - graphHorizontalBuffer}
            height={barStackPortionHeight}
            fill={barStackPortionColor}
          />
        );
      });
    }
    return null;
  };

  const renderShadowBars = () => {
    if (bucketedAlertCounts.length > 1) {
      return bucketedAlertCounts.map((bac, index) => {
        const barX = xScale(bac.from) + 1;
        const barXend = xScale(bac.to);
        return (
          <Bar
            key={`histogram-bar-${name}-${barX}`}
            x={barX}
            y={graphVerticalBuffer / 2}
            width={barXend - barX}
            height={svgHeight - graphVerticalBuffer * 1.5}
            pointerEvents="none"
            fill={hoveredBarIndex === index ? Colors.brandSecondary300 : Colors.transparent}
          />
        );
      });
    }
    if (bucketedAlertCounts.length === 1) {
      return (
        <Bar
          key="histogram-bar-one-day-range"
          x={xScale(xMin)}
          y={graphVerticalBuffer / 2}
          width={graphWidth - graphHorizontalBuffer}
          height={svgHeight - graphVerticalBuffer * 1.5}
          pointerEvents="none"
          fill={hoveredBarIndex === 0 ? Colors.brandSecondary300 : Colors.transparent}
        />
      );
    }
    return null;
  };

  const renderHoverBars = () => {
    if (bucketedAlertCounts.length > 1) {
      return bucketedAlertCounts.map((bac, index) => {
        const barX = xScale(bac.from) + 1;
        const barXend = xScale(bac.to);
        /* eslint-disable jsx-a11y/mouse-events-have-key-events */
        // TODO: figure out how to do tooltips for key events to fix accessibility.
        return (
          <Bar
            key={`histogram-bar-${name}-${barX}`}
            x={barX}
            y={graphVerticalBuffer / 2}
            width={barXend - barX}
            height={svgHeight - graphVerticalBuffer * 1.5} // The hoverbars don't reach the bottom to prevent clipping the tooltip
            pointerEvents="visible"
            onMouseEnter={() => {
              setHoveredBarIndex(index);
            }}
            onMouseOver={(event) => {
              handleMouseOver(event, index);
            }}
            fill={Colors.transparent}
          />
        );
      });
    }
    if (bucketedAlertCounts.length === 1) {
      return (
        <Bar
          key="histogram-hover-bar-one-day-range"
          x={xScale(xMin)}
          y={graphVerticalBuffer / 2}
          width={graphWidth - graphHorizontalBuffer}
          height={svgHeight - graphVerticalBuffer * 1.5} // The hoverbars don't reach the bottom to prevent clipping the tooltip
          pointerEvents="visible"
          onMouseEnter={() => {
            setHoveredBarIndex(0);
          }}
          onMouseOver={(event) => {
            handleMouseOver(event, 0);
          }}
          fill={Colors.transparent}
        />
      );
    }
    return null;
  };

  const domain = yScale.domain();
  const totalDomain = Math.abs(domain[domain.length - 1] - domain[0]);
  const formattingString = totalDomain < 10 ? '.3' : '~s';

  const renderTooltip = () => {
    if (
      !tooltipOpen ||
      tooltipData === undefined ||
      hoveredBarIndex < 0 ||
      hoveredBarIndex >= bucketedAlertCounts.length
    ) {
      return null;
    }

    const bac = bucketedAlertCounts[hoveredBarIndex];
    // const noMonitorMessage =
    //   Math.abs(new Date().getTime() - bac.dateInMillis) < 1.25 * ONE_DAY_IN_MILLIS && bac.alertCount === 0
    //     ? 'Monitor may not have run yet.'
    //     : '';
    const totalBucketAlerts = Object.values(bac.counts).reduce((sum, c) => sum + c, 0);
    const noMonitorMessage =
      Math.abs(new Date().getTime() - bac.from.getTime()) < 1.25 * ONE_DAY_IN_MILLIS && totalBucketAlerts === 0
        ? 'Monitor may not have run yet.'
        : '';

    return (
      <TooltipInPortal key={Math.random()} top={tooltipTop} left={tooltipLeft} style={tooltipStyles} offsetTop={-4}>
        <AnomalyTooltip
          bottomText={noMonitorMessage}
          timestamp={bac.from.valueOf()}
          items={alertVariants.map((variant) => {
            return {
              label: variant.text,
              color: variant.color,
              count: bac.counts[variant.key],
            };
          })}
        />
      </TooltipInPortal>
    );
  };

  // Note: We slice off the end here because the stacked bar chart intentionally includes one more unit
  // than the data, in order for the tick marks to be in the middle of the bar. The actual X-value of the
  // start of the bucket date would end up on the left edge of the bar, but that looks aesthetically ugly.
  const filteredTicksInMillis = generateXTicks(
    xScale,
    bucketedAlertCounts.map((d) => d.from.getTime()),
    graphWidth - graphHorizontalBuffer,
    batchFrequency,
  )?.slice(0, -1);
  const usedFilteredTicksInMillis =
    filteredTicksInMillis && filteredTicksInMillis.length > 1
      ? filteredTicksInMillis.slice(0, -1)
      : filteredTicksInMillis;

  return (
    <div className={styles.svgContainer} ref={containerRef}>
      <svg width={graphWidth} height={svgHeight}>
        <Group
          top={0}
          left={0}
          onMouseLeave={() => {
            setHoveredBarIndex(-1);
            hideTooltip();
          }}
        >
          <rect
            x={graphHorizontalBuffer}
            y={0}
            width={graphWidth - graphHorizontalBuffer}
            height={svgHeight}
            fill={Colors.white}
            radius={0}
            stroke={Colors.transparent}
          />
          <rect
            x={graphHorizontalBuffer}
            y={graphVerticalBuffer / 2}
            width={graphWidth - graphHorizontalBuffer * 2}
            height={svgHeight - graphVerticalBuffer * 1.5}
            fill={Colors.transparent}
            radius={2}
            stroke={Colors.brandSecondary200}
          />
          <AxisLeft
            scale={yScale}
            left={graphHorizontalBuffer}
            labelProps={{
              textAnchor: 'middle',
              fontSize: 12,
              fontFamily: 'Asap, sans-serif',
              fontWeight: 600,
              letterSpacing: '-0.5px',
              color: Colors.brandSecondary900,
              fill: Colors.brandSecondary900,
              dx: '-0.5em',
            }}
            numTicks={2}
            stroke={Colors.brandSecondary200}
            tickStroke={Colors.brandSecondary200}
            tickLength={2}
            tickFormat={format(formattingString)}
            tickLabelProps={() => ({
              textAnchor: 'end',
              verticalAnchor: 'middle',
              lineHeight: '1em',
              dx: 0,
              dy: 0,
              fontSize: 10,
              fontFamily: 'Asap, sans-serif',
              color: Colors.brandSecondary900,
              fill: Colors.brandSecondary900,
            })}
          />
          <AxisBottom
            scale={xScale}
            top={rangeMax}
            stroke={Colors.brandSecondary200}
            numTicks={5}
            tickLength={3}
            tickTransform={`translate(${barWidth / 2 - manualFiddling})`}
            tickFormat={(d) => utcFormat('%m-%d')(d as Date)}
            tickValues={usedFilteredTicksInMillis?.filter((_, i) => !(i % 2)) ?? undefined}
            tickStroke={Colors.brandSecondary200}
            tickLabelProps={() => ({
              fill: Colors.brandSecondary900,
              fontSize: 10,
              fontFamily: 'Asap',
              textAnchor: 'middle',
            })}
          />
          {renderShadowBars()}
          {renderBars()}
          {renderHoverBars()}
          {renderTooltip()}
        </Group>
      </svg>
    </div>
  );
};

export default LongHistogramVisxChart;
