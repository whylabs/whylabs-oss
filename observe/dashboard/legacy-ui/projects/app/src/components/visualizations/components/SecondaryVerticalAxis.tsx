import { AxisRight } from '@visx/axis';
import { GRAPH_WIDTH } from 'ui/constants';
import { Colors } from '@whylabs/observatory-lib';
import { ScaleLinear } from 'd3-scale';
import { format } from 'd3-format';
import { generateYTicks } from '../vizutils/scaleUtils';

interface SecondaryVerticalAxisProps {
  yScale: ScaleLinear<number, number>;
  label?: string;
  squishText?: boolean;
  right?: number;
  numTicks?: number;
  squishLabel?: boolean;
  squishTicks?: boolean;
  percentage?: boolean;
  horizontalBuffer?: number;
  height?: number;
  width?: number;
  verticalBuffer?: number;
}

const SecondaryVerticalAxis: React.FC<SecondaryVerticalAxisProps> = ({
  yScale,
  label,
  squishText = false,
  right,
  numTicks,
  squishLabel = true,
  percentage = false,
  squishTicks = false,
  // horizontalBuffer,
  // height,
  // width,
  // verticalBuffer,
}) => {
  const domain = yScale.domain();
  const ticks = generateYTicks(domain, numTicks);
  const totalDomain = Math.abs(domain[domain.length - 1] - domain[0]);
  let formattingString = '~s';
  if (percentage) {
    formattingString = '~p';
  } else if (totalDomain < 10) {
    formattingString = '.3';
  }
  const letterSpacing = squishText ? '-0.5px' : '0';
  const useableRight = right === undefined ? GRAPH_WIDTH : right;
  const labelDx = squishLabel ? '-0.5em' : '1.0em';
  const tickLabelDx = squishTicks ? '2.0em' : '0em';
  return (
    <AxisRight
      scale={yScale}
      label={label}
      left={useableRight}
      labelProps={{
        textAnchor: 'middle',
        fontSize: 12,
        fontFamily: 'Asap, sans-serif',
        fontWeight: 600,
        letterSpacing,
        color: Colors.brandSecondary900,
        fill: Colors.brandSecondary900,
        dx: labelDx,
      }}
      numTicks={4}
      stroke={Colors.transparent}
      tickValues={ticks}
      tickStroke={Colors.transparent}
      tickLength={4}
      tickFormat={format(formattingString)}
      tickLabelProps={() => ({
        textAnchor: 'start',
        verticalAnchor: 'middle',
        lineHeight: '1em',
        dx: tickLabelDx,
        dy: '-0.25em',
        fontSize: 10,
        fontFamily: 'Asap, sans-serif',
        color: Colors.brandSecondary900,
        fill: Colors.brandSecondary900,
      })}
    />
  );
};

export default SecondaryVerticalAxis;
