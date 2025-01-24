import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsText } from '~/components/design-system';

const useStyles = createStyles({
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    minHeight: 340,
    padding: 15,
    width: '100%',
  },
  emptyText: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
  },
  createGraphButton: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
  },
});

export const EmptySelectionGraphCard = () => {
  const { classes } = useStyles();

  return (
    <div className={classes.card}>
      <WhyLabsText>Make selections to preview the graph</WhyLabsText>
    </div>
  );
};
