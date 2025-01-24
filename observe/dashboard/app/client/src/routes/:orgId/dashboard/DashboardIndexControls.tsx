import { createStyles } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { WhyLabsTextInput } from '~/components/design-system';
import { WhyLabsVerticalDivider } from '~/components/design-system/layout/WhyLabsVerticalDivider';
import { TitleValueWidget, useTitleValueWidgetStyles } from '~/components/header-widgets/TitleValueWidget';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { Link } from 'react-router-dom';

import { useDashboardIndexViewModel } from './useDashboardIndexViewModel';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: 15,
    height: '100%',
  },
  filterInput: {
    marginTop: 1,
    width: 260,
  },
}));

export const DashboardIndexControls = (): JSX.Element => {
  const { classes } = useStyles();
  const { classes: titleValueWidgetClasses } = useTitleValueWidgetStyles();
  const viewModel = useDashboardIndexViewModel();
  const { dashboards, lastVisited } = viewModel;
  const { getNavUrl } = useNavLinkHandler();

  return (
    <div className={classes.root}>
      <WhyLabsTextInput
        className={classes.filterInput}
        icon={<IconSearch color={Colors.brandSecondary700} size={16} />}
        label="Filter dashboards:"
        onChange={viewModel.setSearchText}
        placeholder="Filter by name or id"
        value={viewModel.searchText}
      />
      {renderDivider()}
      <TitleValueWidget isLoading={dashboards.isLoading} loadingSkeletonProps={{ width: 30 }} title="Total dashboards">
        {dashboards.list.length}
      </TitleValueWidget>
      {lastVisited && (
        <>
          {renderDivider()}
          <TitleValueWidget title="Last visited dashboard">
            <Link
              className={titleValueWidgetClasses.value}
              to={getNavUrl({ page: 'dashboards', dashboards: { dashboardId: lastVisited.id } })}
            >
              {lastVisited.name}
            </Link>
          </TitleValueWidget>
        </>
      )}
    </div>
  );

  function renderDivider() {
    return <WhyLabsVerticalDivider />;
  }
};
