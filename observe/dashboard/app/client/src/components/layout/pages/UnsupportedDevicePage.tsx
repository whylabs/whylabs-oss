import { createStyles } from '@mantine/core';
import DogDialogUnsupportedDevice from '~/components/animated-components/whydog/whydog-dialog/DogDialogUnsupportedDevice';
import WhyDogIdle from '~/components/animated-components/whydog/WhyDogIdle';
import { WhyLabsButton } from '~/components/design-system';
import { useAuthNavigationHandler } from '~/hooks/useAuthNavigationHandler';

import { AttentionPageWrap } from '../AttentionPageWrap';

const useStyles = createStyles(() => ({
  logoutButton: {
    margin: '35px 0',
  },
}));

export const UnsupportedDevicePage = () => {
  const { classes } = useStyles();
  const { triggerLogout } = useAuthNavigationHandler();

  return (
    <AttentionPageWrap
      title="Screen size not supported!"
      subtitle="Try zooming out or widening this window"
      dog={<WhyDogIdle dialog={<DogDialogUnsupportedDevice />} />}
    >
      The WhyLabs Platform is best experienced on a desktop computer. Please try zooming out and maximizing the width of
      this window, or switch to another device.
      <WhyLabsButton className={classes.logoutButton} onClick={triggerLogout} variant="filled">
        Log out
      </WhyLabsButton>
    </AttentionPageWrap>
  );
};
