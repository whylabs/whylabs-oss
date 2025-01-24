import { CopyButton } from '@mantine/core';
import { IconClipboardCheck, IconClipboardCopy } from '@tabler/icons-react';
import { WhyLabsButton, WhyLabsText } from '~/components/design-system';
import WhyLabsTitle from '~/components/design-system/typography/WhyLabsTitle';
import { useOrgId } from '~/hooks/useOrgId';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';

import { getSettingsPageTitle } from '../utils/settingsPageUtils';
import { AccessTokenForm } from './components/AccessTokenForm';
import { AccessTokensTable } from './components/AccessTokensTable';
import { useAccessTokensIndexStyle } from './useAccessTokensIndexStyle';
import { useAccessTokensIndexViewModel } from './useAccessTokensIndexViewModel';

export const AccessTokensIndex = () => {
  const { classes, cx } = useAccessTokensIndexStyle();
  const orgId = useOrgId();

  useSetHtmlTitle(getSettingsPageTitle('orgIdSettingsAccessToken'));

  const viewModel = useAccessTokensIndexViewModel();
  const { canManageAccount, createdAccessToken, generateAccessToken, isSaving } = viewModel;

  return (
    <div className={classes.root}>
      <div className={classes.content}>
        <WhyLabsTitle element="h2" className={classes.title}>
          {canManageAccount ? 'Add an access token for account management' : 'Add an access token'}
        </WhyLabsTitle>
        <WhyLabsText className={classes.blockText}>
          {canManageAccount
            ? 'You can generate access tokens for automated identity provisioning via WhyLabs SCIM API'
            : 'You can generate access tokens for each ML application you use that needs access to the WhyLabs API.'}
        </WhyLabsText>
        <WhyLabsText className={classes.blockText}>
          {canManageAccount
            ? 'Enter a name and we will return a unique access token.'
            : 'Enter the name of your application below, and we will return a unique access token.'}
        </WhyLabsText>
        <AccessTokenForm className={classes.form} isSaving={isSaving} onSubmit={generateAccessToken} />
      </div>

      {createdAccessToken && (
        <div className={classes.content}>
          <div>
            <WhyLabsTitle element="h2" className={classes.title}>
              New access token
            </WhyLabsTitle>
            <div className={classes.newAccessTokenWrap}>
              <input
                readOnly
                className={classes.newAccessTokenInput}
                value={createdAccessToken}
                aria-describedby="createdTokenId-text"
                required
              />
              <CopyButton value={createdAccessToken}>
                {({ copied, copy }) => (
                  <WhyLabsButton
                    leftIcon={copied ? <IconClipboardCheck size={16} /> : <IconClipboardCopy size={16} />}
                    onClick={copy}
                    variant="filled"
                  >
                    Copy
                  </WhyLabsButton>
                )}
              </CopyButton>
            </div>
            <div className={cx(classes.blockText, classes.tokenHelperTextWrapper)}>
              <WhyLabsText className={classes.blockText}>
                <span className={classes.bulletPoint}>•</span> Make sure you save the token, as you won’t be able to
                access it again after closing the page
              </WhyLabsText>
              <WhyLabsText className={classes.blockText}>
                <span className={classes.bulletPoint}>•</span> You will need to reference the org ID{' '}
                <strong>&quot;{orgId}&quot;</strong> when using the token
              </WhyLabsText>
            </div>
          </div>
        </div>
      )}
      <AccessTokensTable viewModel={viewModel} />
    </div>
  );
};
