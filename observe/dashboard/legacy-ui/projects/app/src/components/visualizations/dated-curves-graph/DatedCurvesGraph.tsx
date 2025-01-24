import AnomalyTooltip, { AnomalyTooltipProps } from 'components/controls/table/AnomalyTooltip';
import { Group } from '@visx/group';
import { LinePath, Line } from '@visx/shape';
import { Fragment } from 'react';
import * as allCurves from '@visx/curve';
import { GraphParams } from 'generated/dashboard-schema';
import { Colors } from '@whylabs/observatory-lib';
import { CommonGraphProps, findMaxCount, getDate } from '../utils';
import { GenericChartGrid } from '../generic-chart-grid/GenericChartGrid';
import { DatedCurves, translateDatedCurvesTooltipData } from './utils';
import { GRAPH_TOP_OFFSET } from '../generic-chart-grid/utils';

interface DatedCurvesGraphProps extends CommonGraphProps<DatedCurves> {
  graphParams?: GraphParams;
}

export const DatedCurvesGraph: React.FC<DatedCurvesGraphProps> = ({
  data,
  width,
  height,
  name,
  margin,
  graphParams,
}) => {
  const maxYValue = findMaxCount(data);
  const showPoints = graphParams?.showDots ?? true;
  const curvesType = graphParams?.curvesType ?? 'curveStep';

  return (
    <GenericChartGrid<DatedCurves, AnomalyTooltipProps>
      width={width}
      height={height}
      margin={margin}
      data={data}
      emptyProfileShape={{
        timestamp: 0,
        value: 0,
        color: data[0]?.color ?? Colors.purple,
        label: data[0]?.label ?? '',
      }}
      maxYValue={maxYValue}
      getDate={getDate}
      translateTooltipData={translateDatedCurvesTooltipData}
      tooltipComponent={({ items, timestamp }) => <AnomalyTooltip items={items} timestamp={timestamp} />}
      xScalePadding={1}
    >
      {({ marginTop, graphData, countScale, dateScale, gridRowsHeight, plottedProfiles, hoveredProfile }) => {
        const hovered = plottedProfiles.find((ts) => ts.getTime() === hoveredProfile);

        if (!graphData || graphData.length === 0) {
          return <div />;
        }
        return (
          <Group style={{ padding: '0 20px' }} key={`curves-chart-${name}`} top={marginTop}>
            <LinePath<DatedCurves>
              curve={allCurves[curvesType]}
              data={graphData}
              x={(ts) => dateScale(getDate(ts)) ?? 0}
              y={(ts) => countScale(ts.value ?? 0)}
              stroke={graphData[0].color}
              strokeWidth={2}
            />
            {hovered && (
              <Line
                key={`hover-line--${name}-${hovered}`}
                from={{ x: dateScale(hovered), y: gridRowsHeight }}
                to={{ x: dateScale(hovered), y: GRAPH_TOP_OFFSET }}
                strokeWidth={1}
                stroke={Colors.chartPrimary}
              />
            )}
            {graphData.map((ts) => (
              <Fragment key={`dot--${name}--${ts.timestamp}`}>
                {showPoints && (
                  <circle r={3} cx={dateScale(getDate(ts))} cy={countScale(ts.value ?? 0)} fill={ts.color} />
                )}
              </Fragment>
            ))}
          </Group>
        );
      }}
    </GenericChartGrid>
  );
};
