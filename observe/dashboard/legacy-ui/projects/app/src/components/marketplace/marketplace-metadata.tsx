import { useMarketplaceMetadataQuery } from 'generated/graphql';

interface MarketplaceRenderProps {
  readonly expirationTime: number;
  readonly isExpired: boolean;
  readonly isExpiringSoon: boolean;
}

interface MarketplaceMetadataProps {
  readonly render: (props: MarketplaceRenderProps) => JSX.Element | null;
}

const fiveDaysMs = 432_000_000;

type MarketplaceMetadataReturnType = {
  component: JSX.Element | null;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  expirationTime?: number;
};

const emptyReturn = {
  component: null,
};

export function useMarketplaceMetadata(props: MarketplaceMetadataProps): MarketplaceMetadataReturnType {
  const { render } = props;
  const { data, loading, error } = useMarketplaceMetadataQuery();

  if (loading) {
    return emptyReturn;
  }

  if (error) {
    return emptyReturn;
  }

  // Then it isn't a marketplace org
  if (data?.user.organization?.isAWSMarketplace !== true) {
    return emptyReturn;
  }

  // This shouldn't happen
  const marketplaceMetadata = data.user.organization.awsMarketplaceMetadata;
  if (marketplaceMetadata === undefined || marketplaceMetadata === null) {
    return emptyReturn;
  }

  const now = new Date().getTime();
  const isExpired = marketplaceMetadata.expirationTime <= new Date().getTime();
  const isExpiringSoon = now >= marketplaceMetadata.expirationTime - fiveDaysMs;
  const { expirationTime } = marketplaceMetadata;

  return {
    component: render({
      expirationTime,
      isExpired,
      isExpiringSoon,
    }),
    isExpired,
    isExpiringSoon,
    expirationTime,
  };
}
