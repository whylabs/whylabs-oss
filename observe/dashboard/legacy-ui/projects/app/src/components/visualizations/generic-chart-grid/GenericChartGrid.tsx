import { scaleBand, scaleLinear } from '@visx/scale';
import { Colors } from '@whylabs/observatory-lib';
import { GridRows } from '@visx/grid';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { friendlyFormat } from 'utils/numberUtils';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { getDaysBucketFromDateRange } from 'utils/dateUtils';
import { useMemo, useState } from 'react';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { generateYTicks } from '../vizutils/scaleUtils';
import { DEFAULT_MARGIN, tooltipStyles } from '../utils';
import {
  BOTTOM_AXIS_SIZE,
  DEFAULT_MAX_Y_VALUE,
  GenericChartGridProps,
  GenericTimeseries,
  GRAPH_SIDE_OFFSET,
  LEFT_AXIS_SIZE,
  tickFormatter,
} from './utils';

export const GenericChartGrid = <DataShape, TooltipData>({
  data,
  width,
  height,
  children,
  margin,
  getDate,
  maxYValue,
  tooltipComponent,
  xScalePadding = 0.5,
  emptyProfileShape,
  leftAxisSize = LEFT_AXIS_SIZE,
  bottomAxisSize = BOTTOM_AXIS_SIZE,
  translateTooltipData,
}: GenericChartGridProps<GenericTimeseries<DataShape>, TooltipData>): JSX.Element => {
  const { top, bottom } = margin ?? DEFAULT_MARGIN;
  const marginTop = top ?? 10;
  const marginBottom = bottom ?? 0;
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipData>();
  const { dateRange } = useSuperGlobalDateRange();
  const endOpenedDateRange = openEndDateRangeTransformer(dateRange);

  const daysBucket = getDaysBucketFromDateRange(endOpenedDateRange) ?? data.map(getDate);
  const sortedData = useMemo(() => {
    return [...daysBucket].map((date) => {
      const fetchedData = data.find((ts) => ts.timestamp === date.getTime());
      return { ...(fetchedData ?? emptyProfileShape), timestamp: date.getTime() };
    });
  }, [data, daysBucket, emptyProfileShape]);
  const usedMaxYValue = maxYValue <= 0 ? DEFAULT_MAX_Y_VALUE : maxYValue;
  const dateScale = scaleBand<Date>({
    domain: daysBucket,
    padding: xScalePadding,
  });
  const countScale = scaleLinear<number>({
    domain: [0, usedMaxYValue],
    nice: true,
  });
  const xMax = width - leftAxisSize;
  const gridRowsHeight = height - bottomAxisSize - marginBottom;
  const [hoveredProfile, setHoveredProfile] = useState<number | undefined>();

  dateScale.rangeRound([leftAxisSize, xMax]);
  countScale.range([gridRowsHeight, marginTop]);

  const tickValues = generateYTicks(countScale.domain(), 4);
  let tooltipTimeout: number;

  const handleMouseLeave = () => {
    setHoveredProfile(undefined);
    tooltipTimeout = window.setTimeout(() => {
      hideTooltip();
    }, 300);
  };

  const gridRowsWidth = xMax - leftAxisSize;

  const handleMouseMove = (event: React.MouseEvent<SVGElement, MouseEvent>) => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    const { x, y } = localPoint(event) || { x: 0, y: 0 };
    const usedX = x - leftAxisSize;
    const profileWidth = (gridRowsWidth - GRAPH_SIDE_OFFSET) / daysBucket.length;
    const hoveredLeftOffset = usedX <= leftAxisSize;
    const hoveredIndex = hoveredLeftOffset ? 0 : Math.floor(Math.abs((usedX - GRAPH_SIDE_OFFSET / 2) / profileWidth));
    const usedIndex = Math.min(hoveredIndex, daysBucket.length - 1);
    const hoveredTimestamp = daysBucket[usedIndex]?.getTime();
    if (hoveredProfile !== hoveredTimestamp) {
      setHoveredProfile(hoveredTimestamp);
    }
    const outOfTheGraph = usedX < 0 || usedX > gridRowsWidth;
    if (!hoveredTimestamp || outOfTheGraph) {
      handleMouseLeave();
    } else {
      showTooltip({
        tooltipData: translateTooltipData(hoveredTimestamp, sortedData[usedIndex]),
        tooltipTop: y,
        tooltipLeft: x,
      });
    }
  };

  return (
    <div style={{ position: 'relative' }} data-testid="WhyLabsGenericChartGrid">
      <svg width={width} height={height} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <GridRows
          top={marginTop}
          left={leftAxisSize}
          scale={countScale}
          width={gridRowsWidth}
          height={gridRowsHeight}
          stroke={Colors.brandSecondary900}
          strokeOpacity={0.1}
          tickValues={tickValues}
        />
        {children({
          marginTop,
          graphData: sortedData,
          countScale,
          dateScale,
          gridRowsHeight,
          gridRowsWidth,
          hoveredProfile,
          plottedProfiles: daysBucket,
        })}
        <AxisBottom
          top={gridRowsHeight + marginTop}
          scale={dateScale}
          tickFormat={(d) => tickFormatter(d)}
          stroke={Colors.transparent}
          tickStroke={Colors.brandSecondary900}
          tickLength={4}
          tickLabelProps={() => ({
            textAnchor: 'middle',
            fontSize: 10,
            fontFamily: 'Asap, sans-serif',
            fill: Colors.brandSecondary900,
          })}
        />
        <AxisLeft
          left={leftAxisSize}
          top={marginTop}
          scale={countScale}
          stroke={Colors.transparent}
          tickStroke={Colors.transparent}
          tickFormat={(d) => friendlyFormat(d.valueOf(), 0)}
          tickValues={tickValues}
          tickLabelProps={() => ({
            textAnchor: 'end',
            verticalAnchor: 'middle',
            dx: '4px',
            fontSize: 10,
            fontFamily: 'Asap, sans-serif',
            fill: Colors.brandSecondary900,
          })}
        />
      </svg>
      {tooltipComponent && tooltipOpen && tooltipData && (
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
          {tooltipComponent(tooltipData)}
        </TooltipWithBounds>
      )}
    </div>
  );
};
