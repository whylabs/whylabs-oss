import { utcFormat } from 'd3-time-format';
import { ScaleBand } from 'd3-scale';
import { AxisBottom } from '@visx/axis';
import { GRAPH_HEIGHT } from 'ui/constants';
import { Colors } from '@whylabs/observatory-lib';
import { TimePeriod } from 'generated/graphql';

interface DateBottomAxisProps {
  xScale: ScaleBand<number>;
  horizontalBuffer?: number;
  height?: number;
  batchFrequency?: TimePeriod;
  width: number;
}

const MAX_X_TICKS = 16;

const DateBottomOrdinalAxis: React.FC<DateBottomAxisProps> = ({
  xScale,
  height = GRAPH_HEIGHT,
  batchFrequency = TimePeriod.P1D,
  width,
}) => {
  const formattingString = batchFrequency === TimePeriod.Pt1H ? '%m-%d %-I:%M %p' : '%m-%d';
  const approximateTickWidth = batchFrequency === TimePeriod.Pt1H ? 80 : 40;
  const tickCount = Math.min(Math.floor(width / approximateTickWidth), MAX_X_TICKS) - 2;
  return (
    <AxisBottom
      scale={xScale}
      left={0}
      top={height}
      stroke={Colors.transparent}
      strokeWidth={1}
      tickStroke={Colors.transparent}
      numTicks={tickCount > 2 ? tickCount : undefined}
      tickFormat={(d) => utcFormat(formattingString)(new Date(d))}
      tickLabelProps={() => ({
        textAnchor: 'middle',
        fontSize: 10,
        fontFamily: 'Asap, sans-serif',
        fill: Colors.brandSecondary900,
      })}
    />
  );
};

export default DateBottomOrdinalAxis;
