import { Alert } from '@mantine/core';
import {
  WhyLabsSearchInput,
  WhyLabsSelect,
  WhyLabsSubmitButton,
  WhyLabsText,
  WhyLabsTextInput,
} from '~/components/design-system';
import { WhyLabsVerticalDivider } from '~/components/design-system/layout/WhyLabsVerticalDivider';
import { TitleValueWidget } from '~/components/header-widgets/TitleValueWidget';
import ExternalLink from '~/components/link/ExternalLink';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import useTypographyStyles from '~/styles/Typography';
import { Outlet, useOutletContext } from 'react-router-dom';

import { getSettingsPageTitle } from '../utils/settingsPageUtils';
import { UserManagementTable } from './components/UserManagementTable';
import { useUserManagementIndexStyle } from './useUserManagementIndexStyle';
import { useUserManagementIndexViewModel } from './useUserManagementIndexViewModel';

export function useUserManagementContext() {
  return useOutletContext<ReturnType<typeof useUserManagementIndexViewModel>>();
}

export const UserManagementIndex = () => {
  const { classes } = useUserManagementIndexStyle();

  const viewModel = useUserManagementIndexViewModel();
  const {
    filteredTeamMembers,
    isOverUserLimit,
    isLoading,
    isSaving,
    onChangeMemberRole,
    newMemberEmail,
    newMemberRole,
    rbacEnabled,
    selectedOrg,
    setMembersFilter,
  } = viewModel;

  useSetHtmlTitle(getSettingsPageTitle('orgIdSettingsUserManagement'));

  const { classes: typography } = useTypographyStyles();

  return (
    <>
      <div className={classes.root}>
        <div className={classes.content}>
          <div className={classes.contentSide}>
            <WhyLabsText inherit className={classes.title}>
              Add team members to the WhyLabs Platform
            </WhyLabsText>
            <WhyLabsText inherit className={classes.dialogText}>
              Team members will be added to the organization: <strong>{selectedOrg?.name}</strong>
            </WhyLabsText>
            {isOverUserLimit ? (
              <>
                <Alert variant="light" color="blue" className={classes.limitAlert}>
                  You need to remove an existing membership before you can add a new one. If you need more members than
                  are currently supported, please <ExternalLink to="contactLink">contact us</ExternalLink> to discuss
                  your needs.
                </Alert>
              </>
            ) : (
              <form className={classes.form} onSubmit={viewModel.onSubmit}>
                <div className={classes.formRow}>
                  <div className={classes.inputEmailContainer}>
                    <WhyLabsTextInput
                      id="emailAddressesInput"
                      className={classes.inputEmail}
                      disabled={isOverUserLimit}
                      label={
                        <>
                          Email addresses&nbsp;
                          <small>comma or semi-colon separated</small>
                        </>
                      }
                      onChange={viewModel.onChangeEmailsInput}
                      required
                      value={newMemberEmail}
                    />
                    <span className={typography.helperTextThin}>
                      The maximum number of emails that can be added at the same time is {viewModel.maxEmailThreshold}
                    </span>
                  </div>
                  {rbacEnabled && (
                    <WhyLabsSelect
                      data={viewModel.roleSelectOptions}
                      id="roleSelector"
                      label="Role"
                      onChange={onChangeMemberRole}
                      value={newMemberRole}
                    />
                  )}

                  {!rbacEnabled && (
                    <div style={{ marginTop: '16px' }}>
                      <WhyLabsText inherit className={classes.dialogText}>
                        Your account is only enabled for the Admin role. Contact{' '}
                        <ExternalLink to="support">WhyLabs support</ExternalLink> to learn more about role-based access
                        control.
                      </WhyLabsText>
                    </div>
                  )}
                  <div className={classes.buttonContainer}>
                    <WhyLabsSubmitButton disabled={!newMemberEmail || isOverUserLimit} loading={isSaving}>
                      Add email addresses
                    </WhyLabsSubmitButton>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
        <div className={classes.controlsRoot}>
          <div className={classes.controlsScrollableContainer}>
            {rbacEnabled && (
              <>
                <WhyLabsSearchInput
                  label="Quick search"
                  onChange={setMembersFilter}
                  placeholder="Filter by account name"
                />
                <WhyLabsVerticalDivider height={40} />
              </>
            )}
            <TitleValueWidget isLoading={isLoading} loadingSkeletonProps={{ width: 30 }} title="Total users">
              {filteredTeamMembers.length}
            </TitleValueWidget>
          </div>
        </div>
        <div className={classes.tableRoot}>
          <UserManagementTable viewModel={viewModel} />
        </div>
      </div>
      <Outlet context={viewModel} />
    </>
  );
};
