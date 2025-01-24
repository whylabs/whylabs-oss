import { AxisLeft } from '@visx/axis';
import { GRAPH_HORIZONTAL_BUFFER } from 'ui/constants';
import { Colors } from '@whylabs/observatory-lib';
import { ScaleLinear } from 'd3-scale';
import { format } from 'd3-format';
import { generateYTicks } from '../vizutils/scaleUtils';

interface StandardVerticalAxisProps {
  yScale: ScaleLinear<number, number>;
  label?: string;
  squishText?: boolean;
  left?: number;
  numTicks?: number;
  squishLabel?: boolean;
  squishTicks?: boolean;
  miniature?: boolean;
  percentage?: boolean;
}

const StandardVerticalAxis: React.FC<StandardVerticalAxisProps> = ({
  yScale,
  label,
  squishText = false,
  left,
  numTicks,
  squishLabel = false,
  percentage = false,
  squishTicks = false,
  miniature = false,
}) => {
  const domain = yScale.domain();
  const ticks = generateYTicks(domain, numTicks);
  const totalDomain = Math.abs(domain[domain.length - 1] - domain[0]);
  let formattingString = miniature ? '.2s' : '~s';
  if (percentage) {
    formattingString = '~p';
  } else if (totalDomain < 10 && totalDomain > 1e-3) {
    formattingString = '.3';
  } else if (totalDomain <= 1e-3) {
    formattingString = '~e';
  }
  const letterSpacing = squishText ? '-0.5px' : '0';
  const useableLeft = left === undefined ? GRAPH_HORIZONTAL_BUFFER : left;
  const labelDx = squishLabel ? '1.0em' : '-0.5em';
  const tickLabelDx = squishTicks ? '1.0em' : '-0.25em';
  return (
    <AxisLeft
      scale={yScale}
      label={label}
      left={useableLeft}
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
        textAnchor: 'end',
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

export default StandardVerticalAxis;
