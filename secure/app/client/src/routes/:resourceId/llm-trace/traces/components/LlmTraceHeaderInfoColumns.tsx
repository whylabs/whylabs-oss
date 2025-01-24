import { createStyles } from '@mantine/core';
import { ReactNode } from 'react';
import { Colors } from '~/assets/Colors';

const useStyles = createStyles(() => ({
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,

    '& > p': {
      margin: 0,
      textWrap: 'nowrap',
    },
  },
  title: {
    color: Colors.secondaryLight800,
    fontSize: 12,
    fontWeight: 600,
    margin: 0,
    textWrap: 'nowrap',
  },
  value: {
    fontFamily: 'Inconsolata',
    fontSize: 14,
    margin: 0,
    textWrap: 'nowrap',
  },
}));

type LlmTraceHeaderInfoColumnsProps = {
  classNames?: {
    title?: string;
    value?: string;
  };
  title: string;
  value: ReactNode;
};

export const LlmTraceHeaderInfoColumns = ({ classNames, title, value }: LlmTraceHeaderInfoColumnsProps) => {
  const { classes, cx } = useStyles();

  return (
    <div className={classes.column}>
      <p className={cx(classes.title, classNames?.title)}>{title}</p>
      <p className={cx(classes.value, classNames?.value)}>{value}</p>
    </div>
  );
};
