import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { LoaderData } from '~/types/LoaderData';
import { trpc } from '~/utils/trpc';
import { MembershipRole } from '~server/graphql/generated/graphql';
import LogRocket from 'logrocket';
import { FormEvent, useState } from 'react';
import { LoaderFunction, useLoaderData, useRevalidator } from 'react-router-dom';
import invariant from 'tiny-invariant';

import { useUserManagementContext } from '../UserManagementIndex';

const DEFAULT_ROLE = MembershipRole.Viewer;

export const loader = (({ params }) => {
  const { orgId, userId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(userId, 'userId must exist in this route');

  return { orgId, userId };
}) satisfies LoaderFunction;

export const useEditUserViewModel = () => {
  const { orgId, userId } = useLoaderData() as LoaderData<typeof loader>;
  const revalidator = useRevalidator();

  const { handleNavigation } = useNavLinkHandler();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const { members, refetchUsers } = useUserManagementContext();

  const updateMembersMutation = trpc.admin.organizations.updateMember.useMutation();
  const { asyncCall: updateMemberMutationCall, isSaving } = useMutationProperties({
    mutation: updateMembersMutation,
    revalidator,
  });

  const editingUser = members.find((member) => member.userId === userId);

  const [selectedRole, setSelectedRole] = useState<MembershipRole>(editingUser?.role || DEFAULT_ROLE);

  const onChangeRole = (newRole: MembershipRole) => {
    setSelectedRole(newRole);
  };

  const onClose = () => {
    handleNavigation({ page: 'settings', settings: { path: 'user-management' } });
  };

  const resetForm = () => {
    setSelectedRole(DEFAULT_ROLE);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    (async () => {
      if (editingUser) {
        try {
          await updateMemberMutationCall({
            email: editingUser?.email,
            orgId,
            role: selectedRole,
          });
          enqueueSnackbar({ title: 'Updated user' });
        } catch (err) {
          const explanation = 'Update user failed';
          LogRocket.error(explanation, err);
          enqueueErrorSnackbar({ explanation, err });
        }
      }

      refetchUsers();
      onClose();
      resetForm();
    })();
  };

  return {
    editingUser,
    isSaving,
    onChangeRole,
    onClose,
    onSubmit,
    selectedRole,
  };
};
