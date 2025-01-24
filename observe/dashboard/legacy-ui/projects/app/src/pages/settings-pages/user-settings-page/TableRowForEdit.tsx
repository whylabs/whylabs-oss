import { useState } from 'react';
import {
  TableRow,
  TableCell,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import {
  Exact,
  GetUsersOrganizationMembersQuery,
  MembershipRole,
  useRemoveMemberFromOrgMutation,
} from 'generated/graphql';
import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import { ApolloQueryResult } from '@apollo/client';
import SelectAutoComplete, { ISelectItem } from 'components/select-autocomplete/SelectAutoComplete';
import { Skeleton } from '@material-ui/lab';
import { WhyLabsTextHighlight } from 'components/design-system';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { userSettingsPageContentStyles } from '../utils/settingsPageUtils';

interface Member {
  email: string;
  role: MembershipRole;
}

interface TableRowForEditProps {
  isEditing: boolean;
  member: Member;
  setHasChanges: (flag: boolean) => void;
  selectRoleTypeValues: ISelectItem[];
  handleHappenedChange: (email: string, role: MembershipRole) => void;
  loading: LoadingField;
  refetch:
    | ((
        variables?:
          | Partial<
              Exact<{
                [key: string]: never;
              }>
            >
          | undefined,
      ) => Promise<ApolloQueryResult<GetUsersOrganizationMembersQuery>>)
    | undefined;
  readonly searchTerm?: string;
}

export interface LoadingField {
  isLoading: boolean;
  cause: 'update' | 'unknown';
}

const TableRowForEdit: React.FC<TableRowForEditProps> = ({
  isEditing,
  member,
  setHasChanges,
  selectRoleTypeValues,
  handleHappenedChange,
  loading,
  refetch,
  searchTerm,
}) => {
  const { classes, cx } = userSettingsPageContentStyles();
  const initialItem = selectRoleTypeValues.find((item) => item.value === member.role);
  const [value, setValue] = useState<ISelectItem>(initialItem || selectRoleTypeValues[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [removeMemberFromOrg, { loading: removeMemberLoading }] = useRemoveMemberFromOrgMutation();

  function generateLoadingMessage() {
    if (loading.cause === 'update') return 'Updating...';
    if (removeMemberLoading) {
      return (
        <>
          Deleting...
          <CircularProgress size={14} style={{ marginLeft: 12 }} />
        </>
      );
    }

    return 'Loading...';
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
  }

  function handleOpenDialog(memberMail: string) {
    setIsDialogOpen(true);
  }

  function onDeleteMember() {
    removeMemberFromOrg({ variables: { email: member.email } })
      .then((res) => {
        const removedEmail = res.data?.memberships?.remove?.email;
        if (removedEmail) enqueueSnackbar({ title: `Successfully removed ${removedEmail} from organization` });
        else enqueueSnackbar({ title: 'Successfully removed member from organization' });

        setIsDialogOpen(false);
        if (!refetch) return;
        refetch().catch((err) => {
          console.log('Failed to fetch organization members after deletion', err);
          enqueueSnackbar({
            title: 'Failed to fetch updated organization members. Please reload the page.',
            variant: 'error',
          });
        });
      })
      .catch((err) => {
        console.log('Failed to remove member from org', err);
        enqueueSnackbar({ title: 'Failed to remove member from organization', variant: 'error' });
      });
  }

  return (
    <>
      {loading.isLoading || removeMemberLoading ? (
        <TableRow>
          <TableCell>
            {removeMemberLoading ? (
              <>
                Deleting...
                <CircularProgress size={14} style={{ marginLeft: 12 }} />
              </>
            ) : (
              generateLoadingMessage()
            )}
          </TableCell>
          <TableCell />
          <TableCell />
          <TableCell />
        </TableRow>
      ) : (
        <TableRow key={`member-id-${member.email}`}>
          <TableCell component="th" scope="row" className={classes.tableFirstColumn}>
            <WhyLabsTextHighlight highlight={searchTerm ?? ''}>{member.email}</WhyLabsTextHighlight>
          </TableCell>
          <TableCell>
            {isEditing ? (
              <div style={{ fontSize: '14px', minWidth: '110px' }}>
                <SelectAutoComplete
                  id={`roleSelectAutoComplete-${member.email}`}
                  options={selectRoleTypeValues}
                  onChange={(event) => {
                    if (event?.value) {
                      setValue(event);
                    }
                    setHasChanges(false);
                    handleHappenedChange(member.email, event?.value as MembershipRole);
                  }}
                  placeholder="Select role"
                  value={value}
                />
              </div>
            ) : (
              member.role
            )}
          </TableCell>
          <TableCell align="right">
            <Button className={classes.deleteBtn} variant="outlined" onClick={() => handleOpenDialog(member.email)}>
              DELETE
            </Button>
            {/* )} */}
          </TableCell>
        </TableRow>
      )}

      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" style={{ backgroundColor: Colors.white, padding: '20px 25px 10px' }}>
          <Typography component="p" className={classes.dialogTitle}>
            Delete user {member.email}?
          </Typography>
        </DialogTitle>
        <DialogContent style={{ backgroundColor: Colors.white, padding: '10px 25px' }}>
          <div id="alert-dialog-description">
            <Typography className={classes.dialogText}>
              All access to profile, monitoring, and performance data from this user will be removed from the WhyLabs
              Platform immediately.
            </Typography>
            <Typography className={classes.dialogText}>
              Data will be permanently deleted after the next scheduled clean-up job.
            </Typography>
          </div>
        </DialogContent>
        <DialogActions style={{ backgroundColor: Colors.white, padding: '4px 25px 14px' }}>
          <Button onClick={handleCloseDialog} className={cx([classes.dialogButton, classes.dialogButtonCancel])}>
            CANCEL
          </Button>
          <Button onClick={() => onDeleteMember()} className={classes.dialogButton}>
            CONFIRM DELETE
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default TableRowForEdit;

export function TableRowSkeleton({ classes }: { classes: ClassNameMap }): JSX.Element {
  return (
    <TableRow>
      <TableCell component="th" scope="row" className={classes.tableFirstColumn}>
        <Skeleton variant="text" className={classes.skeletonText} />
      </TableCell>
      <TableCell>
        <Skeleton variant="text" className={classes.skeletonText} />
      </TableCell>
      <TableCell align="right">
        <Skeleton variant="rect" className={classes.skeletonBtn} />
      </TableCell>
    </TableRow>
  );
}
