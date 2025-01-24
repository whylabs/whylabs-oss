import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ReactNode } from 'react';

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
  children: ReactNode;
  type: 'label' | 'secondary';
};

export const SelectorRowText = ({ children, type }: SelectorRowTextProps) => {
  const { classes } = useStyles();
  const className = type === 'label' ? classes.label : classes.secondaryText;

  return <WhyLabsText className={className}>{children}</WhyLabsText>;
};
