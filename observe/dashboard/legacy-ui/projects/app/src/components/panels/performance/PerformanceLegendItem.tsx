import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';

const useStyles = createStyles({
  container: {
    display: 'flex',
  },
  label: {
    fontSize: 12,
    lineHeight: 1.667,
    fontWeight: 400,
    maxHeight: '1.4em',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  line: {
    height: 1,
    width: 10,
    alignSelf: 'center',
    marginRight: 10,
  },
  longGraphContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 0,
    marginBottom: 0,
  },
});

interface PerformnceLegendItemProps {
  color: string;
  label: string;
  datasetName?: string;
}

const PerformanceLegendItem: React.FC<PerformnceLegendItemProps> = ({ color, label, datasetName }) => {
  const { classes: styles } = useStyles();
  return (
    <div className={styles.container}>
      <div className={styles.line} style={{ backgroundColor: color }} />
      <WhyLabsText inherit className={styles.label}>
        {datasetName?.length && `${datasetName} | `}
        {label}
      </WhyLabsText>
    </div>
  );
};

export default PerformanceLegendItem;
