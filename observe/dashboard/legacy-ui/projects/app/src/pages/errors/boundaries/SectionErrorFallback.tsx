import { WhyLabsButton, WhyLabsText } from 'components/design-system';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { ExtendedProps } from './types';

const SectionErrorFallback: React.FC<ExtendedProps> = ({ error, resetErrorBoundary, showReset = false }) => {
  const { classes: styles } = useCommonStyles();
  console.error(error);
  return (
    <div style={{ padding: '32px' }}>
      <WhyLabsText inherit className={styles.commonFont} size={14}>
        Oh no! A wild error occurred! WhyLabs has been notified.
      </WhyLabsText>
      {showReset && (
        <WhyLabsButton variant="outline" onClick={resetErrorBoundary}>
          Retry
        </WhyLabsButton>
      )}
    </div>
  );
};

export default SectionErrorFallback;
