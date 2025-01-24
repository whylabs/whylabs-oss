import { createStyles } from '@mantine/core';
import { useCookies } from 'react-cookie';
import { Colors } from '@whylabs/observatory-lib';
import { IconX } from '@tabler/icons';
import { Link } from 'react-router-dom';
import { WhyLabsButton, WhyLabsText } from 'components/design-system';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageType } from 'pages/page-types/usePageType';
import { ONE_DAY_IN_MILLIS } from 'ui/constants';
import { numbersToText } from 'utils/numbersToText';

const useStyles = createStyles(() => ({
  root: {
    background: `linear-gradient(90.04deg, ${Colors.blue} 50%, ${Colors.blue} 100%);`,
    height: 40,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: Colors.white,
    padding: '0 8px 0 15px',
    borderTop: `1px solid rgba(255, 255, 255, 0.20);`,
  },
  faded: {
    opacity: 0.8,
  },
  hoverPop: {
    '&:hover': {
      opacity: 1,
    },
  },
  text: {
    fontFamily: `'Asap', sans-serif`,
    fontWeight: 400,
    fontSize: 14,
  },
  linkContainer: {
    marginLeft: 4,
  },
  link: {
    opacity: 0.8,
    color: Colors.white,
    textDecoration: 'none',
    '&:hover': {
      opacity: 1,
    },
  },
  linkText: {
    borderBottom: '1px dotted rgb(255, 255, 255)',
    display: 'inline-block',
  },
  buttonText: {
    fontWeight: 600,
    fontSize: 14,
  },
  content: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: 1,
  },
  bufferedLeft: {
    marginLeft: 8,
  },
  whiteButton: {
    color: Colors.white,
    borderColor: Colors.white,
  },
  sizedButton: {
    height: '30px',
  },
  restrictedWidthButton: {
    width: '30px',
    paddingLeft: 0,
    paddingRight: 0,
  },
}));

// If we allow this to vary, we can make it a prop
const expirationTimeText = 'within the next 30 days';
const cookieKey = 'stale-tokens-banner-dismissed';

interface StaleTokensProps {
  tokenCount: number;
}

export function StaleTokensBanner({ tokenCount }: StaleTokensProps): JSX.Element | null {
  const { classes, cx } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const [cookies, setCookie] = useCookies([cookieKey]);
  // Make dynamic if we want the snooze length to depend on plurality of batch frequency.
  const snoozeUnitLengthInMillis = ONE_DAY_IN_MILLIS;
  const pageType = usePageType();

  const maybeCookie = cookies[cookieKey];
  if (maybeCookie) {
    const dismissedTime = new Date(Number(maybeCookie)).valueOf();
    // Note: using Number.isNaN because an invalid date
    // returns NaN when calling valueOf(). Global isNaN allows
    // coercion.
    if (!Number.isNaN(dismissedTime)) {
      const now = new Date().valueOf();
      if (now - dismissedTime < 7 * snoozeUnitLengthInMillis) {
        return null;
      }
    }
  }

  const renderCallToAction = () => {
    if (pageType === 'accessToken') {
      return (
        <WhyLabsText inherit className={classes.text}>
          Find your expiring tokens in the table below.
        </WhyLabsText>
      );
    }
    return (
      <div className={classes.linkContainer}>
        <Link className={classes.link} to={getNavUrl({ page: 'settings', settings: { path: 'access-tokens' } })}>
          <WhyLabsText inherit className={cx(classes.text, classes.linkText)}>
            View expiring tokens.
          </WhyLabsText>
        </Link>
      </div>
    );
  };

  const snooze = () => {
    setCookie(cookieKey, new Date().getTime(), { sameSite: 'lax', secure: true });
  };
  // Make dynamic if we have dynamic ranges for snoozing
  const snoozeText = 'Snooze for 7 days';
  const tokenText = numbersToText(tokenCount);
  const cappedTokenText = tokenText.length > 0 ? tokenText.charAt(0).toUpperCase() + tokenText.slice(1) : '-';
  return (
    <div className={classes.root}>
      <div /> {/* Spacer */}
      <div className={classes.content}>
        <WhyLabsText inherit className={cx(classes.text, classes.faded)}>
          {cappedTokenText} of your API keys will expire {expirationTimeText}.
        </WhyLabsText>
        <div className={classes.bufferedLeft}>{renderCallToAction()}</div>
      </div>
      <WhyLabsButton
        variant="outline"
        className={cx(classes.whiteButton, classes.sizedButton, classes.restrictedWidthButton)}
        onClick={snooze}
        enabledTooltip={snoozeText}
      >
        <IconX size={24} />
      </WhyLabsButton>
    </div>
  );
}
