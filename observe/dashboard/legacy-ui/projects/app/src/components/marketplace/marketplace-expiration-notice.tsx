import { MarketplaceExpirationText } from './marketplace-expiration-text';
import { useMarketplaceMetadata } from './marketplace-metadata';

export function MarketplaceNotice(): JSX.Element {
  const { component } = useMarketplaceMetadata({
    render: ({ isExpired, expirationTime }) => {
      return <MarketplaceExpirationText expirationTime={expirationTime} isExpired={isExpired} variant="light" />;
    },
  });

  return <>{component}</>;
}
