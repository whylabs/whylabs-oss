import { createStyles, getStylesRef } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { WhyLabsActionIcon, WhyLabsConfirmationDialog, WhyLabsTableKit, WhyLabsText } from '~/components/design-system';
import { WhyLabsTableColumnProps } from '~/components/design-system/responsive-table/tableUtils';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { TABLE_HEADER_HEIGHT } from '~/utils/constants';
import { isString } from '~/utils/typeGuards';
import { ReactElement, ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useUserManagementIndexViewModel } from '../useUserManagementIndexViewModel';

export const useStyles = createStyles(() => ({
  actionCell: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  table: {
    '&[data-hover] tbody tr:hover': {
      [`& .${getStylesRef('actionsGroup')}`]: {
        display: 'flex',
      },
      '& td *': {
        fontWeight: 600,
      },
    },
  },
  actionsGroup: {
    display: 'none',
    gap: 8,
    ref: getStylesRef('actionsGroup'),
  },
  header: {
    color: Colors.black,
    whiteSpace: 'nowrap',
  },
  noPaddingCell: {
    padding: 0,
  },
}));

const {
  Components: WhyLabsTable,
  Cells: { TextCell, GenericCell, HeaderCell },
} = WhyLabsTableKit;

type TableColumn = Omit<WhyLabsTableColumnProps, 'header'> & {
  headerContent: ReactElement | string;
  isHidden?: boolean;
};

type UserManagementTableProps = {
  viewModel: ReturnType<typeof useUserManagementIndexViewModel>;
};

export const UserManagementTable = ({
  viewModel: { filteredTeamMembers: tableData, isLoading, removeMember },
}: UserManagementTableProps) => {
  const { classes } = useStyles();
  const navigate = useNavigate();

  const [userEmailToDelete, setUserEmailToDelete] = useState<string | null>(null);
  const isDeleteDialogOpen = !!userEmailToDelete;

  const onClickEditUser = (userId: string) => {
    return () => {
      navigate(userId);
    };
  };

  const onClickDeleteUser = (email: string) => {
    return () => {
      setUserEmailToDelete(email);
    };
  };

  const cancelDeleteUser = () => {
    setUserEmailToDelete(null);
  };

  const confirmDeleteUser = () => {
    if (userEmailToDelete) {
      removeMember(userEmailToDelete);
    }
    cancelDeleteUser();
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
              title="No users found"
            />
          )
        }
        className={classes.table}
        headerHeight={TABLE_HEADER_HEIGHT}
        isLoading={isLoading}
        rowsCount={tableRowsCount}
      >
        {getColumns().map(({ headerContent, columnKey, ...rest }) => {
          const header = (() => {
            if (isString(headerContent)) {
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
        confirmButtonText="Confirm Delete"
        dialogTitle={`Delete user ${userEmailToDelete ?? ''}?`}
        isOpen={isDeleteDialogOpen}
        modalSize="600px"
        onClose={cancelDeleteUser}
        onConfirm={confirmDeleteUser}
      >
        <WhyLabsText id="alert-dialog-description">
          All access to profile, monitoring, and performance data for this model will be removed from WhyLabs platform
          immediately.
        </WhyLabsText>
        <br />
        <WhyLabsText>Data will be permanently deleted after the next scheduled clean-up job.</WhyLabsText>
      </WhyLabsConfirmationDialog>
    </>
  );

  function getColumns(): TableColumn[] {
    return [
      {
        cell: renderAccountCell,
        headerContent: 'Account',
        minWidth: 400,
        columnKey: 'account',
      },
      {
        cell: renderRoleCell,
        headerContent: 'Role',
        fixedWidth: '100%',
        columnKey: 'Role',
      },
    ];
  }

  function renderAccountCell(index: number) {
    const { email } = tableData[index];
    return renderTextCell(email);
  }

  function renderRoleCell(index: number) {
    const { email, role, userId } = tableData[index];

    const child = (
      <div className={classes.actionCell}>
        {renderTextCell(role, classes.noPaddingCell)}

        <div className={classes.actionsGroup}>
          <WhyLabsActionIcon
            size={24}
            label="edit user"
            tooltip="Edit user"
            onClick={onClickEditUser(userId)}
            loading={isLoading}
          >
            <IconPencil size={16} />
          </WhyLabsActionIcon>
          <WhyLabsActionIcon
            size={24}
            label="delete user"
            tooltip="Delete user"
            onClick={onClickDeleteUser(email)}
            loading={isLoading}
          >
            <IconTrash size={16} />
          </WhyLabsActionIcon>
        </div>
      </div>
    );
    return <GenericCell>{child}</GenericCell>;
  }

  function renderTextCell(children: ReactNode, className?: string) {
    return <TextCell className={className}>{children}</TextCell>;
  }
};
