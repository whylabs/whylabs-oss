import { RouterOutputs } from '~/utils/trpc';
import { MembershipRole, SubscriptionTier } from '~server/graphql/generated/graphql';

export { MembershipRole, SubscriptionTier };

export type CurrentUser = RouterOutputs['meta']['user']['getCurrentUser'];
