import { scaleOrdinal } from '@visx/scale';
import { Group } from '@visx/group';
import { BarStack, Bar } from '@visx/shape';
import AnomalyTooltip, { AnomalyTooltipProps } from 'components/controls/table/AnomalyTooltip';
import { Colors } from '@whylabs/observatory-lib';
import { useMemo, Fragment } from 'react';
import {
  DatedStackedBar,
  findMaxTotalCount,
  getKeysAndColors,
  KeysAndColors,
  translateDatedStackedTooltipData,
} from './utils';
import { CommonGraphProps, getDate } from '../utils';
import { GenericChartGrid } from '../generic-chart-grid/GenericChartGrid';
import { GRAPH_SIDE_OFFSET, GRAPH_TOP_OFFSET } from '../generic-chart-grid/utils';

interface DatedBarStackProps extends CommonGraphProps<DatedStackedBar> {
  colorKeys?: KeysAndColors;
  hiddenKeys?: Set<string>;
}

export const DatedBarStack: React.FC<DatedBarStackProps> = ({
  data,
  width,
  height,
  name,
  margin,
  colorKeys,
  hiddenKeys,
}) => {
  const { keys, colors, names } = colorKeys || getKeysAndColors(data);

  const filteredData = useMemo(() => {
    return data.map((d) => {
      const filteredCounts = hiddenKeys ? d.counts.filter((count) => !hiddenKeys.has(count.id)) : d.counts;
      return {
        ...d,
        counts: filteredCounts,
      };
    });
  }, [data, hiddenKeys]);
  const maxYValue = findMaxTotalCount(filteredData);

  const colorScale = scaleOrdinal<string, string>({
    domain: keys,
    range: colors,
  });

  const emptyItemCounts: DatedStackedBar['counts'] = keys.map((key, idx) => {
    return {
      id: key,
      count: 0,
      color: colors[idx],
      name: names[idx],
    };
  });

  return (
    <GenericChartGrid<DatedStackedBar, AnomalyTooltipProps>
      width={width}
      height={height}
      margin={margin}
      data={filteredData}
      emptyProfileShape={{ timestamp: 0, counts: emptyItemCounts }}
      maxYValue={maxYValue}
      getDate={getDate}
      tooltipComponent={({ items, timestamp }) => <AnomalyTooltip items={items} timestamp={timestamp} />}
      translateTooltipData={translateDatedStackedTooltipData}
    >
      {({
        marginTop,
        graphData,
        countScale,
        dateScale,
        gridRowsWidth,
        gridRowsHeight,
        plottedProfiles,
        hoveredProfile,
      }) => {
        const hovered = plottedProfiles.find((ts) => ts.getTime() === hoveredProfile);
        const barWidth = (gridRowsWidth - GRAPH_SIDE_OFFSET) / graphData.length;
        return (
          <Group top={marginTop}>
            {hovered && (
              <Bar
                key={`hover-bar--${name}-${hovered}`}
                strokeWidth={0}
                x={(dateScale(hovered) ?? 0) - barWidth / 4}
                y={3}
                height={gridRowsHeight - GRAPH_TOP_OFFSET}
                width={barWidth}
                fill={Colors.chartHoverBackground}
              />
            )}
            <BarStack<DatedStackedBar, string>
              data={graphData}
              keys={keys}
              x={getDate}
              xScale={dateScale}
              yScale={countScale}
              color={colorScale}
              value={(d, key) => {
                return d.counts.find((c) => c.id === key)?.count ?? 0;
              }}
            >
              {(barStacks) =>
                barStacks.map((barStack) =>
                  barStack.bars.map((bar) => (
                    <Fragment key={`bar-fragment-${name}-${barStack.index}-${bar.index}`}>
                      <rect
                        key={`bar-stack-${name}-${barStack.index}-${bar.index}`}
                        x={bar.x}
                        y={bar.y}
                        height={bar.height}
                        width={bar.width}
                        fill={bar.color}
                      />
                    </Fragment>
                  )),
                )
              }
            </BarStack>
          </Group>
        );
      }}
    </GenericChartGrid>
  );
};
