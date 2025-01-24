import { Organization } from '~server/graphql/generated/graphql';

type TierType = Organization['subscriptionTier'];

export function isItOverSubscriptionLimit({
  resourceCount,
  tier,
}: {
  resourceCount?: number;
  tier: TierType;
}): boolean {
  return isFreeSubscriptionTier(tier) && hasMoreThanAllowedResources(resourceCount);
}

export function isFreeSubscriptionTier(tier: TierType): boolean {
  return tier === 'FREE';
}

function hasMoreThanAllowedResources(resourceCount?: number): boolean {
  return (resourceCount ?? 0) > 2;
}
