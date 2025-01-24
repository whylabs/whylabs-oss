import { createStyles } from '@mantine/core';
import { WhyLabsTypography } from 'components/design-system';
import { Colors } from '@whylabs/observatory-lib';

const useDashCardHeroStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  value: {
    paddingBottom: '5px',
    fontSize: '36px',
    fontWeight: 400,
    color: Colors.chartPrimary,
    lineHeight: 1,
  },
}));

interface DashCardHeroProps {
  heroTitle: string;
  heroValue: string | number;
}
export const DashCardHero: React.FC<DashCardHeroProps> = ({ heroValue, heroTitle, children }) => {
  const { classes } = useDashCardHeroStyles();
  return (
    <div className={classes.root}>
      <WhyLabsTypography className={classes.title}>{heroTitle}</WhyLabsTypography>
      <WhyLabsTypography className={classes.value}>{heroValue}</WhyLabsTypography>
      {children}
    </div>
  );
};
