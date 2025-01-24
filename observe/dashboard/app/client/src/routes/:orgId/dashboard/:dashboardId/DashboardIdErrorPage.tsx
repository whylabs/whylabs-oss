import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import DogDialogQuestionMark from '~/components/animated-components/whydog/whydog-dialog/DogDialogQuestionMark';
import WhyDogIdle from '~/components/animated-components/whydog/WhyDogIdle';
import { AttentionPageWrap } from '~/components/layout/AttentionPageWrap';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { JSX } from 'react';
import { Link } from 'react-router-dom';

const useStyles = createStyles({
  root: {
    height: '100vh',
  },
  link: {
    color: Colors.linkColor,
  },
});

export const DashboardIdErrorPage = (): JSX.Element => {
  const { classes } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  return (
    <div className={classes.root}>
      <AttentionPageWrap
        title="Dashboard not found!"
        dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
        subtitle="It looks like the dashboard you are trying to access does not exist"
      >
        Navigate back to{' '}
        <Link to={getNavUrl({ page: 'dashboards' })} className={classes.link}>
          dashboards list
        </Link>
      </AttentionPageWrap>
    </div>
  );
};

export const DashboardGraphIdErrorPage = ({ dashboardId }: { dashboardId: string }): JSX.Element => {
  const { classes } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  return (
    <div className={classes.root}>
      <AttentionPageWrap
        title="Graph not found!"
        dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
        subtitle="It looks like the graph you are trying to access does not exist"
      >
        Navigate back to the{' '}
        <Link to={getNavUrl({ page: 'dashboards', dashboards: { dashboardId } })} className={classes.link}>
          dashboard
        </Link>
      </AttentionPageWrap>
    </div>
  );
};
