import { AxisLeft } from '@visx/axis';
import { Colors } from '@whylabs/observatory-lib';
import { ScaleLinear } from 'd3-scale';
import { format } from 'd3-format';
import { generateYTicks } from '../vizutils/scaleUtils';

interface BatchLeftAxisProps {
  yScale: ScaleLinear<number, number>;
  left: number;
  numTicks?: number;
  percentage?: boolean;
}

export const BatchLeftAxis: React.FC<BatchLeftAxisProps> = ({ yScale, left, numTicks = 4, percentage = false }) => {
  const domain = yScale.domain();
  const ticks = generateYTicks(domain, numTicks);
  const totalDomain = Math.abs(domain[domain.length - 1] - domain[0]);
  let formattingString = '.2s';
  if (percentage) {
    formattingString = '~p';
  } else if (totalDomain < 10 && totalDomain > 1e-3) {
    formattingString = '.3';
  } else if (totalDomain <= 1e-3) {
    formattingString = '~e';
  }
  return (
    <AxisLeft
      scale={yScale}
      left={left}
      numTicks={4}
      stroke={Colors.transparent}
      tickValues={ticks}
      tickStroke={Colors.transparent}
      tickLength={4}
      tickFormat={format(formattingString)}
      tickLabelProps={() => ({
        textAnchor: 'end',
        verticalAnchor: 'middle',
        lineHeight: '1em',
        dx: '-0.25em',
        dy: '-0.25em',
        fontSize: 10,
        fontFamily: 'Asap, sans-serif',
        color: Colors.brandSecondary900,
        fill: Colors.brandSecondary900,
      })}
    />
  );
};
