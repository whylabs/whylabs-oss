import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useMarketplaceMetadata } from './marketplace-metadata';
import { MarketplaceExpirationText } from './marketplace-expiration-text';

export const useMarketplaceExpirationWarning = (): void => {
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { component, isExpiringSoon: displaySnack } = useMarketplaceMetadata({
    render: ({ isExpired, expirationTime, isExpiringSoon }) => {
      if (!isExpiringSoon) {
        return null;
      }
      return <MarketplaceExpirationText expirationTime={expirationTime} isExpired={isExpired} />;
    },
  });

  if (!displaySnack) return;

  if (component) {
    enqueueSnackbar({
      title: component,
      autoClose: false,
      variant: 'warning',
      id: 'aws-marketplace-expiration-notification',
    });
  }
};
