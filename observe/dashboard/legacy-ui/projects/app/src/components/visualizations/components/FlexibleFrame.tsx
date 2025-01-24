import { GridColumns, GridRows } from '@visx/grid';
import { makeStyles, createStyles } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';

import { ScaleLinear, ScaleTime } from 'd3-scale';
import { GRAPH_HORIZONTAL_BUFFER, GRAPH_HEIGHT, GRAPH_WIDTH, GRAPH_VERTICAL_BUFFER } from 'ui/constants';
import { TimePeriod } from 'generated/graphql';
import { generateMonthlyTicks, generateXTicks, generateYTicks } from 'components/visualizations/vizutils/scaleUtils';

const useStyles = makeStyles(() =>
  createStyles({
    noMice: {
      pointerEvents: 'none',
    },
    debug: {
      fill: '#ff000055',
      backgroundColor: '#00ff0088',
    },
  }),
);

interface GraphFrameProps {
  yScale: ScaleLinear<number, number>;
  timeScale?: ScaleTime<number, number>;
  ticksInMillis?: number[];
  horizontalBuffer?: number;
  endHorizontalBuffer?: number;
  height?: number;
  width?: number;
  verticalBuffer?: number;
  batchFrequency?: TimePeriod;
  maxVerticalTicks?: number;
}

const FlexibleFrame: React.FC<GraphFrameProps> = ({
  yScale,
  timeScale,
  ticksInMillis,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  horizontalBuffer = GRAPH_HORIZONTAL_BUFFER,
  endHorizontalBuffer = GRAPH_HORIZONTAL_BUFFER,
  verticalBuffer = GRAPH_VERTICAL_BUFFER,
  batchFrequency = TimePeriod.P1D,
  maxVerticalTicks,
}) => {
  const ticks = generateYTicks(yScale.domain(), maxVerticalTicks);
  const styles = useStyles();
  let xTicks = null;

  if (timeScale) {
    xTicks =
      batchFrequency === TimePeriod.P1M
        ? generateMonthlyTicks(timeScale, ticksInMillis) ?? []
        : generateXTicks(timeScale, ticksInMillis, width, batchFrequency);
  }

  const bufferedHeight = height - 2 * verticalBuffer;
  const bufferedWidth = width - horizontalBuffer - endHorizontalBuffer;
  return (
    <>
      <rect
        x={horizontalBuffer}
        y={verticalBuffer}
        width={bufferedWidth}
        height={bufferedHeight}
        stroke={Colors.brandSecondary200}
        fill={Colors.transparent}
        rx={2}
        className={styles.noMice}
      />
      <GridRows
        scale={yScale}
        left={horizontalBuffer}
        width={bufferedWidth}
        tickValues={ticks}
        stroke={Colors.brandSecondary200}
        className={styles.debug}
      />
      {xTicks && (
        <GridColumns
          scale={timeScale as ScaleTime<number, number>}
          height={bufferedHeight}
          top={verticalBuffer}
          tickValues={xTicks}
          stroke={Colors.brandSecondary200}
          className={styles.noMice}
        />
      )}
    </>
  );
};

export default FlexibleFrame;
