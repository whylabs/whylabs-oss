import { SubscriptionTier as ContractSubscriptionTier } from '@whylabs/songbird-node-client';
import {
  GetMarketplaceMetadataResponse,
  MarketplaceDimensions,
  OrganizationSummary,
} from '@whylabs/songbird-node-client';

import { commaSeparatedToArray } from '../../../util/contract-utils';
import { fnThrow } from '../../../util/misc';
import { Organization, SubscriptionTier } from '../../generated/graphql';

const contractSubscriptionTierToGQL = (subTier?: ContractSubscriptionTier): SubscriptionTier => {
  switch (subTier) {
    case ContractSubscriptionTier.Free:
      return SubscriptionTier.Free;
    case ContractSubscriptionTier.AwsMarketplace:
      return SubscriptionTier.AwsMarketplace;
    case ContractSubscriptionTier.Subscription:
      return SubscriptionTier.Subscription;
    default:
      return SubscriptionTier.Paid;
  }
};

export const graphqlSubscriptionTierToContract = (subTier: SubscriptionTier): ContractSubscriptionTier => {
  switch (subTier) {
    case SubscriptionTier.Paid:
      return ContractSubscriptionTier.Paid;
    case SubscriptionTier.AwsMarketplace:
      return ContractSubscriptionTier.AwsMarketplace;
    case SubscriptionTier.Subscription:
      return ContractSubscriptionTier.Subscription;
    case SubscriptionTier.Free:
    case SubscriptionTier.Unknown:
      return ContractSubscriptionTier.Free;
    default:
      return fnThrow(`Found unknown subscription tier ${subTier}'`);
  }
};

export const contractOrganizationToGQL = (
  org: OrganizationSummary,
  marketplaceMetadata: GetMarketplaceMetadataResponse | null = null,
): Organization => {
  const subscriptionTier = contractSubscriptionTierToGQL(org.subscriptionTier ?? undefined);

  return {
    ...org,
    id: org.id ?? fnThrow(`Found org with no id: ${JSON.stringify(org)}`),
    name: org.name,
    emailDomains: commaSeparatedToArray(org.emailDomains ?? undefined),
    subscriptionTier,
    isAWSMarketplace: subscriptionTier === SubscriptionTier.AwsMarketplace,
    awsMarketplaceMetadata:
      marketplaceMetadata !== null
        ? {
            awsMarketplaceProductCode: marketplaceMetadata.metadata?.awsMarketplaceProductCode ?? '',
            dimension: marketplaceMetadata.metadata?.dimension ?? MarketplaceDimensions.Free,
            expirationTime: new Date(marketplaceMetadata.metadata?.expirationTime ?? '').getTime(),
            expirationUpdateTime: new Date(marketplaceMetadata.metadata?.expirationUpdateTime ?? '').getTime(),
          }
        : undefined,
    notifications: {
      observatoryUrl: org.observatoryUrl,
    },
  };
};
