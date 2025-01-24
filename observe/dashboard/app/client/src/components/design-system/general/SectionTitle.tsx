import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

const useStyles = createStyles(() => ({
  root: {
    alignItems: 'center',
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'auto 1fr',
    marginBottom: 15,

    '& > h2': {
      color: Colors.secondaryLight1000,
      fontSize: 16,
      fontWeight: 400,
      margin: 0,
      lineHeight: '16px',
    },
    '& > span': {
      background: '#D9D9D9',
      height: 1,
      width: '100%',
    },
  },
}));

type SectionTitleProps = {
  className?: string;
  title: string;
};

export const SectionTitle = ({ className, title }: SectionTitleProps) => {
  const { classes } = useStyles();

  return (
    <div className={classes.root}>
      <h2 className={className}>{title}</h2>
      <span />
    </div>
  );
};
