import { List, Stack, createStyles } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { WhyLabsTypography } from '~/components/design-system';
import WhyLabsAlert from '~/components/design-system/alert/WhyLabsAlert';
import { SafeLink } from '~/components/link/SafeLink';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { SubscriptionTier } from '~/types/userTypes';

import { useBillingIndexViewModel } from './useBillingIndexViewModel';

const useStyles = createStyles(() => ({
  pageContainer: {
    padding: 50,
  },
  alertText: {
    fontSize: 14,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: Colors.chartBlue,
  },
  lowerText: {
    fontSize: 16,
  },
  topMargin: {
    marginTop: 20,
  },
}));

export const BillingPageIndex: React.FC = () => {
  const { classes } = useStyles();

  const viewModel = useBillingIndexViewModel();
  const { currentPan, hasPricingData, managePaymentsLink, isCallAdminTier, planPricing, tier } = viewModel;

  useSetHtmlTitle('Billing');

  const renderTitle = () => (
    <WhyLabsTypography className={classes.alertTitle}>{`Current Plan: ${currentPan}`}</WhyLabsTypography>
  );

  const renderPrice = (): React.ReactNode => {
    // Temporarily disable showing price for the subscription plan.
    if (tier === SubscriptionTier.Free) {
      return (
        <WhyLabsTypography className={classes.alertText}>
          <span>Price: </span>
          {planPricing}
        </WhyLabsTypography>
      );
    }

    return null;
  };

  const planDetails = ((): React.ReactNode => {
    if (isCallAdminTier()) {
      return (
        <>
          <span>
            <SafeLink sameTab href="contactUs">
              Contact us
            </SafeLink>
          </span>
          <span> to discuss custom plan details.</span>
        </>
      );
    }

    if (tier === SubscriptionTier.Subscription) {
      return null;
    }

    if (tier === SubscriptionTier.Free) {
      return <span>2 resources</span>;
    }

    return null;
  })();

  const renderPlanDetails = (): React.ReactNode => {
    if (tier === SubscriptionTier.Subscription) {
      return null;
    }

    return (
      <WhyLabsTypography className={classes.alertText}>
        <span>Plan details: </span>
        {planDetails}
      </WhyLabsTypography>
    );
  };

  return (
    <div className={classes.pageContainer}>
      <WhyLabsAlert
        title={renderTitle()}
        icon={
          <IconInfoCircle
            style={{
              height: 18,
              color: Colors.chartBlue,
              width: 'fit-content',
            }}
          />
        }
      >
        <Stack justify="flex-start" spacing="xs" sx={{ gap: 0 }}>
          {renderPlanDetails()}
          {renderPrice()}
        </Stack>
      </WhyLabsAlert>
      {hasPricingData() && (
        <List withPadding className={classes.topMargin}>
          <List.Item>
            <WhyLabsTypography className={classes.lowerText}>
              <span>View invoices, manage payment methods, and update or cancel your plan in your payment portal </span>
              <span>
                <SafeLink href={managePaymentsLink}>here</SafeLink>
              </span>
              <span>.</span>
            </WhyLabsTypography>
          </List.Item>
          <List.Item>
            <WhyLabsTypography className={classes.lowerText}>
              <span>View all plans and pricing information on the WhyLabs website </span>
              <span>
                <SafeLink href="https://whylabs.ai/pricing">here</SafeLink>
              </span>
              <span>.</span>
            </WhyLabsTypography>
          </List.Item>
        </List>
      )}
    </div>
  );
};
