import { IconPencil } from '@tabler/icons-react';
import {
  WhyLabsActionIcon,
  WhyLabsSearchInput,
  WhyLabsSubmitButton,
  WhyLabsSwitch,
  WhyLabsTableKit,
  WhyLabsTextHighlight,
} from '~/components/design-system';
import { WhyLabsVerticalDivider } from '~/components/design-system/layout/WhyLabsVerticalDivider';
import GenericCell from '~/components/design-system/responsive-table/cells/GenericCell';
import { WhyLabsTableColumnProps } from '~/components/design-system/responsive-table/tableUtils';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { TitleValueWidget } from '~/components/header-widgets/TitleValueWidget';
import { SortType } from '~/types/sortTypes';
import { TABLE_HEADER_HEIGHT } from '~/utils/constants';
import { timeLong } from '~/utils/dateUtils';
import { isString } from '~/utils/typeGuards';
import { NotificationsOrderByEnum } from '~server/trpc/meta/notifications/types/NotificationsTypes';
import { ReactElement, ReactNode } from 'react';

import { useNewNotificationPageStyles } from '../notificationStyles';
import { useNotificationsViewModel } from '../useNotificationsViewModel';
import { extractActionFromPayload } from '../utils/globalActionUtils';

type TableColumn = Omit<WhyLabsTableColumnProps, 'header'> & {
  headerContent: ReactElement | string;
  isHidden?: boolean;
  tooltipText?: string;
} & (
    | {
        sortableBy?: undefined;
        sortType?: undefined;
      }
    | {
        sortableBy: NotificationsOrderByEnum;
        sortType: SortType;
      }
  );

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, LinkCell, SortableHeaderCell },
} = WhyLabsTableKit;
interface NotificationActionsTableProps {
  isDetailsTable?: boolean;
  viewModel: ReturnType<typeof useNotificationsViewModel>;
}
export const NotificationActionsTable = ({
  isDetailsTable = false,
  viewModel: {
    fetchingErrorMessage,
    getActionDisplayName,
    getActionDetailsLabel,
    getSortableHeaderProps,
    handleEdit,
    handleNewActionClick,
    hasData,
    isLoading,
    listingNotificationsError,
    mountActionUrl,
    notifications,
    searchText,
    setSearchText,
    sortBy,
    sortDirection,
    tableRowsCount,
    toggleAction,
  },
}: NotificationActionsTableProps) => {
  const { classes } = useNewNotificationPageStyles();

  const displayActionsTable = () => {
    return (
      <WhyLabsTable.Container
        headerHeight={TABLE_HEADER_HEIGHT}
        rowsCount={tableRowsCount}
        className={classes.table}
        fixedFirstColumn
        isLoading={isLoading}
        afterTableChildren={
          !hasData &&
          !isLoading && (
            <SimpleEmptyStateMessage
              // plus two pixels to account for the header borders
              minHeight={`calc(100% - ${TABLE_HEADER_HEIGHT + 2}px)`}
              title="No notifications found"
            />
          )
        }
      >
        {getColumns().map(({ headerContent, sortableBy, sortType, columnKey, tooltipText, ...rest }) => {
          const header = (() => {
            if (isString(headerContent)) {
              if (sortableBy) {
                return (
                  <SortableHeaderCell
                    columnKey={columnKey}
                    tooltipText={tooltipText}
                    {...getSortableHeaderProps(sortableBy, sortType)}
                  >
                    {headerContent}
                  </SortableHeaderCell>
                );
              }

              return (
                <HeaderCell columnKey={columnKey} className={classes.header} tooltipText={tooltipText}>
                  {headerContent}
                </HeaderCell>
              );
            }
            return headerContent;
          })();

          return (
            <WhyLabsTable.Column key={`table-column-${columnKey}`} columnKey={columnKey} header={header} {...rest} />
          );
        })}
      </WhyLabsTable.Container>
    );
  };

  return (
    <>
      {!isDetailsTable && (
        <div className={classes.controlsRoot}>
          <div className={classes.controlsScrollableContainer}>
            <WhyLabsSearchInput
              className={classes.searchInput}
              label="Quick search"
              onChange={setSearchText}
              placeholder="Filter by action type or ID"
              value={searchText}
            />
            <WhyLabsVerticalDivider height={40} />
            <TitleValueWidget
              isLoading={isLoading}
              loadingSkeletonProps={{ width: 30 }}
              title="Total notification actions"
            >
              {notifications.length}
            </TitleValueWidget>
          </div>
          <div className={classes.addActionButtonContainer}>
            <WhyLabsSubmitButton onClick={handleNewActionClick}>New action</WhyLabsSubmitButton>
          </div>
        </div>
      )}
      <div className={classes.tableRoot}>
        {listingNotificationsError ? (
          <div className={classes.tableEmptyState}>{fetchingErrorMessage}</div>
        ) : (
          displayActionsTable()
        )}
      </div>
    </>
  );

  function getColumns(): TableColumn[] {
    const actionColumnAsListToSpread: TableColumn[] = (() => {
      if (!isDetailsTable || !notifications[0]) return [];

      return [
        {
          cell: renderActionCell,
          headerContent: getActionDetailsLabel(notifications[0].type),
          minWidth: 'fit-content',
          maxWidth: '100%',
          columnKey: 'action',
        },
      ];
    })();

    return [
      {
        cell: renderStatusCell,
        headerContent: 'Status',
        fixedWidth: 80,
        columnKey: `status-${searchText}-${tableRowsCount}-${sortBy}-${sortDirection}`,
      },
      {
        cell: renderActionTypeCell,
        headerContent: 'Action',
        minWidth: 180,
        maxWidth: 250,
        sortableBy: NotificationsOrderByEnum.Action,
        sortType: 'text',
        columnKey: 'action-type',
        tooltipText: 'Type of action',
      },
      {
        cell: renderIdCell,
        headerContent: 'ID',
        minWidth: 'fit-content',
        maxWidth: isDetailsTable ? 'fit-content' : 'max(600px, 50vw)',
        columnKey: 'id',
        sortableBy: NotificationsOrderByEnum.Id,
        sortType: 'text',
        tooltipText: 'Action unique ID',
      },
      ...actionColumnAsListToSpread,
      {
        cell: renderCreatedAtCell,
        headerContent: 'Date Created',
        minWidth: 200,
        sortableBy: NotificationsOrderByEnum.CreationTime,
        sortType: 'number',
        columnKey: 'creationTime',
      },
      {
        cell: renderLastUpdatedCell,
        headerContent: 'Last Updated',
        minWidth: 250,
        sortableBy: NotificationsOrderByEnum.LastUpdated,
        sortType: 'number',
        columnKey: 'LastUpdated',
      },
    ];
  }

  function renderStatusCell(index: number) {
    const { enabled, id } = notifications[index];

    return renderGenericCell(
      <WhyLabsSwitch
        checked={enabled}
        hideLabel
        label={`${enabled ? 'Disable' : 'Enable'} notification action`}
        onChange={() => toggleAction(id, enabled)}
        size="sm"
      />,
    );
  }

  function renderActionTypeCell(index: number) {
    const { type } = notifications[index];
    return renderTextCell(getActionDisplayName(type), searchText);
  }

  function renderActionCell(index: number) {
    const action = notifications[index];
    const actionValue = extractActionFromPayload(action);
    return renderTextCell(actionValue);
  }

  function renderIdCell(index: number) {
    const { id } = notifications[index];

    if (isDetailsTable) return renderTextCell(id);

    return (
      <LinkCell to={mountActionUrl(id)} className={classes.dataRow}>
        <WhyLabsTextHighlight highlight={searchText}>{id}</WhyLabsTextHighlight>
      </LinkCell>
    );
  }

  function renderCreatedAtCell(index: number) {
    const { createdAt } = notifications[index];

    return renderTextCell(timeLong(createdAt ?? 0));
  }
  function renderLastUpdatedCell(index: number) {
    const { updatedAt, id } = notifications[index];

    const child = (
      <div className={classes.actionCell}>
        {renderTextCell(timeLong(updatedAt ?? 0))}

        {!isDetailsTable && (
          <div className={classes.actionsGroup}>
            <WhyLabsActionIcon
              size={24}
              label="edit action"
              tooltip="Edit action"
              onClick={() => {
                handleEdit(id);
              }}
              loading={isLoading}
            >
              <IconPencil size={16} />
            </WhyLabsActionIcon>
          </div>
        )}
      </div>
    );

    return <GenericCell>{child}</GenericCell>;
  }

  function renderTextCell(children?: string, highlightString = '') {
    return (
      <TextCell className={classes.dataRow}>
        <WhyLabsTextHighlight highlight={highlightString}>{children || '-'}</WhyLabsTextHighlight>
      </TextCell>
    );
  }

  function renderGenericCell(children: ReactNode) {
    return <GenericCell>{children}</GenericCell>;
  }
};
