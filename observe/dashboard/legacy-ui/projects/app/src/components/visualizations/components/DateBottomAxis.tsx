import { utcFormat } from 'd3-time-format';

import { ScaleTime } from 'd3-scale';
import { AxisBottom } from '@visx/axis';
import { GRAPH_HEIGHT } from 'ui/constants';
import { Colors } from '@whylabs/observatory-lib';
import { TimePeriod } from 'generated/graphql';
import { generateMonthlyTicks, generateXTicks } from 'components/visualizations/vizutils/scaleUtils';

interface DateBottomAxisProps {
  xScale: ScaleTime<number, number>;
  ticksInMillis?: number[];
  horizontalBuffer?: number;
  height?: number;
  batchFrequency?: TimePeriod;
  width: number;
  avoidLastTick?: boolean;
}

const DateBottomAxis: React.FC<DateBottomAxisProps> = ({
  xScale,
  ticksInMillis,
  height = GRAPH_HEIGHT,
  batchFrequency = TimePeriod.P1D,
  width,
  avoidLastTick = false,
}) => {
  const skipCount = batchFrequency === TimePeriod.Pt1H ? 1 : 0;
  const filteredTicksInMillis =
    batchFrequency === TimePeriod.P1M
      ? generateMonthlyTicks(xScale, ticksInMillis)
      : generateXTicks(xScale, ticksInMillis, width, batchFrequency, skipCount, undefined, avoidLastTick);
  const formattingString = batchFrequency === TimePeriod.Pt1H ? '%m-%d %-I:%M %p' : '%m-%d';

  return (
    <AxisBottom
      scale={xScale}
      left={0}
      top={height}
      stroke={Colors.transparent}
      strokeWidth={1}
      tickStroke={Colors.transparent}
      tickFormat={(d) => utcFormat(formattingString)(d as Date)}
      tickValues={filteredTicksInMillis?.map((tick) => new Date(tick)) ?? undefined}
      tickLabelProps={() => ({
        textAnchor: 'middle',
        fontSize: 10,
        fontFamily: 'Asap, sans-serif',
        fill: Colors.brandSecondary900,
      })}
    />
  );
};

export default DateBottomAxis;
