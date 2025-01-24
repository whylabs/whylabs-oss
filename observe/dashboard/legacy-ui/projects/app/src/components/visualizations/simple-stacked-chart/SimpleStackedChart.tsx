import { useMemo, useState } from 'react';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleLinear, scaleOrdinal, scaleTime } from '@visx/scale';
import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { useTooltip, defaultStyles, TooltipWithBounds, Portal } from '@visx/tooltip';
import AnomalyTooltip from 'components/controls/table/AnomalyTooltip';
import { ONE_DAY_IN_MILLIS } from 'ui/constants';
import { TypedEntries } from 'utils/arrayUtils';
import { mergeBars } from './barMerge';
import { StackedBar } from './types';

const MAX_BAR_SIZE_IN_PX = 28;
const MIN_BAR_SIZE_IN_PX = 3;

const useStyles = createStyles(() => ({
  svgContainer: { position: 'relative' },
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
}));
export type SimpleStackedChartProps = {
  width: number;
  height: number;
  colorRange: string[];
  data: StackedBar[];
  barGap?: number;
};

function squishDataToBounds(data: StackedBar[], width: number): StackedBar[] {
  const extremeWidth = data.length * MIN_BAR_SIZE_IN_PX;
  const multiple = Math.ceil(extremeWidth / width);
  return mergeBars(data, multiple);
}

export default function SimpleStackedChart({
  width,
  height,
  data,
  colorRange,
  barGap = 2,
}: SimpleStackedChartProps): JSX.Element {
  const [hoveredBarIndex, setHoveredBarIndex] = useState(-1);
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } = useTooltip<number>();
  const { classes: styles } = useStyles();
  const graphHorizontalBuffer = 0;
  const graphVerticalBuffer = 0;
  const usedData = squishDataToBounds(data, width);
  const usedBarGap = width < usedData.length * (MIN_BAR_SIZE_IN_PX + barGap) ? 0 : barGap;
  const graphWidth = width;

  const tooltipStyles = {
    ...defaultStyles,
    minWidth: '110px',
    padding: 0,
    background: 'transparent',
    zIndex: 3,
  };

  const xMin = usedData[0].from;
  const xMax = usedData[usedData.length - 1].to;
  const biggestYValue =
    usedData.reduce(
      (acc, curr) =>
        Math.max(
          acc,
          Object.values(curr.counts).reduce((sum, c) => sum + c.count, 0),
        ),
      0,
    ) || 3;

  const yMax = biggestYValue < 3 ? 3 : biggestYValue;

  const xScale = useMemo(
    () =>
      scaleTime({
        range: [graphHorizontalBuffer, graphWidth - graphHorizontalBuffer],
        round: true,
        domain: [xMin, xMax],
      }),
    [xMin, xMax, graphWidth, graphHorizontalBuffer],
  );
  const usedBarWidth = usedData.length > 0 ? xScale(usedData[0].to) - xScale(usedData[0].from) : MAX_BAR_SIZE_IN_PX;

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [height - graphVerticalBuffer, graphVerticalBuffer / 2],
        round: true,
        domain: [0, yMax],
      }).nice(),
    [height, graphVerticalBuffer, yMax],
  );

  const keys = Object.keys(usedData[0].counts);
  const colorScale = scaleOrdinal({
    domain: keys,
    range: colorRange,
  });

  const handleMouseOver = (event: React.MouseEvent, index: number) => {
    showTooltip({
      tooltipLeft: event.pageX,
      tooltipTop: event.pageY,
      tooltipData: index,
    });
  };

  const renderBars = () => {
    if (usedData.length > 1) {
      return usedData.map((bac) => {
        const barStackX = xScale(bac.from) + usedBarGap;
        const barStackXEnd = barStackX + usedBarWidth;
        let offsetYFromPreviousRect = 0;
        const barStack = TypedEntries(bac.counts).reverse(); // reverse so we keep the original order of the stack

        return barStack.map(([variant, bar]) => {
          const barStackPortionY = yScale(bar.count);
          const barStackPortionHeight = height - graphVerticalBuffer - barStackPortionY;
          const barStackPortionYOffset = barStackPortionY - offsetYFromPreviousRect;
          offsetYFromPreviousRect += barStackPortionHeight;
          const barStackPortionColor = colorScale(variant);

          return (
            <rect
              key={`simple-histogram-bar-${barStackX}-${barStackPortionY}-${variant}`}
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

    if (usedData.length === 1) {
      const bac = usedData[0];
      let offsetYFromPreviousRect = 0;
      return TypedEntries(bac.counts).map(([variant, bar]) => {
        const barStackPortionY = yScale(bar.count);
        const barStackPortionHeight = height - graphVerticalBuffer - barStackPortionY;
        const barStackPortionYOffset = barStackPortionY - offsetYFromPreviousRect;
        offsetYFromPreviousRect += barStackPortionHeight;
        const barStackPortionColor = colorScale(variant);

        return (
          <rect
            key={`simple-histogram-bar-${barStackPortionY}-${variant}`}
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
    if (usedData.length > 1) {
      return usedData.map((bac, index) => {
        const barX = xScale(bac.from) + usedBarGap;
        const barXend = barX + usedBarWidth;
        return (
          <Bar
            key={`simple-histogram-shadow-bar-${barX}`}
            x={barX}
            y={graphVerticalBuffer / 2}
            width={barXend - barX}
            height={height - graphVerticalBuffer * 1.5}
            pointerEvents="none"
            fill={hoveredBarIndex === index ? Colors.brandSecondary300 : Colors.transparent}
          />
        );
      });
    }
    if (usedData.length === 1) {
      return (
        <Bar
          key="histogram-bar-one-day-range"
          x={xScale(xMin)}
          y={graphVerticalBuffer / 2}
          width={graphWidth - graphHorizontalBuffer}
          height={height - graphVerticalBuffer * 1.5}
          pointerEvents="none"
          fill={hoveredBarIndex === 0 ? Colors.brandSecondary300 : Colors.transparent}
        />
      );
    }
    return null;
  };

  const renderHoverBars = () => {
    if (usedData.length > 1) {
      return usedData.map((bac, index) => {
        const barX = xScale(bac.from) + usedBarGap;
        const barXend = barX + usedBarWidth;
        /* eslint-disable jsx-a11y/mouse-events-have-key-events */
        // TODO: figure out how to do tooltips for key events to fix accessibility.
        return (
          <Bar
            key={`simple-histogram-hover-bar-${barX}`}
            x={barX}
            y={graphVerticalBuffer / 2}
            width={barXend - barX}
            height={height - graphVerticalBuffer * 1.5} // The hoverbars don't reach the bottom to prevent clipping the tooltip
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
    if (usedData.length === 1) {
      return (
        <Bar
          key="histogram-hover-bar-one-day-range"
          x={xScale(xMin)}
          y={graphVerticalBuffer / 2}
          width={graphWidth - graphHorizontalBuffer}
          height={height - graphVerticalBuffer * 1.5} // The hoverbars don't reach the bottom to prevent clipping the tooltip
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

  const renderTooltip = () => {
    if (!tooltipOpen || tooltipData === undefined || hoveredBarIndex < 0 || hoveredBarIndex >= usedData.length) {
      return null;
    }

    const bar = usedData[hoveredBarIndex];
    const totalBucketAlerts = Object.values(bar.counts).reduce((sum, c) => sum + c.count, 0);
    const noMonitorMessage =
      Math.abs(new Date().getTime() - bar.from.getTime()) < 1.25 * ONE_DAY_IN_MILLIS && totalBucketAlerts === 0
        ? 'Monitor may not have run yet.'
        : '';

    return (
      <Portal key={Math.random()}>
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={tooltipStyles} offsetTop={-4}>
          <AnomalyTooltip
            bottomText={noMonitorMessage}
            timestamp={bar.from.valueOf()}
            endTimestamp={bar.to.valueOf()}
            items={Object.keys(bar.counts).map((key) => {
              return {
                label: key,
                color: bar.counts[key].color,
                count: bar.counts[key].count,
              };
            })}
          />
        </TooltipWithBounds>
      </Portal>
    );
  };

  return (
    <div className={styles.svgContainer}>
      <svg width={graphWidth} height={height}>
        <Group
          top={0}
          left={0}
          onMouseLeave={() => {
            setHoveredBarIndex(-1);
            hideTooltip();
          }}
        >
          {renderShadowBars()}
          {renderBars()}
          {renderHoverBars()}
        </Group>
      </svg>
      {renderTooltip()}
    </div>
  );
}
