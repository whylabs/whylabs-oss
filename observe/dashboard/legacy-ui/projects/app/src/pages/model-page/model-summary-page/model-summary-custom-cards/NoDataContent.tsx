import summaryCardNoData from 'ui/summaryCardNoData.svg';
import { WhyLabsText } from 'components/design-system';
import { useSummaryCardStyles } from '../useModelSummaryCSS';

interface NoDataContentProps {
  displayText: string;
  height?: number;
  children?: React.ReactNode;
}

const NoDataContent: React.FC<NoDataContentProps> = ({ displayText, height = 110, children }) => {
  const { classes: styles } = useSummaryCardStyles();
  const renderNoDataContent = () => {
    if (children) {
      return (
        <div
          className={styles.cardImageContainer}
          style={{ height: `${height}px`, backgroundImage: `url(${summaryCardNoData})`, backgroundSize: '100%' }}
        >
          {children}
        </div>
      );
    }
    return (
      <div
        className={styles.cardImageContainer}
        style={{ height: `${height}px`, backgroundImage: `url(${summaryCardNoData})`, backgroundSize: '100%' }}
      >
        <WhyLabsText inherit className={styles.cardNoDataText}>
          {displayText}
        </WhyLabsText>
      </div>
    );
  };
  return (
    <>
      <hr className={styles.cardDivider} />
      {renderNoDataContent()}
    </>
  );
};

export default NoDataContent;
