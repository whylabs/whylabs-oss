import { useOrgId } from '~/hooks/useOrgId';
import { trpc } from '~/utils/trpc';
import { MembershipType } from '~server/graphql/generated/graphql';

export const useIsDemoOrg = (): boolean | null => {
  const { data, isLoading } = trpc.meta.memberships.list.useQuery();
  const currentOrgId = useOrgId();
  const currentOrgMembership = data?.find(({ orgId }) => currentOrgId === orgId);
  if (isLoading || !currentOrgMembership) return null;
  return currentOrgMembership.membershipType === MembershipType.Demo;
};
