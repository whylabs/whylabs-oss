import { trpc } from '~/utils/trpc';

export const useDefaultOrg = () => {
  const { data: userData, isLoading: userIsLoading } = trpc.meta.user.getCurrentUser.useQuery({});
  const { data, isLoading } = trpc.meta.memberships.list.useQuery();
  return {
    userData,
    membershipListData: data,
    isLoading: isLoading || userIsLoading,
  };
};
