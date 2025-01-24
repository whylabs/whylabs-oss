import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsConfirmationDialog, WhyLabsTableKit, WhyLabsText } from '~/components/design-system';
import { WhyLabsTableColumnProps } from '~/components/design-system/responsive-table/tableUtils';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { SortDirectionType, SortType } from '~/types/sortTypes';
import { TABLE_HEADER_HEIGHT } from '~/utils/constants';
import { dateOnly } from '~/utils/dateUtils';
import { isString } from '~/utils/typeGuards';
import { ApiKeysOrderByEnum } from '~server/trpc/meta/api-keys/types/apiKeysTypes';
import { ReactElement, ReactNode, useRef, useState } from 'react';

import { useAccessTokensIndexViewModel } from '../useAccessTokensIndexViewModel';

export const useStyles = createStyles(() => ({
  dataRow: {
    color: Colors.brandSecondary900,
    fontFamily: 'Inconsolata',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  header: {
    color: Colors.black,
    whiteSpace: 'nowrap',
  },
  cellPadding: {
    padding: '8px',
  },
  revokeButton: {
    height: 24,
  },
}));

const {
  Components: WhyLabsTable,
  Cells: { GenericCell, TextCell, HeaderCell, SortableHeaderCell },
} = WhyLabsTableKit;

type TableColumn = Omit<WhyLabsTableColumnProps, 'header'> & {
  headerContent: ReactElement | string;
  isHidden?: boolean;
} & (
    | {
        sortableBy?: undefined;
        sortType?: undefined;
      }
    | {
        sortableBy: ApiKeysOrderByEnum;
        sortType: SortType;
      }
  );

type AccessTokensTableProps = {
  viewModel: ReturnType<typeof useAccessTokensIndexViewModel>;
};

export const AccessTokensTable = ({
  viewModel: { accessTokens: tableData, isLoading, revokeAccessToken, sortBy, sortDirection, setSort },
}: AccessTokensTableProps) => {
  const { classes, cx } = useStyles();

  const clickedUserIdForRevokeRef = useRef<string>('');

  const [isRevokingKeyId, setIsRevokingKeyId] = useState<string | null>(null);
  const isDeleteDialogOpen = !!isRevokingKeyId;

  const onClickRevokeKey = (key: string, userId: string) => {
    return () => {
      clickedUserIdForRevokeRef.current = userId;
      setIsRevokingKeyId(key);
    };
  };

  const cancelRevokeKey = () => {
    setIsRevokingKeyId(null);
    clickedUserIdForRevokeRef.current = '';
  };

  const confirmRevokeKey = () => {
    if (isRevokingKeyId) {
      revokeAccessToken(isRevokingKeyId, clickedUserIdForRevokeRef.current);
      cancelRevokeKey();
    }
  };

  const hasData = !!tableData.length;
  const rowsCount = tableData.length;

  const tableRowsCount = isLoading ? 0 : rowsCount;
  return (
    <>
      <WhyLabsTable.Container
        afterTableChildren={
          !hasData &&
          !isLoading && (
            <SimpleEmptyStateMessage
              // plus two pixels to account for the header borders
              minHeight={`calc(100% - ${TABLE_HEADER_HEIGHT + 2}px)`}
              title="No access tokens found"
            />
          )
        }
        headerHeight={TABLE_HEADER_HEIGHT}
        isLoading={isLoading}
        rowsCount={tableRowsCount}
      >
        {getColumns().map(({ headerContent, sortableBy, sortType, columnKey, ...rest }) => {
          const header = (() => {
            if (isString(headerContent)) {
              if (sortableBy) {
                return (
                  <SortableHeaderCell columnKey={columnKey} {...getSortableHeaderProps(sortableBy, sortType)}>
                    {headerContent}
                  </SortableHeaderCell>
                );
              }

              return (
                <HeaderCell columnKey={columnKey} className={classes.header}>
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
      <WhyLabsConfirmationDialog
        closeButtonText="Cancel"
        confirmButtonText="Revoke token"
        dialogTitle={`Revoke access token with ID ${isRevokingKeyId ?? ''}?`}
        isOpen={isDeleteDialogOpen}
        modalSize="500px"
        onClose={cancelRevokeKey}
        onConfirm={confirmRevokeKey}
      >
        <WhyLabsText>This token will no longer be usable.</WhyLabsText>
      </WhyLabsConfirmationDialog>
    </>
  );

  function getColumns(): TableColumn[] {
    return [
      {
        cell: renderNameCell,
        headerContent: 'Name',
        maxWidth: 400,
        sortableBy: ApiKeysOrderByEnum.Name,
        sortType: 'text',
        columnKey: 'name',
      },
      {
        cell: renderIdCell,
        headerContent: 'ID',
        fixedWidth: 82,
        columnKey: 'id',
      },
      {
        cell: renderCreationTimeCell,
        headerContent: 'Created',
        fixedWidth: 100,
        sortableBy: ApiKeysOrderByEnum.CreationTime,
        sortType: 'number',
        columnKey: 'creationTime',
      },
      {
        cell: renderExpirationTimeCell,
        headerContent: 'Expires',
        fixedWidth: 100,
        sortableBy: ApiKeysOrderByEnum.ExpirationTime,
        sortType: 'number',
        columnKey: 'expirationTime',
      },
      {
        cell: renderScopeCell,
        headerContent: 'Scope',
        fixedWidth: 110,
        columnKey: 'scope',
      },
      {
        cell: renderActionsCell,
        headerContent: 'Actions',
        fixedWidth: 80,
        columnKey: 'actions',
      },
    ];
  }

  function renderNameCell(index: number) {
    const { name } = tableData[index];
    return renderTextCell(name);
  }

  function renderIdCell(index: number) {
    const { id } = tableData[index];
    return renderTextCell(id);
  }

  function renderCreationTimeCell(index: number) {
    const { createdAt } = tableData[index];
    return renderTextCell(dateOnly(createdAt));
  }

  function renderExpirationTimeCell(index: number) {
    const { expiresAt } = tableData[index];
    return renderTextCell(expiresAt ? dateOnly(expiresAt) : 'Never');
  }

  function renderScopeCell(_: number) {
    return renderTextCell('No restrictions');
  }

  function renderActionsCell(index: number) {
    const { id, userId } = tableData[index];
    return (
      <GenericCell>
        <WhyLabsButton
          className={classes.revokeButton}
          color="gray"
          onClick={onClickRevokeKey(id, userId)}
          variant="outline"
          size="xs"
        >
          Revoke
        </WhyLabsButton>
      </GenericCell>
    );
  }

  function renderTextCell(children: ReactNode) {
    return <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{children}</TextCell>;
  }

  function getSortableHeaderProps(key: ApiKeysOrderByEnum, sortType: SortType) {
    return {
      sortDirection: sortBy === key ? sortDirection : undefined,
      sortType,
      onSortDirectionChange: onSortDirectionChange(key),
    };
  }

  function onSortDirectionChange(key: ApiKeysOrderByEnum) {
    return (direction: SortDirectionType) => {
      setSort(key, direction);
    };
  }
};
