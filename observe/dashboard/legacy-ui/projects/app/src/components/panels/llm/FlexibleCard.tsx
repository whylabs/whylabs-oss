import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: '10px 0 10px 20px', // top right bottom left
    backgroundColor: Colors.white,
    borderRadius: 4,
  },
  summary: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'start',
    flexGrow: 0,
    padding: '2px 0',
    flexShrink: 0,
    width: '240px',
    height: '260px',
  },
  summaryChild: {
    paddingTop: '10px',
    maxWidth: '240px',
  },
  visualization: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'flex-start',
    gap: 16,
  },
}));

interface FlexibleCardProps {
  summarySection: { key: string; component: React.ReactNode }[];
  visualizationSection: React.ReactNode;
}

export const FlexibleCard: React.FC<FlexibleCardProps> = ({ summarySection, visualizationSection }) => {
  const { classes } = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.summary}>
        {summarySection.map(({ key, component }) => (
          <div key={key} className={classes.summaryChild}>
            {component}
          </div>
        ))}
      </div>
      <div className={classes.visualization}>{visualizationSection}</div>
    </div>
  );
};
