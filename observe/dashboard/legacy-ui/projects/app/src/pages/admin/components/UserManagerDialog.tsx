import { useState } from 'react';
import { Colors, getFullDomain } from '@whylabs/observatory-lib';
import {
  Member,
  MembershipRole,
  Organization,
  useAddMemberMutation,
  useRemoveMemberMutation,
  useSetMemberDefaultOrgMutation,
} from 'generated/graphql';
import { WhyLabsButton, WhyLabsModal, WhyLabsTableKit, WhyLabsText } from 'components/design-system';
import { createStyles } from '@mantine/core';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { ImpersonationBtn } from './ImpersonationBtn';
import { UpdateUserBtn } from './UpdateUserBtn';
import { RoleSelect } from './RoleSelect';

type OrgSummary = Pick<Organization, 'name' | 'id' | 'emailDomains'>;

interface UserManagerDialogProps {
  selectedOrg: OrgSummary | undefined;
  members: Member[];
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
  usersUpdated: (orgId: string) => void;
}

const useStyles = createStyles({
  rowCell: {
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
  },
  dataRow: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '12px',
    color: Colors.brandSecondary900,
  },
  cellPadding: {
    padding: '8px',
  },
  tableActionContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  tableContainer: {
    maxHeight: '300px',
    overflowY: 'scroll',
    display: 'block',

    thead: {
      position: 'sticky',
      top: 0,
      background: 'white',
      zIndex: 2,
    },
  },
  actionButtonsContainer: {
    display: 'flex',
    gridGap: '5px',
    paddingTop: '3px',
    paddingBottom: '3px',
  },
  tableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '500px',
  },
  flexRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
});

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, GenericCell },
} = WhyLabsTableKit;

export const UserManagerDialog: React.FC<UserManagerDialogProps> = ({
  selectedOrg,
  members,
  isOpen,
  onClose,
  usersUpdated,
  loading,
}) => {
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { classes, cx } = useStyles();
  const [removeMember] = useRemoveMemberMutation();
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<MembershipRole>(MembershipRole.Admin);
  const [showEmailCheckWarningDialog, setShowEmailCheckWarningDialog] = useState<boolean>(false);
  const [setDefaultOrg] = useSetMemberDefaultOrgMutation();
  const orgId: string = selectedOrg?.id ?? 'unknown';
  const orgName: string = selectedOrg?.name ?? 'unknown';
  const [addMember] = useAddMemberMutation();
  const orgDomains: string[] = selectedOrg?.emailDomains ?? [];

  if (!isOpen) return null;

  const handleCloseEmailCheckWarning = () => {
    setShowEmailCheckWarningDialog(false);
  };

  const handleCreateUser = (userEmail: string, userRole: MembershipRole, showEmailCheckWarning: boolean) => {
    const userEmailDomain = getFullDomain(userEmail);
    if (!userEmailDomain) {
      enqueueSnackbar({ title: `Invalid email address: ${userEmail}`, variant: 'error' });
      return;
    }

    // guard against adding a user with email that doesnt match selected org's domain
    if (showEmailCheckWarning) {
      if (!!selectedOrg?.emailDomains?.length && !selectedOrg.emailDomains.includes(userEmailDomain)) {
        setShowEmailCheckWarningDialog(true);
        return;
      }
    } else {
      setShowEmailCheckWarningDialog(false);
    }

    addMember({ variables: { orgId, email: newUserEmail, role: userRole } })
      .then(() => {
        if (usersUpdated) usersUpdated(orgId);
        enqueueSnackbar({ title: 'User successfully added to org' });
      })
      .catch((err) =>
        enqueueSnackbar({ title: `Failed to add user to org ${orgId}`, description: err.message, variant: 'error' }),
      );
  };

  const handleRemoveUser = (email: string) => {
    removeMember({ variables: { orgId, email } })
      .then(() => {
        if (usersUpdated) usersUpdated(orgId);
        enqueueSnackbar({ title: 'User removed from org' });
      })
      .catch((err) =>
        enqueueSnackbar({
          title: `Failed to remove user from org ${orgId}}`,
          description: err.message,
          variant: 'error',
        }),
      );
  };

  const handleSetDefaultOrg = (email: string) => {
    setDefaultOrg({ variables: { orgId, email } })
      .then(() => enqueueSnackbar({ title: `User will be logged into org ${orgId} by default` }))
      .catch((err) =>
        enqueueSnackbar({ title: 'Failed to change default org for user', description: err.message, variant: 'error' }),
      );
  };

  const renderEmailCheckDialog = () => {
    /* User email check dialog */
    return (
      <WhyLabsModal
        withCloseButton={false}
        size="lg"
        opened={showEmailCheckWarningDialog}
        onClose={handleCloseEmailCheckWarning}
        centered
      >
        <WhyLabsText>
          You are trying to add user {newUserEmail} to organization {orgName} ({orgId}). The user&apos;s email not in
          one of the organization&apos;s domains: {orgDomains.join(', ')}
        </WhyLabsText>
        <WhyLabsText style={{ marginTop: '15px' }}>
          This user will be able to see the specified organization&apos;s data.
        </WhyLabsText>
        <WhyLabsText style={{ marginTop: '15px' }}>ARE YOU ABSOLUTELY SURE YOU WANT TO DO THIS?</WhyLabsText>
        <WhyLabsButton
          style={{ marginTop: '15px' }}
          width="full"
          variant="filled"
          color="primary"
          onClick={() => handleCloseEmailCheckWarning()}
        >
          Nooo!!! Cancel! Cancel!!
        </WhyLabsButton>
        <WhyLabsButton
          width="full"
          variant="subtle"
          size="xs"
          color="danger"
          onClick={() => handleCreateUser(newUserEmail, newUserRole, false)}
          style={{ marginTop: '15px' }}
        >
          Proceed. I accept responsibility for my careless actions.
        </WhyLabsButton>
      </WhyLabsModal>
    );
  };

  return (
    <div>
      <WhyLabsModal
        title={`Users belonging to ${orgName} (${orgId})`}
        opened={isOpen}
        onClose={onClose}
        size="max-content"
        centered
      >
        <div className={classes.tableWrapper}>
          <WhyLabsTable.Container rowsCount={members?.length ?? 0} headerHeight={42} isLoading={loading}>
            <WhyLabsTable.Column
              uniqueKey="manage-user-list-id"
              maxWidth="max-content"
              header={<HeaderCell>ID</HeaderCell>}
              cell={(index) => {
                const { userId } = members[index];
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{userId ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="manage-user-list-email"
              maxWidth="max-content"
              header={<HeaderCell>Email</HeaderCell>}
              cell={(index) => {
                const { email } = members[index];
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{email ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="manage-user-list-subscription-role"
              maxWidth="max-content"
              header={<HeaderCell>Role</HeaderCell>}
              cell={(index) => {
                const { role } = members[index];
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{role ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="manage-user-list-actions"
              maxWidth="max-content"
              header={<HeaderCell>Actions</HeaderCell>}
              cell={(index) => {
                const { userId, orgId: userOrg, role, email } = members[index];
                if (!members[index]) return <></>;
                return (
                  <div className={classes.rowCell}>
                    <GenericCell>
                      <div className={classes.tableActionContainer}>
                        <ImpersonationBtn userId={userId} orgId={orgId} email={email} />
                        <UpdateUserBtn orgId={userOrg} email={email} initialRole={role} usersUpdated={usersUpdated} />
                        <WhyLabsButton
                          variant="outline"
                          size="xs"
                          color="gray"
                          style={{ border: 'solid orange 1px' }}
                          onClick={() => handleSetDefaultOrg(email)}
                        >
                          Set default
                        </WhyLabsButton>
                        <WhyLabsButton
                          variant="outline"
                          size="xs"
                          color="gray"
                          style={{ border: 'solid red 1px' }}
                          onClick={() => handleRemoveUser(email)}
                        >
                          Remove
                        </WhyLabsButton>
                      </div>
                    </GenericCell>
                  </div>
                );
              }}
            />
          </WhyLabsTable.Container>
        </div>
        <WhyLabsText>Add new member</WhyLabsText>
        <div className={classes.flexRow}>
          <div>
            Name:{' '}
            <input
              style={{ margin: '0 15px 0 5px' }}
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
          </div>
          <div className={classes.flexRow}>
            Role: <RoleSelect role={newUserRole} setRole={setNewUserRole} />
            <WhyLabsButton
              variant="outline"
              color="primary"
              onClick={() => handleCreateUser(newUserEmail, newUserRole, true)}
            >
              Add
            </WhyLabsButton>
          </div>
        </div>
      </WhyLabsModal>
      {renderEmailCheckDialog()}
    </div>
  );
};
