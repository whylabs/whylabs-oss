import { useAuthNavigationHandler } from 'hooks/usePageLinkHandler';
import { AttentionPageWrap } from 'pages/atention-page/AttentionPageWrap';
import WhyDogIdle from 'components/animated-components/whydog/WhyDogIdle';
import DogDialogQuestionMark from 'components/animated-components/whydog/whydog-dialog/DogDialogQuestionMark';
import { ReactNode } from 'react';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import ExternalLink from 'components/link/ExternalLink';

const useStyles = createStyles({
  link: {
    color: Colors.linkColor,
  },
});

export default function UnexpectedErrorPage(): JSX.Element {
  const { classes } = useStyles();
  const { triggerLogout } = useAuthNavigationHandler();

  return (
    <AttentionPageWrap
      title="Sorry about this!"
      dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
      subtitle="The server encountered an error when trying to load the page."
    >
      Our team has been notified. In the mean time you can try reloading the page, or clicking{' '}
      {renderLogoutLink('here')} to log out, then log back in again. Please{' '}
      <ExternalLink to="support">contact support</ExternalLink> if the problem persists.
    </AttentionPageWrap>
  );

  function renderLogoutLink(children: ReactNode) {
    return (
      <a
        className={classes.link}
        onClick={(event) => {
          event.preventDefault();
          triggerLogout();
        }}
        href="/logout"
      >
        {children}
      </a>
    );
  }
}
