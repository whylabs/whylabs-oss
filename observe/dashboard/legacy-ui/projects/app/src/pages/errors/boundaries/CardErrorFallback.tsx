import { useCommonStyles } from 'hooks/useCommonStyles';
import { WhyLabsButton, WhyLabsText } from 'components/design-system';
import { ExtendedProps } from './types';

const CardErrorFallback: React.FC<ExtendedProps> = ({ error, resetErrorBoundary, showReset = false }) => {
  const { classes: styles } = useCommonStyles();

  console.error(error);
  return (
    <div className={styles.graphContainer}>
      <WhyLabsText inherit className={styles.commonFont} size={14}>
        An error occurred while displaying the data for this feature. WhyLabs has been notified.
      </WhyLabsText>
      {showReset && (
        <WhyLabsButton variant="outline" onClick={resetErrorBoundary}>
          Retry
        </WhyLabsButton>
      )}
    </div>
  );
};

export default CardErrorFallback;
