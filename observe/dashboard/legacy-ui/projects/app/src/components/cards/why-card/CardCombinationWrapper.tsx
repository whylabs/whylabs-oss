import useWhyCardStyles from './useWhyCardStyles';

interface CardCombinationWrapperProps {
  leftChild: React.ReactNode;
  rightChild?: React.ReactNode;
}
export const CardCombinationWrapper: React.FC<CardCombinationWrapperProps> = ({ leftChild, rightChild }) => {
  const { classes: styles } = useWhyCardStyles();

  return (
    <div className={styles.combinationGraphArea}>
      {leftChild}
      {rightChild}
    </div>
  );
};
