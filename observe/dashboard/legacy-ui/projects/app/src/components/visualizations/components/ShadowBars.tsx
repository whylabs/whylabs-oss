import { ScaleTime } from 'd3-scale';
import { Bar, Line } from '@visx/shape';
import { Fragment } from 'react';

import { Colors } from '@whylabs/observatory-lib';
import { GRAPH_HEIGHT, GRAPH_VERTICAL_BUFFER, GRAPH_WIDTH } from 'ui/constants';
import { HoverState } from 'hooks/useHover';
import { Group } from '@visx/group';
import { useRecoilState } from 'recoil';
import { hoverAtom } from 'atoms/hoverAtom';

interface DatedData {
  dateInMillis: number;
}

interface ShadowBarsProps {
  name: string;
  data: DatedData[];
  alerts: number[];
  xScale: ScaleTime<number, number>;
  hoverState: HoverState;
  showBars?: boolean;
  debug?: boolean;
  ignoreSides?: boolean;
  graphHeight?: number;
  graphVerticalBuffer?: number;
  graphWidth?: number;
  bottomBuffer?: boolean;
  featureName?: string;
}

const ShadowBars: React.FC<ShadowBarsProps> = ({
  name,
  data,
  xScale,
  hoverState,
  debug = false,
  showBars = false,
  ignoreSides = false,
  graphHeight = GRAPH_HEIGHT,
  graphVerticalBuffer = GRAPH_VERTICAL_BUFFER,
  graphWidth = GRAPH_WIDTH,
  bottomBuffer = false,
}) => {
  const [hoverTimestamp] = useRecoilState(hoverAtom);

  // TODO: proper no data component
  if (data.length < 1) return <div>No data to display</div>;

  const getOverlayBarWidth = (datum: DatedData, index: number): number => {
    if (data.length === 1) {
      return graphWidth / 2;
    }
    if (index === 0) {
      return xScale(data[index + 1].dateInMillis) - xScale(datum.dateInMillis);
    }
    return xScale(datum.dateInMillis) - xScale(data[index - 1].dateInMillis);
  };

  return (
    <Group>
      {data.map((datum, index) => {
        let xPosition = xScale(datum.dateInMillis);
        let overlayBarwidth = getOverlayBarWidth(datum, index);
        const offset = overlayBarwidth / 2;
        if (!ignoreSides && (index === data.length - 1 || index === 0)) {
          overlayBarwidth /= 2;
        }
        if (!ignoreSides && index === 0) {
          xPosition += overlayBarwidth;
        }

        const overlayKey = `overlay-bar-${name}-${datum.dateInMillis}`;

        /* eslint-disable no-nested-ternary */
        const fillColor =
          showBars &&
          (hoverState[overlayKey] ||
            (hoverTimestamp.active === true && hoverTimestamp.timestamp === datum.dateInMillis))
            ? Colors.brandSecondary600
            : debug
            ? '#2200ff55'
            : Colors.transparent;

        const barScale = bottomBuffer ? 2 : 1;
        return (
          <Fragment key={overlayKey}>
            <Bar
              x={xPosition - offset}
              y={graphVerticalBuffer}
              fill={fillColor}
              fillOpacity={0.5}
              stroke={debug ? '#0000ff77' : Colors.transparent}
              height={graphHeight - barScale * graphVerticalBuffer}
              width={overlayBarwidth}
            />
          </Fragment>
        );
      })}
      {debug && (
        <Line
          from={{ x: 0, y: 0 }}
          to={{ x: graphWidth, y: graphHeight }}
          strokeWidth={2}
          stroke={Colors.violet}
          strokeDasharray="5,2"
          pointerEvents="none"
        />
      )}
    </Group>
  );
};

export default ShadowBars;
