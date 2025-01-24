import { useSearchAndHashParams } from '~/hooks/useSearchAndHashParams';
import { useUserContext } from '~/hooks/useUserContext';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { SubscriptionTier } from '~/types/userTypes';
import { IS_DEV_ENV } from '~/utils/constants';
import { useEffect, useState } from 'react';

export const useBillingIndexViewModel = () => {
  const { currentUser: user } = useUserContext();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [searchParams] = useSearchAndHashParams();

  const [tier, setTier] = useState<SubscriptionTier | null>(user?.organization?.subscriptionTier ?? null);

  const planDescriptionMap = new Map<SubscriptionTier, string>([
    [SubscriptionTier.Free, 'Starter Plan'],
    [SubscriptionTier.Subscription, 'Expert Plan'],
    [SubscriptionTier.Paid, 'Enterprise Plan'],
    [SubscriptionTier.AwsMarketplace, 'AWS Marketplace Plan'],
  ]);
  const upgraded = !!searchParams.get('upgrade');
  const currentPan = tier ? planDescriptionMap.get(tier) : '';

  useEffect(() => {
    if (!!user?.organization?.subscriptionTier && user.organization.subscriptionTier !== tier) {
      const updatedTier = user.organization.subscriptionTier;

      if ((upgraded || tier === SubscriptionTier.Free) && updatedTier === SubscriptionTier.Subscription) {
        enqueueSnackbar({ title: 'Successfully upgraded plan!' });
      }

      setTier(user.organization.subscriptionTier);
    }
  }, [tier, user?.organization?.subscriptionTier, enqueueSnackbar, upgraded]);

  const managePaymentsLink = IS_DEV_ENV
    ? 'https://pay.whylabs.ai/p/login/test_7sI8yj38FfvCdPO288'
    : 'https://pay.whylabs.ai/p/login/00g00D5RX9Gz87KcMM';

  const isCallAdminTier = (): boolean => {
    return tier === SubscriptionTier.Paid || tier === SubscriptionTier.AwsMarketplace;
  };

  const hasPricingData = (): boolean => {
    return tier === SubscriptionTier.Subscription || tier === SubscriptionTier.Free;
  };

  const planPricing = ((): React.ReactNode => {
    if (tier === SubscriptionTier.Subscription) {
      return null;
    }

    if (tier === SubscriptionTier.Free) {
      return <span>Free</span>;
    }

    return null;
  })();

  return {
    currentPan,
    hasPricingData,
    isCallAdminTier,
    managePaymentsLink,
    planDescriptionMap,
    planPricing,
    tier,
  };
};
