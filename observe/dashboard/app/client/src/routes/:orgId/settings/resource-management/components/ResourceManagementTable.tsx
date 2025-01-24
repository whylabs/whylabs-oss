import { createStyles, getStylesRef } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsConfirmationDialog, WhyLabsTableKit, WhyLabsText } from '~/components/design-system';
import { RenderCellProps, WhyLabsTableColumnProps } from '~/components/design-system/responsive-table/tableUtils';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { TagManagementModal } from '~/components/tag/TagManagementModal';
import { UserDefinedTags } from '~/components/tags/UserDefinedTags';
import { SortDirectionType, SortType } from '~/types/sortTypes';
import { timeLong } from '~/utils/dateUtils';
import { safeGetLabelForModelType } from '~/utils/resourceTypeUtils';
import { isNumber } from '~/utils/typeGuards';
import { ModelType } from '~server/graphql/generated/graphql';
import { ResourcesOrderByEnum } from '~server/trpc/meta/resources/types/resource-types';
import { ReactNode, memo } from 'react';

import { useResourceManagementIndexViewModel } from '../useResourceManagementIndexViewModel';
import { useResourceTagManagementViewModel } from './useResourceTagManagementViewModel';

const {
  Components: WhyLabsTable,
  Cells: { ActionsCell, TextCell, HeaderCell, InvisibleButtonCell, ScrollableCell, SortableHeaderCell },
} = WhyLabsTableKit;

const TABLE_HEADER_HEIGHT = 34;
const TAGS_EMPTY_CELL_STYLE_REF = 'tagsEmptyCell';
const TAGS_EMPTY_CELL_HOVER_STYLE_REF = 'tagsEmptyCellHover';

const MANAGE_RESOURCE_TAGS_LABEL = 'Click to update tags';

export const useStyles = createStyles(() => ({
  table: {
    '&[data-hover] tbody tr:hover': {
      '& td *': {
        fontWeight: 600,
      },
    },
  },
  header: {
    color: Colors.black,
    whiteSpace: 'nowrap',
  },
  modalButtonsContainer: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  confirmDeletionDialogFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    paddingTop: 15,
  },
  noPaddingCell: {
    padding: 0,
  },
  tagsCellRoot: {
    minHeight: TABLE_HEADER_HEIGHT,

    '&:hover': {
      [`& .${getStylesRef(TAGS_EMPTY_CELL_STYLE_REF)}`]: {
        display: 'none',
      },
      [`& .${getStylesRef(TAGS_EMPTY_CELL_HOVER_STYLE_REF)}`]: {
        display: 'block',
      },
    },
  },
  tagsEmptyCellText: {
    ref: getStylesRef(TAGS_EMPTY_CELL_STYLE_REF),
    display: 'block',
    fontFamily: 'Inconsolata',
  },
  tagsEmptyCellTextHover: {
    ref: getStylesRef(TAGS_EMPTY_CELL_HOVER_STYLE_REF),
    display: 'none',
    fontFamily: 'Inconsolata',
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
        sortableBy: ResourcesOrderByEnum;
        sortType: SortType;
      }
  );

type ParentViewModel = ReturnType<typeof useResourceManagementIndexViewModel>;

type TableProps = {
  hasData: ParentViewModel['hasData'];
  setSort: ParentViewModel['setSort'];
  sortBy: ParentViewModel['sortBy'];
  sortDirection: ParentViewModel['sortDirection'];
  tableRowsCount: ParentViewModel['tableRowsCount'];
  filteredResources: ParentViewModel['filteredResources'];
  isLoading: ParentViewModel['isLoading'];
  setSelectedIdToDelete: ParentViewModel['setSelectedIdToDelete'];
  onEditResource: ParentViewModel['onEditResource'];
  editResourceTags: (id: string) => () => void;
};

type ResourceManagementContentProps = {
  isModalOpen: ParentViewModel['isModalOpen'];
  onCancelDeleting: ParentViewModel['onCancelDeleting'];
  onDeleteResource: ParentViewModel['onDeleteResource'];
  selectedIdToDelete: ParentViewModel['selectedIdToDelete'];
} & Omit<TableProps, 'editResourceTags'>;

const WIDTH_BUFFER = 20;

const ResourceManagementTable = memo(
  ({
    hasData,
    setSort,
    sortBy,
    sortDirection,
    filteredResources,
    onEditResource,
    isLoading,
    tableRowsCount,
    setSelectedIdToDelete,
    editResourceTags,
  }: TableProps) => {
    const { classes } = useStyles();
    function getSortableHeaderProps(key: ResourcesOrderByEnum, sortType: SortType) {
      return {
        sortDirection: sortBy === key ? sortDirection : undefined,
        sortType,
        onSortDirectionChange: onSortDirectionChange(key),
      };
    }

    const onSortDirectionChange = (key: ResourcesOrderByEnum) => {
      return (direction: SortDirectionType) => {
        setSort(key, direction);
      };
    };

    const getColumns = (): TableColumn[] => {
      function renderNameCell(index: number) {
        const { id, name } = { ...filteredResources[index] };
        const children = (
          <InvisibleButtonCell className={classes.noPaddingCell} highlightSearch onClick={onEditResource(id)}>
            {name}
          </InvisibleButtonCell>
        );

        return renderEditResourceCell({ children, id });
      }

      function renderIdCell(index: number) {
        const { id } = filteredResources[index];
        return renderTextCell(id);
      }

      function renderResourceTypeCell(index: number) {
        const { id, modelType } = filteredResources[index];
        const children = renderTextCell(safeGetLabelForModelType(modelType as ModelType), classes.noPaddingCell);
        return renderEditResourceCell({ children, id });
      }

      function renderBatchFrequencyCell(index: number) {
        const { id, timePeriod } = filteredResources[index];
        const children = renderTextCell(timePeriod, classes.noPaddingCell);
        return renderEditResourceCell({ children, id });
      }

      function renderTagsCell(index: number, { columnKey }: RenderCellProps) {
        const { id, tags } = filteredResources[index];

        const children = (() => {
          if (!tags.length) {
            return renderTextCell(
              <>
                <span className={classes.tagsEmptyCellText}>No tags</span>
                <span className={classes.tagsEmptyCellTextHover}>Click to add tags...</span>
              </>,
              classes.noPaddingCell,
            );
          }

          return (
            <ScrollableCell columnKey={columnKey} tooltipText={MANAGE_RESOURCE_TAGS_LABEL}>
              <UserDefinedTags
                disabledTooltip
                tags={tags.map((customTag) => ({
                  customTag,
                }))}
              />
            </ScrollableCell>
          );
        })();

        return (
          <ActionsCell
            mode="display"
            actions={[
              {
                label: MANAGE_RESOURCE_TAGS_LABEL,
                type: 'tag',
              },
            ]}
            classNames={{ root: classes.tagsCellRoot }}
            key={`${columnKey}--${index}`}
            onClick={editResourceTags(id)}
          >
            {children}
          </ActionsCell>
        );
      }

      function renderCreatedOnCell(index: number) {
        const { creationTime } = filteredResources[index];
        return renderTextCell(creationTime ? timeLong(creationTime) : '-');
      }

      function renderLatestProfileTimestampCell(index: number) {
        const { dataAvailability } = filteredResources[index];

        const date = dataAvailability?.latestTimestamp ? timeLong(dataAvailability?.latestTimestamp) : '-';
        return renderTextCell(date);
      }

      function renderActionsCell(index: number) {
        const { id } = filteredResources[index];

        return (
          <ActionsCell
            actions={[
              {
                label: 'Edit resource',
                loading: isLoading,
                onClick: onEditResource(id),
                type: 'edit',
              },
              {
                label: 'Delete resource',
                loading: isLoading,
                onClick: () => {
                  setSelectedIdToDelete(id);
                },
                type: 'delete',
              },
            ]}
          />
        );
      }

      function renderEditResourceCell({ children, id }: { children: ReactNode; id: string }) {
        return (
          <ActionsCell
            actions={[
              {
                label: 'Edit resource',
                loading: isLoading,
                onClick: onEditResource(id),
                type: 'edit',
              },
            ]}
          >
            {children}
          </ActionsCell>
        );
      }

      function renderTextCell(children: ReactNode, className?: string) {
        return <TextCell className={className}>{children}</TextCell>;
      }

      return [
        {
          cell: renderNameCell,
          headerText: 'Name',
          minWidth: 'fit-content',
          maxWidth: 'min(20vw, 500px)',
          columnKey: 'name',
          sortableBy: ResourcesOrderByEnum.Name,
          sortType: 'text',
        },
        {
          cell: renderIdCell,
          headerText: 'ID',
          minWidth: 'fit-content',
          maxWidth: 300,
          columnKey: 'id',
          sortableBy: ResourcesOrderByEnum.ID,
          sortType: 'text',
        },
        {
          cell: renderResourceTypeCell,
          headerText: 'Type',
          minWidth: 'fit-content',
          maxWidth: 300,
          columnKey: 'type',
          sortableBy: ResourcesOrderByEnum.Type,
          sortType: 'text',
        },
        {
          cell: renderBatchFrequencyCell,
          headerText: 'Batch frequency',
          columnKey: 'timePeriod',
          minWidth: 'fit-content',
          maxWidth: 300,
          sortableBy: ResourcesOrderByEnum.TimePeriod,
          sortType: 'text',
        },
        {
          cell: renderTagsCell,
          columnKey: 'tags',
          headerText: 'Tags',
          fixedWidth: 350,
        },
        {
          cell: renderCreatedOnCell,
          columnKey: 'createdOn',
          headerText: 'Created on',
          minWidth: 'fit-content',
          maxWidth: 200,
          sortableBy: ResourcesOrderByEnum.CreationTimestamp,
          sortType: 'number',
        },
        {
          cell: renderLatestProfileTimestampCell,
          columnKey: 'latestProfileTimestamp',
          headerText: 'Latest profile timestamp',
          minWidth: 'fit-content',
          maxWidth: 250,
          sortableBy: ResourcesOrderByEnum.LatestProfileTimestamp,
          sortType: 'number',
        },
        {
          cell: renderActionsCell,
          columnKey: 'actions',
          headerText: 'Actions',
          fixedWidth: 'min-content',
        },
      ];
    };

    return (
      <WhyLabsTable.Container
        afterTableChildren={
          !hasData &&
          !isLoading && (
            <SimpleEmptyStateMessage
              // plus two pixels to account for the header borders
              minHeight={`calc(100% - ${TABLE_HEADER_HEIGHT + 2}px)`}
              title="No resources found"
            />
          )
        }
        className={classes.table}
        headerHeight={TABLE_HEADER_HEIGHT}
        isLoading={isLoading}
        rowsCount={tableRowsCount ?? 0}
        fixedFirstColumn
      >
        {getColumns().map(({ headerText, columnKey, sortableBy, sortType, maxWidth, ...rest }) => {
          const header = (() => {
            const scrollableFixedWidth =
              columnKey === 'tags' && isNumber(rest.fixedWidth) ? rest.fixedWidth : undefined;
            const commonProps = {
              columnKey,
              className: classes.header,
              scrollableFixedWidth,
              widthBuffer: columnKey === 'tags' ? WIDTH_BUFFER : 0,
            };
            if (sortableBy) {
              return (
                <SortableHeaderCell {...commonProps} {...getSortableHeaderProps(sortableBy, sortType)}>
                  {headerText}
                </SortableHeaderCell>
              );
            }
            return <HeaderCell {...commonProps}>{headerText}</HeaderCell>;
          })();
          return (
            <WhyLabsTable.Column
              key={`table-column-${columnKey}`}
              columnKey={columnKey}
              header={header}
              {...rest}
              maxWidth={maxWidth}
            />
          );
        })}
      </WhyLabsTable.Container>
    );
  },
);

export const ResourceManagementContent = ({
  filteredResources,
  hasData,
  isLoading,
  isModalOpen,
  onCancelDeleting,
  onDeleteResource,
  onEditResource,
  selectedIdToDelete,
  setSelectedIdToDelete,
  setSort,
  sortBy,
  sortDirection,
  tableRowsCount,
}: ResourceManagementContentProps) => {
  const { classes } = useStyles();
  const tagManagementViewModel = useResourceTagManagementViewModel();

  return (
    <>
      <ResourceManagementTable
        hasData={hasData}
        setSort={setSort}
        sortBy={sortBy}
        sortDirection={sortDirection}
        filteredResources={filteredResources}
        onEditResource={onEditResource}
        isLoading={isLoading}
        tableRowsCount={tableRowsCount}
        setSelectedIdToDelete={setSelectedIdToDelete}
        editResourceTags={tagManagementViewModel.editResourceTags}
      />
      <TagManagementModal
        appliedTags={tagManagementViewModel.editingResourceTags}
        availableTags={tagManagementViewModel.orgTags}
        isLoadingAppliedTags={tagManagementViewModel.isLoadingResource}
        isLoadingAvailableTags={tagManagementViewModel.isLoadingOrgTags}
        isOpen={tagManagementViewModel.isOpen}
        onClose={tagManagementViewModel.cancelEditingTags}
        onRemoveTag={tagManagementViewModel.removeTag}
        onSetTag={tagManagementViewModel.setTag}
      />

      <WhyLabsConfirmationDialog
        isOpen={isModalOpen}
        dialogTitle={`Delete model ${selectedIdToDelete}?`}
        closeButtonText="Cancel"
        confirmButtonText="Confirm"
        onClose={onCancelDeleting}
        onConfirm={onDeleteResource}
        modalSize={500}
      >
        <div className={classes.confirmDeletionDialogFlex}>
          <WhyLabsText id="alert-dialog-description">
            All access to profile, monitoring, and performance data for this model will be removed from WhyLabs platform
            immediately.
          </WhyLabsText>
          <WhyLabsText>Data will be permanently deleted after the next scheduled clean-up job.</WhyLabsText>
        </div>
      </WhyLabsConfirmationDialog>
    </>
  );
};
