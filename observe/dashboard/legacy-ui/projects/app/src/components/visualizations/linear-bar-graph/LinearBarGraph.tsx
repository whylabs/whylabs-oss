import { createStyles } from '@mantine/core';

type LayoutDimension = 'vertical' | 'horizontal';
export type BarGroup = {
  name: string;
  color: string;
  count: number;
};

interface StylesProps {
  crossDimensionSize: number;
  layoutDimensionSize: number;
  isHorizontal: boolean;
}

const BAR_CROSS_WIDTH = 5;
const useStyles = createStyles((_, { isHorizontal, crossDimensionSize, layoutDimensionSize }: StylesProps) => ({
  container: {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    width: isHorizontal ? layoutDimensionSize : crossDimensionSize,
    height: isHorizontal ? crossDimensionSize : layoutDimensionSize,
  },
  barWrapper: {
    justifyContent: 'center',
    alignSelf: 'center',
  },
  horizontalBars: {
    height: BAR_CROSS_WIDTH,
    maxHeight: BAR_CROSS_WIDTH,
    width: '100%',
  },
  verticalBars: {
    width: BAR_CROSS_WIDTH,
    maxWidth: BAR_CROSS_WIDTH,
    height: '100%',
  },
  blockContainer: {
    flexGrow: 1,
  },
}));

interface LinearBarGraphProps {
  crossDimensionSize: number;
  layoutDimensionSize: number;
  layoutDimension: LayoutDimension;
  barData: BarGroup[];
  name: string;
}

export const LinearBarGraph: React.FC<LinearBarGraphProps> = ({
  crossDimensionSize,
  layoutDimension,
  layoutDimensionSize,
  barData,
  name,
}) => {
  const isHorizontal = layoutDimension === 'horizontal';
  const { classes } = useStyles({ isHorizontal, layoutDimensionSize, crossDimensionSize });
  return (
    <div className={classes.container}>
      {barData.map((bd) => {
        const wrapperStyle = isHorizontal
          ? { flexGrow: bd.count, height: crossDimensionSize }
          : { flexGrow: bd.count, width: crossDimensionSize };
        return (
          <div className={classes.barWrapper} style={wrapperStyle} key={`linear-bar-segment-${bd.color}-${name}`}>
            <div
              className={isHorizontal ? classes.horizontalBars : classes.verticalBars}
              style={{ backgroundColor: bd.color }}
            />
          </div>
        );
      })}
    </div>
  );
};
