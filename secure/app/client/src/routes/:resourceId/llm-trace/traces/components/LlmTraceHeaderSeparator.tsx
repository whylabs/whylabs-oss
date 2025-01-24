import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

const useStyles = createStyles(() => ({
  separator: {
    borderRight: `0 solid ${Colors.darkHeader}`,
    borderRightWidth: 1,
    margin: '0 15px',
    opacity: 0.5,
  },
}));

export const LlmTraceHeaderSeparator = () => {
  const { classes } = useStyles();
  return <div className={classes.separator} />;
};
