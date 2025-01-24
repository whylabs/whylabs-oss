import { Skeleton } from '@mantine/core';
import { useFeatureWidgetStyles } from 'hooks/useFeatureWidgetStyles';

type SkeletonFeatureWidgetProps = {
  index: number;
};

const SkeletonFeatureWidget: React.FC<SkeletonFeatureWidgetProps> = ({ index }) => {
  const { classes: styles, cx } = useFeatureWidgetStyles();

  return (
    <div className={cx(styles.root, index === 0 ? styles.firstWidget : '')}>
      <Skeleton variant="text" width={index === 0 ? 128 : 64} height={14} animate />
      <Skeleton variant="text" width={index === 0 ? 128 : 64} height={24} animate />
    </div>
  );
};

export default SkeletonFeatureWidget;
