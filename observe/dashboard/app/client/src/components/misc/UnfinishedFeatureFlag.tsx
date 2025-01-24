import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { useFlags } from '~/hooks/useFlags';
import { IS_DEV_ENV, isLocalhost } from '~/utils/constants';
import { forceRedirectToOrigin } from '~/utils/oldStackUtils';
import { useState } from 'react';

import { WhyLabsButton, WhyLabsLoadingOverlay } from '../design-system';
import { PageContentWrapper } from '../page-padding-wrapper/PageContentWrapper';

const useStyles = createStyles(() => ({
  button: {
    backgroundColor: Colors.white,
  },
}));

type UnfinishedFeatureFlagProps = {
  children: JSX.Element;
};

export const UnfinishedFeatureFlag = ({ children }: UnfinishedFeatureFlagProps): JSX.Element => {
  const { classes } = useStyles();
  const flags = useFlags();
  const [displayContent, setDisplayContent] = useState(false);

  if (flags.isLoading) return <WhyLabsLoadingOverlay visible />;

  if (displayContent || isLocalhost) return children;

  if (flags.unfinishedFeatures || IS_DEV_ENV) {
    // TODO: display a toast/banner instead when we have it available on this project
    return (
      <PageContentWrapper>
        <header>
          <h1>Beta functionality</h1>
        </header>
        <main>
          <p>You may encounter bugs and incomplete functionality on this page.</p>
          <WhyLabsButton
            className={classes.button}
            color="gray"
            onClick={() => {
              setDisplayContent(true);
            }}
            variant="outline"
          >
            Continue
          </WhyLabsButton>
        </main>
      </PageContentWrapper>
    );
  }

  // In production force the redirect to the origin (old stack home)
  forceRedirectToOrigin();
  return <WhyLabsLoadingOverlay visible />;
};
