import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { timeLong } from 'utils/dateUtils';
import { WhyLabsText } from 'components/design-system';

const useStyles = createStyles({
  stackContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.5,
    color: Colors.brandSecondary900,
    marginBottom: 6,
  },
  light: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.667,
    color: Colors.brandSecondary700,
    marginBottom: 8,
  },
  heroText: {
    fontSize: 36,
    fontWeight: 400,
    lineHeight: 1,
    color: Colors.chartPrimary,
    marginBottom: 0,
  },
  dateText: {},
});

export interface MetadataStackProps {
  title: string;
  timestamp?: number;
  heroText?: string;
  width: number;
  minWidth: number;
  children?: React.ReactNode;
}

const MetadataStack: React.FC<MetadataStackProps> = ({ title, timestamp, heroText, children, width, minWidth }) => {
  const { classes: styles } = useStyles();

  return (
    <div className={styles.stackContainer} style={{ width, minWidth }}>
      <WhyLabsText inherit className={styles.title}>
        {title}
      </WhyLabsText>
      {heroText && (
        <WhyLabsText inherit className={styles.heroText}>
          {heroText}
        </WhyLabsText>
      )}
      {timestamp && (
        <WhyLabsText inherit className={styles.light}>
          {timeLong(timestamp)}
        </WhyLabsText>
      )}
      {children}
    </div>
  );
};

export default MetadataStack;
