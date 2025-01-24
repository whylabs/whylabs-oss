import { useState } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { MembershipRole, useInternalUpdateMemberMutation } from 'generated/graphql';
import { createStyles } from '@mantine/core';
import { WhyLabsButton, WhyLabsModal } from 'components/design-system';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { RoleSelect } from './RoleSelect';

type UpdateUserBtnProps = {
  orgId: string;
  email: string;
  initialRole: MembershipRole;
  usersUpdated: (orgId: string) => void;
};

const useStyles = createStyles({
  flex: {
    display: 'flex',
    gap: 10,
  },
  btn: {
    border: `solid ${Colors.green} 1px`,
  },
});

export const UpdateUserBtn: React.FC<UpdateUserBtnProps> = ({ orgId, email, initialRole, usersUpdated }) => {
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const { classes: styles } = useStyles();
  const [role, setRole] = useState<MembershipRole>(initialRole);

  const [isUpdateUserViewOpen, setIsUpdateUserViewOpen] = useState<boolean>(false);
  const [updateMember] = useInternalUpdateMemberMutation();

  const handleClickUpdate = (): void => {
    setIsUpdateUserViewOpen(true);
  };

  const handleCloseUpdateUserView = (): void => {
    setIsUpdateUserViewOpen(false);
  };

  const handleUpdateUser = async (): Promise<void> => {
    setIsUpdateUserViewOpen(false);
    if (role === initialRole) return;
    updateMember({ variables: { orgId, email, role } })
      .then(() => {
        if (usersUpdated) usersUpdated(orgId);
        enqueueSnackbar({ title: 'Member role updated' });
      })
      .catch((err) =>
        enqueueSnackbar({ title: 'Failed to update member role in org', description: err.message, variant: 'error' }),
      );
  };

  return (
    <>
      <WhyLabsModal
        title={`Update role for user ${email} in ${orgId}`}
        opened={isUpdateUserViewOpen}
        onClose={handleCloseUpdateUserView}
        size="max-content"
        centered
      >
        <div className={styles.flex}>
          <RoleSelect role={role} setRole={setRole} />
          <WhyLabsButton size="xs" variant="outline" color="primary" onClick={handleUpdateUser}>
            Update role
          </WhyLabsButton>
        </div>
      </WhyLabsModal>
      <WhyLabsButton variant="outline" color="gray" size="xs" onClick={handleClickUpdate} className={styles.btn}>
        Update
      </WhyLabsButton>
    </>
  );
};
