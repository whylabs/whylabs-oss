import { GridColumns, GridRows } from '@visx/grid';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

import { ScaleBand, ScaleLinear } from 'd3-scale';
import { GRAPH_HORIZONTAL_BUFFER, GRAPH_HEIGHT, GRAPH_WIDTH, GRAPH_VERTICAL_BUFFER } from 'ui/constants';
import { generateYTicks } from 'components/visualizations/vizutils/scaleUtils';

const useStyles = createStyles({
  noMice: {
    pointerEvents: 'none',
  },
  debug: {
    fill: '#ff000055',
    backgroundColor: '#00ff0088',
  },
});

interface GraphFrameProps {
  yScale: ScaleLinear<number, number>;
  xScale: ScaleBand<number>;
  horizontalBuffer?: number;
  endHorizontalBuffer?: number;
  height?: number;
  width?: number;
  verticalBuffer?: number;
  maxVerticalTicks?: number;
}

const FlexibleOrdinalFrame: React.FC<GraphFrameProps> = ({
  yScale,
  xScale,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  horizontalBuffer = GRAPH_HORIZONTAL_BUFFER,
  endHorizontalBuffer = GRAPH_HORIZONTAL_BUFFER,
  verticalBuffer = GRAPH_VERTICAL_BUFFER,
  maxVerticalTicks,
}) => {
  const ticks = generateYTicks(yScale.domain(), maxVerticalTicks);
  const { classes: styles } = useStyles();

  const totalBuffer = horizontalBuffer + endHorizontalBuffer;
  return (
    <>
      <rect
        x={horizontalBuffer}
        y={verticalBuffer}
        width={width - totalBuffer}
        height={height - 2 * verticalBuffer}
        stroke={Colors.brandSecondary200}
        fill={Colors.transparent}
        rx={2}
        className={styles.noMice}
      />
      <GridRows
        scale={yScale}
        left={horizontalBuffer}
        width={width - totalBuffer}
        tickValues={ticks}
        stroke={Colors.brandSecondary200}
        className={styles.debug}
      />
      <GridColumns
        scale={xScale}
        height={height - 2 * verticalBuffer}
        top={verticalBuffer}
        stroke={Colors.brandSecondary200}
        className={styles.noMice}
      />
    </>
  );
};

export default FlexibleOrdinalFrame;
