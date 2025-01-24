import { WhyLabsButton } from 'components/design-system';

import { AttentionPageWrap } from 'pages/atention-page/AttentionPageWrap';
import WhyDogIdle from 'components/animated-components/whydog/WhyDogIdle';
import DogDialogUnsupportedDevice from 'components/animated-components/whydog/whydog-dialog/DogDialogUnsupportedDevice';
import { useAuthNavigationHandler } from 'hooks/usePageLinkHandler';
import { useUserContext } from 'hooks/useUserContext';
import { createStyles } from '@mantine/core';

const useStyles = createStyles(() => ({
  logoutButton: {
    margin: '0',
  },
}));

const UnsupportedDevicePage: React.FC = (): JSX.Element => {
  const { classes } = useStyles();
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const { triggerLogout } = useAuthNavigationHandler();

  return (
    <AttentionPageWrap
      title="Screen size not supported!"
      subtitle="Try zooming out or widening this window"
      dog={<WhyDogIdle dialog={<DogDialogUnsupportedDevice />} />}
    >
      <p>
        The WhyLabs Platform is best experienced on a desktop computer. Please try zooming out and maximizing the width
        of this window, or switch to another device.
      </p>
      {user?.isAuthenticated && (
        <WhyLabsButton className={classes.logoutButton} onClick={triggerLogout} variant="filled">
          Log out
        </WhyLabsButton>
      )}
    </AttentionPageWrap>
  );
};

export default UnsupportedDevicePage;
