import { Button, Link, useMediaQuery } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { ErrorPage } from 'pages/errors/ErrorPage';

import { useCheckAuth0EmailVerificationQuery, useResendVerificationEmailMutation } from 'generated/graphql';
import { SILENT_LOGIN_URI } from 'ui/constants';

import noDataBackground from 'ui/noDataBackground.svg';
import noDataCubesLeft from 'ui/noDataCubesLeft.svg';
import noDataCubesRight from 'ui/noDataCubesRight.svg';
import ExternalLink from 'components/link/ExternalLink';
import { useAuthNavigationHandler } from 'hooks/usePageLinkHandler';
import { customMantineTheme } from 'ui/customMantineTheme';
import { WhyLabsText } from 'components/design-system';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

export const useStyles = createStyles({
  root: {
    backgroundImage: `url(${noDataCubesLeft}), url(${noDataCubesRight}), url(${noDataBackground})`,
    backgroundPosition: 'left top, right top, center',
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
    backgroundSize: '465px 419px, 261px 367px, cover',
  },
  commonText: {
    fontFamily: 'Asap',
    color: Colors.secondaryLight1000,
    fontSize: 22,
    lineHeight: 1.36,
  },
  lightText: {
    fontSize: 18,
    fontFamily: 'Asap',
    lineHeight: 1.67,
    color: Colors.secondaryLight700,
    marginTop: 20,
  },
  linkText: {
    color: Colors.linkColor,
    fontFamily: 'Asap',
    textDecoration: 'underline',
  },
  resendButton: {
    background: Colors.yellow,
    color: Colors.secondaryLight1000,
    fontSize: 14,
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 8,
    paddingBottom: 8,
  },
  bottomText: {
    fontSize: 14,
    lineHeight: 1.67,
    paddingTop: 36,
    color: Colors.secondaryLight1000,
    flexGrow: 1,
  },
});

const UnverifiedEmailPage: React.FC = () => {
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { classes: styles, cx } = useStyles();

  // check user state every few seconds
  const pollInterval = 3000;
  const { data, loading: userLoading } = useCheckAuth0EmailVerificationQuery({ pollInterval });
  const [resendEmail, { loading: emailPending }] = useResendVerificationEmailMutation();
  const { getLogoutUri } = useAuthNavigationHandler();

  const user = data?.user;
  const userEmail = user?.email;
  const emailVerified = !!user?.auth0EmailVerified;

  // Check if it's a mobile device based in theme breakpoints
  const mobileDeviceBreakpointSize = customMantineTheme.breakpoints ? customMantineTheme.breakpoints.md : '62em';
  const isMobile = useMediaQuery(`(max-width: ${mobileDeviceBreakpointSize})`);

  const handleClickResendEmail = () =>
    resendEmail()
      .then(() => {
        enqueueSnackbar({ title: 'A new verification email has been sent.', variant: 'info' });
      })
      .catch(() => {
        enqueueSnackbar({
          title: `There was a problem sending a new verification email. WhyLabs has been notified.`,
          variant: 'error',
        });
        console.error(`Failed to send a new verification email for user ${user?.auth0Id}`);
      });

  // still fetching user data, don't display anything
  if (userLoading) return null;

  // once (or if) the email has been verified, allow the user to proceed to the rest of the app
  if (emailVerified) {
    return (
      <ErrorPage rootStyleUpdate={styles.root} pageTitle="Congratulations!" showLogo showDarkLogo styledHeader>
        <WhyLabsText inherit className={styles.commonText}>
          Your email is now verified, and you are ready to use the platform!
        </WhyLabsText>
        <br />
        <WhyLabsText inherit>
          <Link className={cx(styles.commonText, styles.linkText)} href={SILENT_LOGIN_URI}>
            {isMobile ? 'Continue to Get Started' : 'Continue to the dashboard'}
          </Link>
        </WhyLabsText>
      </ErrorPage>
    );
  }

  // otherwise ask the user to verify their email
  return (
    <ErrorPage pageTitle="Hang on!" rootStyleUpdate={styles.root} showLogo showDarkLogo styledHeader>
      <div>
        <WhyLabsText inherit className={styles.commonText}>
          It looks like you haven&apos;t verified your email yet.
        </WhyLabsText>
        <WhyLabsText inherit className={styles.lightText}>
          Please check your inbox for the verification link: <span style={{ whiteSpace: 'nowrap' }}>{userEmail}</span>
        </WhyLabsText>
        <br />
        <Button disabled={emailPending} className={styles.resendButton} onClick={handleClickResendEmail}>
          Resend verification email
        </Button>
        <WhyLabsText inherit className={styles.bottomText}>
          If you don&apos;t receive the email within a couple of minutes, please ensure that you entered your email
          address correctly and check your spam folder.
        </WhyLabsText>
        <WhyLabsText inherit className={styles.bottomText}>
          To sign up with a different address, please{' '}
          <Link className={styles.linkText} href={getLogoutUri()}>
            log out
          </Link>
          . For help, please contact{' '}
          <ExternalLink className={styles.linkText} to="support">
            WhyLabs support
          </ExternalLink>
          .
        </WhyLabsText>
      </div>
    </ErrorPage>
  );
};

export default UnverifiedEmailPage;
