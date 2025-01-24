import { orgMembershipLimit } from '~/constants/limits';
import { useFlags } from '~/hooks/useFlags';
import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useOrganizationsList } from '~/hooks/useOrganizationsList';
import { useUserContext } from '~/hooks/useUserContext';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { MembershipRole, SubscriptionTier } from '~/types/userTypes';
import { RouterOutputs, trpc } from '~/utils/trpc';
import { uniq } from 'lodash';
import LogRocket from 'logrocket';
import { FormEvent, useState } from 'react';
import { useRevalidator } from 'react-router-dom';

import { USER_ROLE_OPTIONS } from './utils/roleUtils';

type AddMemberMutationOutput = RouterOutputs['admin']['organizations']['addMemberToOrganization'];

export type CreatedMember = Pick<AddMemberMutationOutput, 'email' | 'role'>;

const DEFAULT_ROLE = MembershipRole.Member;
const MAX_EMAIL_THRESHOLD = 100;

export const useUserManagementIndexViewModel = () => {
  const { selectedOrg, orgId } = useOrganizationsList();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();
  const flags = useFlags();
  const revalidator = useRevalidator();
  const { currentUser: user } = useUserContext();

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<MembershipRole>(DEFAULT_ROLE);
  const [membersFilter, setMembersFilter] = useState('');

  const tier = user?.organization?.subscriptionTier;
  const addUserMutation = trpc.admin.organizations.addMemberToOrganization.useMutation();
  const removeUserMutation = trpc.admin.organizations.removeMemberFromOrganization.useMutation();

  const { isSaving } = useMutationProperties({ mutation: addUserMutation, revalidator });
  const { asyncCall: addUserMutationCall } = useMutationProperties({ mutation: addUserMutation, revalidator });
  const { asyncCall: removeUserMutationAsyncCall } = useMutationProperties({
    mutation: removeUserMutation,
    revalidator,
  });

  const { data, isLoading, refetch } = trpc.admin.organizations.getMembers.useQuery({ id: orgId });
  const members = data || [];

  const memberCount = members ? members.length : 0;
  const rbacEnabled = user?.organization?.subscriptionTier === SubscriptionTier.Paid || flags.userPermissionsManagement;

  const filteredTeamMembers = members.filter(({ email, role }) => {
    const lowercasedSearchTerm = membersFilter.toLowerCase();
    const matchEmail = email.toLowerCase().includes(lowercasedSearchTerm);
    const matchRole = role.toLowerCase().includes(lowercasedSearchTerm);
    return matchEmail || matchRole;
  });

  const resetForm = () => {
    setNewMemberEmail('');
    setNewMemberRole(DEFAULT_ROLE);
  };

  const addMembers = async (emails: string[]) => {
    const succeededEmails = new Set<string>();
    const addMemberPromises = emails.map(async (email) => {
      const member = await addUserMutationCall(
        {
          orgId,
          email,
          role: newMemberRole,
        },
        {
          onErrorExplanation: (reason) => `Failed to add user ${email}. ${reason}`,
        },
      );
      if (member) succeededEmails.add(email);
    });
    await Promise.all(addMemberPromises);

    refetch();
    resetForm();

    if (succeededEmails.size) {
      enqueueSnackbar({
        title:
          succeededEmails.size === 1
            ? 'Successfully added 1 email.'
            : `Successfully added ${succeededEmails.size} emails.`,
        variant: 'success',
      });
    }
  };

  const removeMember = async (email: string) => {
    try {
      const member = await removeUserMutationAsyncCall({ email, orgId });
      await refetch();

      const removedEmail = member?.email;
      if (removedEmail) {
        enqueueSnackbar({ title: `Successfully removed ${removedEmail} from organization` });
      } else {
        enqueueSnackbar({ title: 'Successfully removed member from organization' });
      }
    } catch (error) {
      const explanation = 'Delete user failed';
      LogRocket.error(explanation, error);
      enqueueErrorSnackbar({ explanation, err: error });
    }
  };

  const onChangeEmailsInput = (newInput: string) => {
    const newLastChar = newInput[newInput.length - 1];

    const previousLastChar = newMemberEmail[newMemberEmail.length - 1];

    const matchesSpecialChar = newLastChar === ';' || newLastChar === ',';

    // Adds extra space if we match special char
    if (matchesSpecialChar && previousLastChar !== ' ') {
      setNewMemberEmail(`${newInput} `);
    } else {
      setNewMemberEmail(newInput);
    }
  };

  const onChangeMemberRole = (newRole: MembershipRole | null) => {
    setNewMemberRole(newRole ?? DEFAULT_ROLE);
  };

  const getEmails = (): { newEmails: string[]; alreadyAddedEmails: string[] } => {
    const tempMembers = members;
    const emailList = uniq(newMemberEmail.split(/;|,/).map((email) => email.trim().toLocaleLowerCase()));
    const emails = emailList.filter((email) => !!email);
    const addedEmails: string[] = []; // List of all emails that were already added;

    if (!tempMembers?.length) return { newEmails: emails, alreadyAddedEmails: addedEmails };

    const alreadyAddedEmails = new Set(tempMembers.map((member) => member.email));
    const filteredEmails = emails.filter((email) => {
      const isEmailAdded = alreadyAddedEmails.has(email);
      if (isEmailAdded) addedEmails.push(email);

      return !isEmailAdded; // Don't return already added emails
    });

    return { newEmails: filteredEmails, alreadyAddedEmails: addedEmails };
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const { newEmails, alreadyAddedEmails } = getEmails();
    if (alreadyAddedEmails.length) {
      const message =
        alreadyAddedEmails.length === 1
          ? `${alreadyAddedEmails[0]} is already in this organization`
          : `The following emails have already been added: ${alreadyAddedEmails.join(', ')}`;
      enqueueSnackbar({
        title: message,
        variant: alreadyAddedEmails.length === 1 ? 'info' : 'success',
      });
    }
    if (newEmails.length === 0) return;

    if (newEmails.length < MAX_EMAIL_THRESHOLD) {
      addMembers(newEmails);
    } else {
      enqueueSnackbar({
        title: `The maximum number of emails that can be added at the same time is ${MAX_EMAIL_THRESHOLD}`,
        variant: 'error',
      });
    }
  };

  // Check if user limit is reached for non-paid orgs
  const isOverUserLimit = tier !== SubscriptionTier.Paid && memberCount >= orgMembershipLimit;

  return {
    filteredTeamMembers,
    isLoading,
    isOverUserLimit,
    isSaving,
    maxEmailThreshold: MAX_EMAIL_THRESHOLD,
    members,
    newMemberEmail,
    newMemberRole,
    onChangeEmailsInput,
    onChangeMemberRole,
    onSubmit,
    rbacEnabled,
    refetchUsers: refetch,
    removeMember,
    roleSelectOptions: USER_ROLE_OPTIONS,
    searchTerm: membersFilter,
    selectedOrg,
    setMembersFilter,
    setNewMemberEmail,
  };
};
