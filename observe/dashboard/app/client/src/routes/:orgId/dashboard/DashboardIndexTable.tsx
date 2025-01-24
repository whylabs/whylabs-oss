import { CopyButton, createStyles, getStylesRef } from '@mantine/core';
import { IconClipboardCheck, IconClipboardCopy, IconCopy, IconTrash } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import {
  WhyLabsActionIcon,
  WhyLabsConfirmationDialog,
  WhyLabsTableKit,
  WhyLabsText,
  WhyLabsTextHighlight,
} from '~/components/design-system';
import { WhyLabsTableColumnProps } from '~/components/design-system/responsive-table/tableUtils';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { SINGLE_HEADER_TOP_CONTAINER_HEIGHT } from '~/constants/styleConstants';
import { useFlags } from '~/hooks/useFlags';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { DashboardDateRangeBadge } from '~/routes/:orgId/dashboard/components/custom-dashboard/utils';
import { useDashboardIndexViewModel } from '~/routes/:orgId/dashboard/useDashboardIndexViewModel';
import { SortDirectionType, SortType } from '~/types/sortTypes';
import { timeLong } from '~/utils/dateUtils';
import { getOldStackResourcePageUrl } from '~/utils/oldStackUtils';
import { CustomDashboardOrderByEnum } from '~server/trpc/dashboard/types/dashboards';
import { ORG_DASHBOARD_LOCATION_TEXT } from '~server/trpc/dashboard/util/dashboardUtils';
import { ReactNode, useState } from 'react';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, GenericCell, SortableHeaderCell, InvisibleButtonCell, LinkCell },
} = WhyLabsTableKit;

const useStyles = createStyles((_, { isEmbedded }: { isEmbedded: boolean }) => ({
  confirmDeletionDialogFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    paddingTop: 15,
  },
  tableWrapper: {
    display: 'flex',
    height: `calc(100vh - 88px - ${isEmbedded ? '0px' : `${SINGLE_HEADER_TOP_CONTAINER_HEIGHT}px`})`, // screen-height / filter controls
    // overflow: 'auto',
  },
  dataRow: {
    color: Colors.gray900,
    fontSize: 13,
    fontFamily: 'Inconsolata',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textWrap: 'nowrap',
  },
  cellPadding: {
    padding: '8px',
  },
  table: {
    '&[data-hover] tbody tr:hover': {
      [`& .${getStylesRef('actionsGroup')}`]: {
        display: 'flex',
        gap: 8,
      },
      [`& .${getStylesRef('grayBadge')}`]: {
        background: Colors.secondaryLight300,
      },
      [`& .${getStylesRef('blueBadge')}`]: {
        background: Colors.brandPrimary300,
      },
      '& td *': {
        fontWeight: 600,
      },
    },
  },
  header: {
    color: Colors.black,
    fontWeight: 600,
    textWrap: 'nowrap',
  },
  actionCell: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  actionsGroup: {
    ref: getStylesRef('actionsGroup'),
    display: 'none',
  },
  idString: {
    lineHeight: 1,
    height: 'min-content',
  },
}));

type TableColumn = Omit<WhyLabsTableColumnProps, 'header'> & {
  headerText: string;
} & (
    | {
        sortableBy?: undefined;
        sortType?: undefined;
      }
    | {
        sortableBy: CustomDashboardOrderByEnum;
        sortType: SortType;
      }
  );

export const DashboardIndexTable = () => {
  const viewModel = useDashboardIndexViewModel();
  const {
    dashboards,
    cloneDashboard,
    deleteDashboard,
    emitDashboardNavigationEventToOldStack,
    getDashboardNavigationToOldStackUrl,
    navigateToResourcePage,
    isEmbedded,
    sortBy,
    sortDirection,
    setSort,
    searchText,
    orgId,
  } = viewModel;
  const { classes, cx } = useStyles({ isEmbedded });
  const { isLoading, list: tableData } = dashboards;
  const flags = useFlags();
  const [confirmDashboardDeletion, setConfirmDashboardDeletion] = useState<{ id: string; displayName: string } | null>(
    null,
  );
  const rowsCount = dashboards.list.length;
  const { getNavUrl } = useNavLinkHandler();

  return (
    <div className={classes.tableWrapper}>
      <WhyLabsTable.Container
        isLoading={isLoading}
        rowsCount={isLoading ? 0 : rowsCount}
        className={classes.table}
        headerHeight={34}
        afterTableChildren={!rowsCount && !isLoading && <SimpleEmptyStateMessage title="No dashboard found" />}
      >
        {getColumns().map(({ headerText, sortableBy, sortType, columnKey, ...rest }) => (
          <WhyLabsTable.Column
            key={columnKey}
            columnKey={columnKey}
            header={
              sortableBy ? (
                <SortableHeaderCell
                  columnKey={columnKey}
                  className={classes.header}
                  {...getSortableHeaderProps(sortableBy, sortType)}
                >
                  {headerText}
                </SortableHeaderCell>
              ) : (
                <HeaderCell columnKey={columnKey} className={classes.header}>
                  {headerText}
                </HeaderCell>
              )
            }
            {...rest}
          />
        ))}
      </WhyLabsTable.Container>
      <WhyLabsConfirmationDialog
        isOpen={!!confirmDashboardDeletion}
        dialogTitle={`Delete ${confirmDashboardDeletion?.id ?? ''} "${
          confirmDashboardDeletion?.displayName.trim() ?? ''
        }"?`}
        closeButtonText="Cancel"
        confirmButtonText="Confirm"
        onClose={() => setConfirmDashboardDeletion(null)}
        onConfirm={() => {
          if (!confirmDashboardDeletion) return;
          deleteDashboard(confirmDashboardDeletion.id);
          setConfirmDashboardDeletion(null);
        }}
        modalSize="500px"
      >
        <div className={classes.confirmDeletionDialogFlex}>
          <WhyLabsText>
            You will permanently delete the dashboard, and all users will lose access. This cannot be undone.
          </WhyLabsText>
          <WhyLabsText>Do you want to continue?</WhyLabsText>
        </div>
      </WhyLabsConfirmationDialog>
    </div>
  );

  function getColumns(): TableColumn[] {
    return [
      {
        cell: renderDashboardNameCell,
        headerText: 'Dashboard name',
        minWidth: 300,
        maxWidth: 300,
        sortableBy: CustomDashboardOrderByEnum.DisplayName,
        sortType: 'text',
        columnKey: 'name',
      },
      ...(flags.customDashboardInResources
        ? [
            {
              cell: renderDashboardLocationCell,
              headerText: 'Location',
              minWidth: 100,
              maxWidth: 250,
              sortableBy: CustomDashboardOrderByEnum.Location,
              sortType: 'text',
              columnKey: 'location',
            } satisfies TableColumn,
          ]
        : []),
      {
        cell: renderCreatedByCell,
        headerText: 'Created by',
        minWidth: 180,
        maxWidth: 280,
        sortableBy: CustomDashboardOrderByEnum.Author,
        sortType: 'text',
        columnKey: 'createdBy',
      },
      {
        cell: renderCreatedOnCell,
        headerText: 'Created on',
        minWidth: 'fit-content',
        maxWidth: 200,
        sortableBy: CustomDashboardOrderByEnum.CreationTimestamp,
        sortType: 'number',
        columnKey: 'createdOn',
      },
      {
        cell: renderUpdatedAtCell,
        headerText: 'Last modified',
        minWidth: 'fit-content',
        maxWidth: 200,
        sortableBy: CustomDashboardOrderByEnum.LastUpdatedTimestamp,
        sortType: 'number',
        columnKey: 'updatedAt',
      },
      {
        cell: renderDateRangeCell,
        headerText: 'Date range',
        fixedWidth: 275,
        columnKey: 'dateRange',
      },
      {
        cell: renderDashboardIdCell,
        headerText: 'ID',
        minWidth: '250px',
        sortableBy: CustomDashboardOrderByEnum.ID,
        sortType: 'text',
        columnKey: 'id',
      },
    ];
  }

  function renderCreatedByCell(index: number) {
    const { author } = tableData[index];
    return renderTextCell(author ?? '-');
  }

  function renderCreatedOnCell(index: number) {
    const { creationTimestamp } = tableData[index];
    return renderTextCell(creationTimestamp ? timeLong(creationTimestamp) : '-');
  }

  function renderDashboardNameCell(index: number) {
    const { id, displayName } = tableData[index];
    return renderDashboardLinkCell(displayName, id);
  }

  function renderDashboardLocationCell(index: number) {
    const { location } = tableData[index];

    if (location === ORG_DASHBOARD_LOCATION_TEXT) return renderTextCell(location);

    return renderResourceLinkCell(location);
  }

  function renderUpdatedAtCell(index: number) {
    const { lastUpdatedTimestamp } = tableData[index];
    return renderTextCell(lastUpdatedTimestamp ? timeLong(lastUpdatedTimestamp) : '-');
  }

  function renderDateRangeCell(index: number) {
    const dashboard = tableData[index];
    const { dateRange } = dashboard;
    if (!dateRange) return renderTextCell('-');
    return (
      <GenericCell>
        <DashboardDateRangeBadge dateRange={dateRange} />
      </GenericCell>
    );
  }

  function renderDashboardIdCell(index: number) {
    const { id, displayName } = tableData[index];
    const dashboardNavLink = getDashboardNavigationToOldStackUrl(id);
    const dashboardMutationAllowed = viewModel.isDemoOrg === false && viewModel?.membershipRole?.isViewer === false;
    const mountButtonTooltip = (action: 'delete' | 'clone') => {
      if (viewModel.isDemoOrg)
        return `Dashboard cannot be ${action === 'delete' ? 'deleted' : 'cloned'} from the demo org`;
      if (viewModel.membershipRole?.isViewer)
        return `Dashboard cannot be ${action === 'delete' ? 'deleted' : 'cloned'} by a viewer`;
      return `${action === 'delete' ? 'Delete' : 'Clone'} dashboard`;
    };
    const child = (
      <div className={classes.actionCell}>
        <WhyLabsTextHighlight highlight={searchText} className={cx(classes.dataRow, classes.idString)}>
          {id}
        </WhyLabsTextHighlight>
        <div className={classes.actionsGroup}>
          <CopyButton value={dashboardNavLink}>
            {({ copied, copy }) => (
              <WhyLabsActionIcon
                size={24}
                label="copy url"
                tooltip={copied ? 'Copied' : 'Copy dashboard URL'}
                onClick={copy}
              >
                {copied ? <IconClipboardCheck size={16} /> : <IconClipboardCopy size={16} />}
              </WhyLabsActionIcon>
            )}
          </CopyButton>
          <WhyLabsActionIcon
            size={24}
            label="clone dashboard"
            tooltip={mountButtonTooltip('clone')}
            onClick={() => {
              if (dashboardMutationAllowed) {
                cloneDashboard(id);
              }
            }}
            disabled={!dashboardMutationAllowed}
          >
            <IconCopy size={16} />
          </WhyLabsActionIcon>
          <WhyLabsActionIcon
            size={24}
            label="delete dashboard"
            tooltip={mountButtonTooltip('delete')}
            onClick={() => {
              if (dashboardMutationAllowed) {
                setConfirmDashboardDeletion({ id, displayName });
              }
            }}
            disabled={!dashboardMutationAllowed}
            loading={viewModel.isDemoOrg === null || !viewModel.membershipRole}
          >
            <IconTrash size={16} />
          </WhyLabsActionIcon>
        </div>
      </div>
    );
    return <GenericCell>{child}</GenericCell>;
  }

  function renderTextCell(children: ReactNode) {
    return <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{children}</TextCell>;
  }

  function renderDashboardLinkCell(children: ReactNode, id: string) {
    if (isEmbedded) {
      return (
        <InvisibleButtonCell onClick={() => emitDashboardNavigationEventToOldStack(id)} highlightSearch>
          {children}
        </InvisibleButtonCell>
      );
    }
    const path = getNavUrl({ page: 'dashboards', dashboards: { dashboardId: id } });
    return renderLinkCell(children, path);
  }

  function renderResourceLinkCell(resourceId: string) {
    if (isEmbedded) {
      return (
        <InvisibleButtonCell onClick={() => navigateToResourcePage(resourceId)} highlightSearch>
          {resourceId}
        </InvisibleButtonCell>
      );
    }

    return renderLinkCell(resourceId, getOldStackResourcePageUrl({ resourceId, orgId }));
  }

  function renderLinkCell(children: ReactNode, path: string) {
    return (
      <LinkCell to={path} highlightSearch>
        {children}
      </LinkCell>
    );
  }

  function getSortableHeaderProps(key: CustomDashboardOrderByEnum, sortType: SortType) {
    return {
      sortDirection: sortBy === key ? sortDirection : undefined,
      sortType,
      onSortDirectionChange: onSortDirectionChange(key),
    };
  }

  function onSortDirectionChange(key: CustomDashboardOrderByEnum) {
    return (direction: SortDirectionType) => {
      setSort(key, direction);
    };
  }
};
