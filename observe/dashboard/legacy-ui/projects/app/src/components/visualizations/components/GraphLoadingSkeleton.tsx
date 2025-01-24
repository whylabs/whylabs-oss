import { createStyles, Skeleton } from '@mantine/core';
import { GraphParams } from 'generated/dashboard-schema';
import { arrayOfLength } from 'utils/arrayUtils';

type SupportedGraphType = Exclude<GraphParams['type'], undefined>;
interface GraphLoadingSkeletonProps {
  height?: number;
  graphType: SupportedGraphType;
}

const useGraphLoadingSkeletonStyles = createStyles(() => ({
  root: {
    padding: '5px',
  },
  flex: {
    display: 'flex',
    padding: '5px',
  },
  flexColumn: {
    padding: '5px',
    display: 'flex',
    flexDirection: 'column',
  },
  transitionWidth: {
    '& div': {
      transition: 'width 850ms',
    },
  },
  transitionHeight: {
    '& div': {
      transition: 'height 850ms',
      alignSelf: 'end',
    },
  },
}));

const generateRandomSize = (min = 20, max = 50) => {
  return Math.random() * (max - min) + min;
};

export const GraphLoadingSkeleton = ({ graphType, height }: GraphLoadingSkeletonProps): JSX.Element => {
  const { classes, cx } = useGraphLoadingSkeletonStyles();

  const drawnLineSkeleton = () => {
    const firstLineWidth = generateRandomSize();
    const secondLineWidth = generateRandomSize();
    const thirdLineWidth = 100 - firstLineWidth - secondLineWidth;
    return (
      <div className={cx(classes.flex, classes.transitionWidth)}>
        <Skeleton height={height ?? 8} width={`${firstLineWidth}%`} radius={0} />
        <Skeleton height={height ?? 8} width={`${secondLineWidth}%`} ml={2} radius={0} />
        <Skeleton height={height ?? 8} width={`${thirdLineWidth}%`} ml={2} radius={0} />
      </div>
    );
  };

  const drawnColumnSkeleton = () => {
    const usedHeight = (height ?? 100) - 10;
    return (
      <div className={cx(classes.flex, classes.transitionHeight)}>
        {arrayOfLength(10).map((index) => {
          const columnHeight = generateRandomSize(30, usedHeight);
          return (
            <Skeleton
              key={`skeletonColumn--${index}`}
              width="calc(10% - 20px)"
              ml={20}
              height={columnHeight}
              radius={0}
            />
          );
        })}
      </div>
    );
  };

  const drawnGenericSkeleton = () => {
    const usedHeight = (height ?? 100) - 10;
    const rowCount = Math.floor(usedHeight / 25);
    return (
      <div className={classes.flexColumn}>
        {arrayOfLength(rowCount).map((index) => {
          const rowHeight = usedHeight / rowCount;
          return <Skeleton key={`skeletonRow-${index}`} width="100%" mt={5} height={rowHeight - 5} radius={0} />;
        })}
      </div>
    );
  };

  const drawnMapper = new Map<SupportedGraphType, () => JSX.Element>([
    ['lineChart', drawnLineSkeleton],
    ['stackedBarTimeSeries', drawnColumnSkeleton],
  ]);

  const graphDrawer = drawnMapper.get(graphType) ?? drawnGenericSkeleton;

  return graphDrawer();
};
