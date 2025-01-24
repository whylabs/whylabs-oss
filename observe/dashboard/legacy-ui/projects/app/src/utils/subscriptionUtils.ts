import { Organization } from 'generated/graphql';

type TierType = Organization['subscriptionTier'];

export function isItOverSubscriptionLimit({ modelCount, tier }: { modelCount?: number; tier: TierType }): boolean {
  return isFreeSubscriptionTier(tier) && hasMoreThanAllowedModels(modelCount);
}

export function isFreeSubscriptionTier(tier: TierType): boolean {
  return tier === 'FREE';
}

function hasMoreThanAllowedModels(modelCount?: number): boolean {
  return (modelCount ?? 0) > 2;
}
