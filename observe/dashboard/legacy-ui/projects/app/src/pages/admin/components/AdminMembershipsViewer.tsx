import { useState } from 'react';
import {
  useListMembershipsForUserLazyQuery,
  useRemoveAllMembershipsMutation,
  useRemoveMemberMutation,
} from 'generated/graphql';
import { WhyLabsButton, WhyLabsModal, WhyLabsTableKit, WhyLabsText } from 'components/design-system';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { ConfirmationGuardBtn } from './ConfirmationGuardBtn';
import { ImpersonationBtn } from './ImpersonationBtn';

const useStyles = createStyles({
  membershipModalFooter: {
    paddingTop: '20px',
  },
  buttonGroup: {
    display: 'flex',
    gap: 10,
  },
  rowCell: {
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
  },
  dataRow: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '14px',
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
  modalTableWrapper: {
    maxHeight: '500px',
    display: 'flex',
    flexDirection: 'column',
  },
});

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, GenericCell },
} = WhyLabsTableKit;

export const AdminMembershipsViewer: React.FC = () => {
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [removeAllMemberships] = useRemoveAllMembershipsMutation();
  const [removeMembership] = useRemoveMemberMutation();
  const { classes, cx } = useStyles();
  const [isMembershipViewOpen, setIsMembershipViewOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [searchedEmail, setSearchedEmail] = useState('');

  const [listMembershipsForUser, { data, loading, refetch }] = useListMembershipsForUserLazyQuery();

  const handleRemoveMembership = (orgId: string, email: string) => {
    removeMembership({ variables: { orgId, email } })
      .then(() => {
        if (refetch) refetch({ email });
        enqueueSnackbar({ title: `Successfully removed ${email} from ${orgId}` });
      })
      .catch((err) => {
        if (refetch) refetch({ email });
        enqueueSnackbar({
          title: `Failed to remove ${email} from ${orgId}`,
          description: err.message,
          variant: 'error',
        });
      });
  };

  const handleOpenMembershipsList = (email: string) => {
    setIsMembershipViewOpen(true);
    listMembershipsForUser({ variables: { email } });
  };

  const handleClearMemberships = (email: string) => {
    removeAllMemberships({ variables: { email } })
      .then(() => {
        if (refetch) refetch({ email });
        enqueueSnackbar({ title: `Successfully removed all memberships for ${email}` });
      })
      .catch((err) => {
        if (refetch) refetch({ email });
        enqueueSnackbar({
          title: `Failed to remove all memberships for user ${email}`,
          description: err.message,
          variant: 'error',
        });
      });
  };

  return (
    <div>
      <div>
        <WhyLabsText>Membership lookup:</WhyLabsText>
        <input
          required
          placeholder="foo@bar.com"
          value={searchedEmail}
          onChange={(e) => setSearchedEmail(e.target.value)}
          onKeyPress={(event) => {
            if (event.key === 'Enter') {
              handleOpenMembershipsList(searchedEmail);
            }
          }}
        />
        <WhyLabsButton
          size="xs"
          variant="outline"
          color="primary"
          onClick={() => handleOpenMembershipsList(searchedEmail)}
        >
          Go!
        </WhyLabsButton>
      </div>

      {/* Members list */}
      <WhyLabsModal
        opened={isMembershipViewOpen}
        onClose={() => setIsMembershipViewOpen(false)}
        title={`Memberships associated with ${searchedEmail}`}
        size="max-content"
        centered
      >
        <div className={classes.modalTableWrapper}>
          <WhyLabsTable.Container
            rowsCount={data?.admin?.memberships?.length ?? 0}
            headerHeight={42}
            isLoading={loading}
          >
            <WhyLabsTable.Column
              uniqueKey="membership-list-user-id"
              maxWidth="max-content"
              header={<HeaderCell>UserID</HeaderCell>}
              cell={(index) => {
                const { userId } = data?.admin?.memberships?.[index] ?? {};
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{userId ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="membership-list-org-id"
              maxWidth="max-content"
              header={<HeaderCell>OrgID</HeaderCell>}
              cell={(index) => {
                const { orgId } = data?.admin?.memberships?.[index] ?? {};
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{orgId ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="membership-list-email"
              maxWidth="max-content"
              header={<HeaderCell>Email</HeaderCell>}
              cell={(index) => {
                const { email } = data?.admin?.memberships?.[index] ?? {};
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{email ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="membership-list-role"
              maxWidth="max-content"
              header={<HeaderCell>Role</HeaderCell>}
              cell={(index) => {
                const { role } = data?.admin?.memberships?.[index] ?? {};
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{role ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="membership-list-actions"
              maxWidth="max-content"
              header={<HeaderCell>Actions</HeaderCell>}
              cell={(index) => {
                const { userId, orgId, email } = data?.admin?.memberships?.[index] ?? {};
                if (!userId || !orgId || !email) return <></>;
                return (
                  <div className={classes.rowCell}>
                    <GenericCell>
                      <div className={classes.tableActionContainer}>
                        <ImpersonationBtn userId={userId} orgId={orgId} email={email} />
                        <ConfirmationGuardBtn
                          btnText="Remove"
                          confirmationText={`Remove user from ${orgId}?`}
                          handleClick={() => handleRemoveMembership(orgId, email)}
                        />
                      </div>
                    </GenericCell>
                  </div>
                );
              }}
            />
          </WhyLabsTable.Container>
        </div>
        <div className={classes.membershipModalFooter}>
          <WhyLabsButton variant="outline" color="danger" onClick={() => setIsWarningOpen(true)}>
            Remove user from all organizations
          </WhyLabsButton>
        </div>
      </WhyLabsModal>

      {/* Warning dialog */}
      <WhyLabsModal opened={isWarningOpen} onClose={() => setIsWarningOpen(false)} title="Warning!" size="lg" centered>
        <WhyLabsText>
          You are trying to remove user {searchedEmail} from ALL organizations. They will NOT be able to log in to ANY
          of them if you proceed.
        </WhyLabsText>
        <br />
        <WhyLabsText>Are you sure?</WhyLabsText>
        <br />
        <div className={classes.buttonGroup}>
          <WhyLabsButton variant="filled" color="primary" onClick={() => setIsWarningOpen(false)}>
            Nooo!!! Cancel! Cancel!!
          </WhyLabsButton>
          <WhyLabsButton variant="outline" color="danger" onClick={() => handleClearMemberships(searchedEmail)}>
            Proceed. I accept responsibility for my careless actions.
          </WhyLabsButton>
        </div>
      </WhyLabsModal>
    </div>
  );
};
