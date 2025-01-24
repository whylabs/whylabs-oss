import { ActionDetailsFragment, ActionType, SortDirection } from 'generated/graphql';
import {
  WhyLabsButton,
  WhyLabsLoadingOverlay,
  WhyLabsSearchInput,
  WhyLabsSwitch,
  WhyLabsTableKit,
  WhyLabsTextHighlight,
  WhyLabsTypography,
} from 'components/design-system';
import { FETCHING_ERROR_MESSAGE } from 'ui/constants';
import { timeLong } from 'utils/dateUtils';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { Skeleton } from '@mantine/core';
import { useCallback, useMemo, useState } from 'react';
import { useDebouncedState } from '@mantine/hooks';
import sortByType from 'hooks/useSort/sort-by/genericSorting';
import { arrayOfLength } from 'utils/arrayUtils';
import { Colors } from '@whylabs/observatory-lib';
import useSort from 'hooks/useSort';
import { AllAccessors, SortByKeys, SortDirectionKeys, SortDirectionType } from 'hooks/useSort/types';
import { TableColumnHorizontalAlign } from 'components/design-system/responsive-table/tableUtils';
import { useQueryParams } from 'utils/queryUtils';
import { EDITING_KEY } from 'types/navTags';
import { useNewNotificationPageStyles } from '../NewNotificationsPageContentAreaStyles';
import {
  ACTION_TYPES,
  ActionOption,
  ActionRoutePath,
  ActionsSortBy,
  extractActionFromPayload,
  UNSUPPORTED_ACTIONS,
} from '../globalActionUtils';
import { useNotificationActionRequestHandler } from './useNotificationActionRequestHandler';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, LinkCell, SortableHeaderCell },
} = WhyLabsTableKit;
interface NotificationActionsTableProps {
  data: ActionDetailsFragment[];
  isDetailsTable?: boolean;
  error?: boolean;
  loading?: boolean;
  hideActionsCell?: boolean;
  actionOption?: ActionOption;
  refetch?: () => void;
}
const accessorsMapper = new Map<ActionsSortBy, AllAccessors<ActionDetailsFragment>>([
  ['Enabled', ['enabled']],
  ['ActionType', ['type']],
  ['ActionID', ['id']],
  ['CreatedAt', ['createdAt']],
  ['UpdatedAt', ['updatedAt']],
]);
export const NotificationActionsTable: React.FC<NotificationActionsTableProps> = ({
  data,
  isDetailsTable = false,
  error,
  loading,
  hideActionsCell,
  actionOption,
  refetch,
}) => {
  const { classes, cx } = useNewNotificationPageStyles();
  const { getNavUrl } = useNavLinkHandler();
  const [sortedData, setSortedData] = useState<ActionDetailsFragment[]>();
  const { toggleAction, loadBlocker } = useNotificationActionRequestHandler({ refetch });
  const { setQueryParam } = useQueryParams();

  const { sortDirection, sortBy, handleSort } = useSort<ActionsSortBy>(
    SortByKeys.sortActionsBy,
    SortDirectionKeys.sortActionsDirection,
  );

  const sortData = useCallback(
    (
      nextSortDirection: SortDirectionType,
      newSortBy: ActionsSortBy = 'Enabled',
      accessors: AllAccessors<ActionDetailsFragment> = [],
    ) => {
      const defaultAccessors = accessorsMapper.get(newSortBy) ?? [];
      const usedAccessors = accessors?.length ? accessors : defaultAccessors;
      setSortedData(handleSort<ActionDetailsFragment>(data, nextSortDirection, newSortBy, usedAccessors));
    },
    [handleSort, data],
  );

  if (sortedData?.length !== data.length) {
    setSortedData(sortByType<ActionDetailsFragment>(data, SortDirection.Desc, ['enabled']));
  }

  const mountActionUrl = (actionType?: ActionRoutePath, id?: string) => {
    if (!actionType || !id) return '';
    return getNavUrl({ page: 'settings', settings: { path: 'notifications', actionType, id } });
  };

  const editAction = (actionType?: ActionRoutePath, id?: string) => {
    if (!actionType || !id) return;
    setQueryParam(EDITING_KEY, id);
  };

  const getActionDisplayName = (actionType: ActionType) =>
    ACTION_TYPES.find(({ type }) => actionType === type)?.displayText;

  const [searchState, setSearchState] = useDebouncedState('', 200);
  const filteredData = useMemo(() => {
    if (data.length === 1) return data;
    return (
      sortedData?.filter(
        ({ id, type }) =>
          !searchState ||
          id.includes(searchState.toLowerCase()) ||
          getActionDisplayName(type)?.toLowerCase().includes(searchState.toLowerCase()),
      ) ?? []
    );
  }, [data, sortedData, searchState]);

  const localHandleToggle = async (actionId: string, isEnabled: boolean) => {
    const success = await toggleAction(actionId, isEnabled);
    if (!success) return;
    setSortedData((state) => {
      const newState = [...(state ?? [])];
      const current = newState.find((item) => item.id === actionId);
      if (current) {
        current.enabled = !isEnabled;
      }
      return newState;
    });
  };

  if (loading) {
    return (
      <div>
        {!isDetailsTable && (
          <>
            <Skeleton width="15%" height={20} mb={10} />
            <Skeleton width="20%" height={40} mb={15} />
          </>
        )}
        <Skeleton width="100%" height={40} />
        {arrayOfLength(isDetailsTable ? 1 : 6).map((i) => (
          <Skeleton key={`skeleton-${i}`} width="100%" height={40} mt={2} />
        ))}
      </div>
    );
  }
  const displayActionsTable = () => {
    if (!loading && !data.length) {
      return <div className={classes.tableEmptyState}>No data found</div>;
    }
    return (
      <WhyLabsTable.Container rowsCount={filteredData.length} headerHeight={42}>
        <WhyLabsTable.Column
          uniqueKey={`enabled-${searchState}-${filteredData.length}-${sortBy}:${sortDirection}`}
          fixedWidth={94}
          header={<HeaderCell>Status</HeaderCell>}
          cell={(index) => {
            const { id, enabled } = filteredData[index];
            return (
              <div className={classes.switchWrapper}>
                <WhyLabsSwitch size="lg" label="" checked={enabled} onChange={() => localHandleToggle(id, enabled)} />
              </div>
            );
          }}
        />
        <WhyLabsTable.Column
          uniqueKey="action-type"
          header={
            isDetailsTable ? (
              <HeaderCell>Action</HeaderCell>
            ) : (
              <SortableHeaderCell
                background={{ default: Colors.brandSecondary100, onHover: Colors.brandSecondary200 }}
                sortDirection={sortBy === 'ActionType' ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) => sortData(newSortDir, 'ActionType')}
                tooltipText="Type of action"
              >
                Action
              </SortableHeaderCell>
            )
          }
          fixedWidth={170}
          cell={(index) => {
            const { type: actionType } = filteredData[index];
            const displayName = getActionDisplayName(actionType);
            return (
              <TextCell className={cx(classes.dataRow, classes.cellPadding)}>
                <WhyLabsTextHighlight highlight={searchState}>{displayName ?? 'Unknown'}</WhyLabsTextHighlight>
              </TextCell>
            );
          }}
        />
        <WhyLabsTable.Column
          uniqueKey="id"
          minWidth={200}
          maxWidth={300}
          header={
            isDetailsTable ? (
              <HeaderCell>ID</HeaderCell>
            ) : (
              <SortableHeaderCell
                background={{ default: Colors.brandSecondary100, onHover: Colors.brandSecondary200 }}
                sortDirection={sortBy === 'ActionID' ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) => sortData(newSortDir, 'ActionID')}
                tooltipText="Action unique ID"
              >
                ID
              </SortableHeaderCell>
            )
          }
          cell={(index) => {
            const { type: actionType, id } = filteredData[index];
            const actionObject = ACTION_TYPES.find(({ type }) => actionType === type);
            if (isDetailsTable || UNSUPPORTED_ACTIONS.find((unsupported) => unsupported === actionType)) {
              return <TextCell className={cx(classes.dataRow, classes.cellPadding, classes.darkText)}>{id}</TextCell>;
            }
            return (
              <LinkCell
                className={cx(classes.dataRow, classes.cellPadding, classes.linkCell)}
                to={mountActionUrl(actionObject?.routePath, id)}
              >
                <WhyLabsTextHighlight highlight={searchState} darkText>
                  {id}
                </WhyLabsTextHighlight>
              </LinkCell>
            );
          }}
        />
        {isDetailsTable && (
          <WhyLabsTable.Column
            uniqueKey="action"
            header={<HeaderCell>{actionOption?.detailsLabel ?? ''}</HeaderCell>}
            cell={(index) => {
              const action = filteredData[index];
              const defaultFormValue = extractActionFromPayload(action.payload);
              return (
                <div className={classes.inputWrapper}>
                  <TextCell className={cx(classes.dataRow, classes.cellPadding, classes.darkText)}>
                    {defaultFormValue}
                  </TextCell>
                </div>
              );
            }}
          />
        )}
        <WhyLabsTable.Column
          uniqueKey="created-at"
          fixedWidth={200}
          header={
            isDetailsTable ? (
              <HeaderCell>Date created</HeaderCell>
            ) : (
              <SortableHeaderCell
                background={{ default: Colors.brandSecondary100, onHover: Colors.brandSecondary200 }}
                sortDirection={sortBy === 'CreatedAt' ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) => sortData(newSortDir, 'CreatedAt')}
              >
                Date created
              </SortableHeaderCell>
            )
          }
          cell={(index) => {
            const action = filteredData[index];
            return (
              <TextCell className={cx(classes.dataRow, classes.cellPadding)}>
                {timeLong(action?.createdAt ?? 0)}
              </TextCell>
            );
          }}
        />
        <WhyLabsTable.Column
          uniqueKey="updated-at"
          fixedWidth={200}
          header={
            isDetailsTable ? (
              <HeaderCell>Last updated</HeaderCell>
            ) : (
              <SortableHeaderCell
                background={{ default: Colors.brandSecondary100, onHover: Colors.brandSecondary200 }}
                sortDirection={sortBy === 'UpdatedAt' ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) => sortData(newSortDir, 'UpdatedAt')}
              >
                Last updated
              </SortableHeaderCell>
            )
          }
          cell={(index) => {
            const action = filteredData[index];
            return (
              <TextCell className={cx(classes.dataRow, classes.cellPadding)}>
                {timeLong(action?.updatedAt ?? 0)}
              </TextCell>
            );
          }}
        />
        {!hideActionsCell && (
          <WhyLabsTable.Column
            uniqueKey="actions-section"
            fixedWidth={80}
            showOnHover
            horizontalAlign={TableColumnHorizontalAlign.Right}
            header={<></>}
            cell={(index) => {
              const action = filteredData[index];
              const { id, type } = action;
              const isUnsupported = !!UNSUPPORTED_ACTIONS.find((unsupported) => unsupported === type);
              const actionObject = ACTION_TYPES.find(({ type: actionType }) => actionType === type);
              return (
                <WhyLabsButton
                  className={classes.editButton}
                  variant="outline"
                  color="gray"
                  width="full"
                  disabled={isUnsupported}
                  disabledTooltip="Action type is not supported on UI yet"
                  onClick={() => {
                    if (isUnsupported) {
                      return;
                    }
                    editAction(actionObject?.routePath, id);
                  }}
                >
                  Edit
                </WhyLabsButton>
              );
            }}
          />
        )}
      </WhyLabsTable.Container>
    );
  };

  return (
    <>
      <WhyLabsLoadingOverlay visible={loadBlocker} />
      {!isDetailsTable && (
        <div>
          <WhyLabsTypography order={2} className={classes.tableItemsCount}>
            Notification actions ({data.length})
          </WhyLabsTypography>
          <div className={classes.searchInput}>
            <WhyLabsSearchInput
              label="Notification actions"
              hideLabel
              onChange={setSearchState}
              variant="borderless"
              placeholder="Type something"
            />
          </div>
        </div>
      )}
      <div className={classes.tableRoot}>
        {error ? <div className={classes.tableEmptyState}>{FETCHING_ERROR_MESSAGE}</div> : displayActionsTable()}
      </div>
    </>
  );
};
