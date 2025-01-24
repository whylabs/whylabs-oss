import { useOrgId } from '~/hooks/useOrgId';
import { trpc } from '~/utils/trpc';
import { MembershipRole } from '~server/graphql/generated/graphql';

export type MembershipRoleReturnType = {
  isViewer: boolean;
  isAdmin: boolean;
  isMember: boolean;
};

export const useCheckMembershipRole = (): MembershipRoleReturnType | null => {
  const { data, isLoading } = trpc.meta.memberships.list.useQuery();
  const currentOrgId = useOrgId();
  const currentOrgMembership = data?.find(({ orgId }) => currentOrgId === orgId);
  if (isLoading || !currentOrgMembership) return null;

  return {
    isViewer: currentOrgMembership.role === MembershipRole.Viewer,
    isAdmin: currentOrgMembership.role === MembershipRole.Admin,
    isMember: currentOrgMembership.role === MembershipRole.Member,
  };
};
