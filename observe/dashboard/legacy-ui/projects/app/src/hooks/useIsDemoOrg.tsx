import { MembershipType } from 'generated/graphql';
import { useUserContext } from 'hooks/useUserContext';

export function useIsDemoOrg(): boolean {
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();

  const { membershipType } = user?.organization ?? {};

  return membershipType === MembershipType.Demo;
}
