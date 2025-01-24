import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsSearchInput, WhyLabsSubmitButton, WhyLabsText } from '~/components/design-system';
import { WhyLabsVerticalDivider } from '~/components/design-system/layout/WhyLabsVerticalDivider';
import { TitleValueWidget } from '~/components/header-widgets/TitleValueWidget';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { useFlags } from '~/hooks/useFlags';
import { useIsEmbedded } from '~/hooks/useIsEmbedded';
import { useMainStackCustomEventsEmitters } from '~/hooks/useMainStackCustomEventsEmitters';
import { useOrgId } from '~/hooks/useOrgId';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { ResourceTaggingDrawer } from '~/routes/:orgId/settings/resource-management/components/ResourceTaggingDrawer';
import { ReactElement } from 'react';

import { getSettingsPageTitle } from '../utils/settingsPageUtils';
import { AddEditResource } from './add-edit/AddEditResource';
import { ResourceManagementContent } from './components/ResourceManagementTable';
import { useResourceManagementIndexViewModel } from './useResourceManagementIndexViewModel';

const HEADER_HEIGHT = 62;
const CONTROLS_HEIGHT = 90;

const useStyles = createStyles({
  root: {
    display: 'grid',
    gridTemplateRows: `${HEADER_HEIGHT}px ${CONTROLS_HEIGHT}px auto`,
    height: '100%',
  },
  headerRoot: {
    alignItems: 'center',
    backgroundColor: Colors.brandSecondary100,
    display: 'flex',
    height: HEADER_HEIGHT,
    justifyContent: 'space-between',
    padding: 15,
  },
  headerText: {
    color: Colors.secondaryLight1000,

    '& a': {
      color: Colors.chartBlue,
      textDecoration: 'none',
    },
  },
  controlsRoot: {
    alignItems: 'center',
    display: 'flex',
    height: CONTROLS_HEIGHT,
    justifyContent: 'space-between',
    padding: 15,
    overflow: 'hidden',
  },
  controlsScrollableContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 19,
    overflow: 'auto',
  },
  addResourceButtonContainer: {
    height: '100%',
    display: 'flex',
    alignItems: 'flex-end',
  },
  filtersFlex: {
    display: 'flex',
    gap: 10,
  },
  tableRoot: {
    display: 'flex',
    overflow: 'auto',
  },
  headerWidgetNumber: {
    color: Colors.linkColor,
    fontSize: 16,
    lineHeight: 1.25,
    margin: 0,
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  headerSmallButton: {
    padding: '5px 17px',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '-0.13px',
  },
  tagsManagement: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    flexShrink: 0,
    height: 36,
  },
  grayBorder: {
    borderColor: Colors.brandSecondary700,
  },
  linkButton: {
    color: `${Colors.linkColor} !important`,
    width: 'fit-content',
    display: 'inline',
    fontSize: 16,
  },
});

export const ResourceManagementIndex = (): ReactElement => {
  useSetHtmlTitle(getSettingsPageTitle('orgIdSettingsResourceManagement'));

  const { classes } = useStyles();
  const flags = useFlags();
  const orgId = useOrgId();
  const { isEmbedded } = useIsEmbedded();
  const viewModel = useResourceManagementIndexViewModel();
  const { urlReplace } = useMainStackCustomEventsEmitters();
  const { filterString, setFilterString, tagsDrawerState, orgTags, renderResourcesFilter } = viewModel;

  return (
    <div className={classes.root}>
      <div className={classes.headerRoot}>
        <WhyLabsText className={classes.headerText}>
          This page manages resources that are displayed on the{' '}
          {isEmbedded ? (
            <InvisibleButton
              className={classes.linkButton}
              onClick={() => urlReplace(window.location.origin.concat(orgId ? `?targetOrgId=${orgId}` : ''))}
            >
              Project Dashboard
            </InvisibleButton>
          ) : (
            <a className={classes.linkButton} href={window.location.origin}>
              Project Dashboard
            </a>
          )}
          .
        </WhyLabsText>
      </div>
      <div className={classes.controlsRoot}>
        <div className={classes.controlsScrollableContainer}>
          <div className={classes.filtersFlex}>
            <WhyLabsSearchInput
              label="Quick search"
              onChange={setFilterString}
              placeholder="Filter by name or ID"
              value={filterString}
              className={classes.grayBorder}
            />
            {renderResourcesFilter({ resourceTags: orgTags.data ?? [], loading: orgTags.loading })}
          </div>
          <WhyLabsVerticalDivider height={40} />
          <TitleValueWidget
            isLoading={viewModel.isLoading}
            loadingSkeletonProps={{ width: 30 }}
            title="Total resources"
          >
            {viewModel.filteredResources.length}
          </TitleValueWidget>
          {flags.resourceTagging && (
            <>
              <WhyLabsVerticalDivider height={40} />
              <TitleValueWidget
                isLoading={viewModel.orgTags.loadingCount}
                loadingSkeletonProps={{ width: 30 }}
                title="Total resource tags"
              >
                <div className={classes.tagsManagement}>
                  <WhyLabsText className={classes.headerWidgetNumber}>{viewModel.orgTags.count}</WhyLabsText>
                  <WhyLabsButton
                    variant="outline"
                    color="gray"
                    size="xs"
                    onClick={() => tagsDrawerState.setter(!tagsDrawerState.value)}
                  >
                    Manage tags
                  </WhyLabsButton>
                </div>
              </TitleValueWidget>
            </>
          )}
        </div>
        <div className={classes.addResourceButtonContainer}>
          <WhyLabsSubmitButton onClick={viewModel.onAddNewResource}>New Resource</WhyLabsSubmitButton>
        </div>
      </div>
      <div className={classes.tableRoot}>
        <ResourceManagementContent
          filteredResources={viewModel.filteredResources}
          hasData={viewModel.hasData}
          isLoading={viewModel.isLoading}
          isModalOpen={viewModel.isModalOpen}
          onCancelDeleting={viewModel.onCancelDeleting}
          onDeleteResource={viewModel.onDeleteResource}
          onEditResource={viewModel.onEditResource}
          selectedIdToDelete={viewModel.selectedIdToDelete}
          setSelectedIdToDelete={viewModel.setSelectedIdToDelete}
          setSort={viewModel.setSort}
          sortBy={viewModel.sortBy}
          sortDirection={viewModel.sortDirection}
          tableRowsCount={viewModel.tableRowsCount}
        />
      </div>
      {flags.resourceTagging && <ResourceTaggingDrawer openState={tagsDrawerState} />}
      <AddEditResource
        isFreeTier={viewModel.isFreeTier}
        isOverSubscriptionLimit={viewModel.isOverSubscriptionLimit}
        refetchResources={viewModel.refetchResources}
      />
    </div>
  );
};
