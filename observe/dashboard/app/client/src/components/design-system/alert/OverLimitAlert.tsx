import { createStyles } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import ExternalLink from '~/components/link/ExternalLink';
import { JSX } from 'react';
import { Link } from 'react-router-dom';

import WhyLabsAlert from './WhyLabsAlert';

interface OverLimitAlertProps {
  marginTop?: number;
  paymentsUrl: string | null;
}

const useStyles = createStyles((_, marginTop: number) => ({
  overLimitAlert: {
    marginBottom: 12,
    marginTop,
  },
}));

const OverLimitAlert = ({ marginTop = 0, paymentsUrl }: OverLimitAlertProps): JSX.Element => {
  const { classes } = useStyles(marginTop);

  const renderContent = () => {
    if (paymentsUrl) {
      return (
        <>
          Your current Starter Plan includes free monitoring and observability for two resources. Upgrade to the{' '}
          <Link to={paymentsUrl} id="upgrade-from-payments-banner">
            Expert plan
          </Link>{' '}
          to monitor additional resources. Additional plan information can be found{' '}
          <ExternalLink to="pricing" id="pricing-info-link-from-payments-banner">
            here
          </ExternalLink>
          .
        </>
      );
    }
    return (
      <>
        Your current Starter Plan includes two projects for free. Please{' '}
        <ExternalLink to="contactUs" id="contact-us-link-from-banner">
          contact us
        </ExternalLink>{' '}
        to upgrade to the Expert Plan. Additional plan information can be found{' '}
        <ExternalLink to="pricing" id="pricing-info-link-from-banner">
          here
        </ExternalLink>
        .
      </>
    );
  };

  return (
    <WhyLabsAlert
      className={classes.overLimitAlert}
      color="pink"
      backgroundColor={Colors.userAlertBackground}
      icon={
        <IconAlertTriangle
          size={18}
          style={{
            width: 'fit-content',
          }}
        />
      }
      title="Plan is over limits"
    >
      {renderContent()}
    </WhyLabsAlert>
  );
};

export default OverLimitAlert;
