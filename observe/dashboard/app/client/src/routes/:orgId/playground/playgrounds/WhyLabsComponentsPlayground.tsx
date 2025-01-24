import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsBreadCrumbItem, WhyLabsBreadCrumbs } from '~/components/design-system';
import { JSX } from 'react';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: '100%',
  },
  darkPanel: {
    width: '100%',
    background: Colors.darkHeader,
    minHeight: '45px',
  },
});
const breadCrumbs: WhyLabsBreadCrumbItem[] = [
  { title: 'Charts', href: `${window.location.origin}${window.location.pathname}?display=ChartsPlayground` },
  {
    title: 'ObservationTree',
    href: `${window.location.origin}${window.location.pathname}?display=ObservationTreePlayground`,
  },
  { title: 'WhyLabsComponents', href: '/test/234' },
];
export const WhyLabsComponentsPlayground = (): JSX.Element => {
  const { classes } = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.darkPanel}>
        <WhyLabsBreadCrumbs items={breadCrumbs} />
      </div>
    </div>
  );
};
