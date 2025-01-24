import { FC } from 'react';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import WhyLabsText from './WhyLabsText';

const useStyles = createStyles({
  label: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
    fontSize: 14,
    lineHeight: 1.4,
    fontWeight: 500,
  },
  secondaryText: {
    color: Colors.secondaryLight700,
    fontFamily: 'Asap',
    fontSize: 12,
    lineHeight: 1.55,
    fontWeight: 400,
  },
});

type SelectorRowTextProps = {
  type: 'label' | 'secondary';
};

export const SelectorRowText: FC<SelectorRowTextProps> = ({ children, type }) => {
  const { classes } = useStyles();
  const className = type === 'label' ? classes.label : classes.secondaryText;

  return <WhyLabsText className={className}>{children}</WhyLabsText>;
};
