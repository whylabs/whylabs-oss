import { createStyles } from '@mantine/core';
import { ExecutiveDashboardPanel } from './ExecutiveDashboardPanel';
import { ResourcesTableView } from '../../resources-table-view/ResourcesTableView';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: '1460px',
    height: '100%',
  },
}));

export const ExecutiveDashboard = (): JSX.Element => {
  const { classes } = useStyles();

  return (
    <div className={classes.root}>
      <ExecutiveDashboardPanel />
      <ResourcesTableView />
    </div>
  );
};
