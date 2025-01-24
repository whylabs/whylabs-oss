import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

const useStyles = createStyles(() => ({
  root: {
    fontSize: '13px',
    fontFamily: 'Asap',
    lineHeight: 0.92,
    backgroundColor: Colors.chartOrange,
    color: 'white',
    padding: 3,
    borderRadius: 2,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    marginLeft: 3,
    fontWeight: 600,
  },
}));

export const BetaBadge = () => {
  const { classes } = useStyles();
  return <div className={classes.root}>Beta</div>;
};
