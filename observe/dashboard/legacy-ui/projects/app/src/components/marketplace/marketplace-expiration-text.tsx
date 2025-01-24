import { createStyles } from '@mantine/core';
import { Colors, SafeLink } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';
import { dateOnly } from 'utils/dateUtils';

const useStyles = createStyles((_, variant: MarketplaceExpirationTextProps['variant']) => ({
  root: {
    maxWidth: 250,
    color: variant === 'light' ? Colors.white : Colors.gray900,
  },
}));

function getMarketplaceLink() {
  // TODO make it different for dev
  return 'https://aws.amazon.com/marketplace/pp/prodview-jes5hqwo3nvw4?sr=0-1&amp;ref_=beagle&amp;applicationId=AWSMPContessa';
}

export interface MarketplaceExpirationTextProps {
  readonly isExpired: boolean;
  readonly expirationTime: number;
  variant?: 'light' | 'dark';
}

export function MarketplaceExpirationText(props: MarketplaceExpirationTextProps): JSX.Element {
  const { isExpired, expirationTime, variant } = props;
  const expirationTimeString = dateOnly(expirationTime);
  const link = getMarketplaceLink();
  const { classes } = useStyles(variant);
  const expireText = isExpired ? 'expired' : 'expires';
  return (
    <WhyLabsText inherit className={classes.root}>
      <SafeLink href={link}>AWS Marketplace</SafeLink> subscription {expireText} on {expirationTimeString}
    </WhyLabsText>
  );
}
