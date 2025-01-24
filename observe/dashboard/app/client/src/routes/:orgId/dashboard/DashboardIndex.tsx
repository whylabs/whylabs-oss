import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsSubmitButton } from '~/components/design-system';
import { WhyLabsInternalGradientLinkButton } from '~/components/design-system/button/WhyLabsInternalGradientLinkButton';
import { SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { forceRedirectToOrigin } from '~/utils/oldStackUtils';
import { JSX } from 'react';

import { DashboardIndexControls } from './DashboardIndexControls';
import { DashboardIndexTable } from './DashboardIndexTable';
import { useDashboardIndexViewModel } from './useDashboardIndexViewModel';

const useStyles = createStyles(() => ({
  root: {
    background: Colors.white,
    display: 'flex',
    flexDirection: 'column',
    // overflow: 'auto',
    // minHeight: '100%',
  },
  header: {
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '12px 15px 15px 15px',
  },
  newDashboardButton: {
    fontSize: 14,
    fontWeight: 600,
    padding: '8px 17px',
  },
}));

export const DashboardIndex = (): JSX.Element => {
  const viewModel = useDashboardIndexViewModel();
  const { classes } = useStyles();
  const isViewer = viewModel.membershipRole?.isViewer !== false && viewModel.isDemoOrg === false;
  const { getNavUrl } = useNavLinkHandler();
  const pageContent = (
    <div className={classes.root}>
      <div className={classes.header}>
        <DashboardIndexControls />
        {viewModel.isEmbedded || isViewer ? (
          <WhyLabsSubmitButton
            className={classes.newDashboardButton}
            onClick={() => {
              if (isViewer) return;
              viewModel.emitDashboardCreateEventToOldStack();
            }}
            disabled={isViewer}
            loading={!viewModel.membershipRole || viewModel.isDemoOrg === null}
            disabledTooltip={
              viewModel.membershipRole?.isViewer ? 'Dashboard cannot be created by a viewer' : 'Loading...'
            }
          >
            New dashboard
          </WhyLabsSubmitButton>
        ) : (
          <WhyLabsInternalGradientLinkButton
            to={getNavUrl({ page: 'dashboards', dashboards: { dashboardId: AppRoutePaths.create } })}
          >
            New dashboard
          </WhyLabsInternalGradientLinkButton>
        )}
      </div>
      <DashboardIndexTable />
    </div>
  );

  if (viewModel.isEmbedded) return pageContent;

  return (
    <SinglePageLayout
      headerFields={[
        {
          data: viewModel.organizationsList,
          label: 'Organization',
          onChange: viewModel.onChangeOrganization,
          value: viewModel.orgId,
          type: 'select',
        },
      ]}
      onClosePage={forceRedirectToOrigin}
      pageTitle="Custom Dashboards"
    >
      {pageContent}
    </SinglePageLayout>
  );
};
