import {
  Button,
  CircularProgress,
  debounce,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@material-ui/core';
import { AlertTitle } from '@material-ui/lab';
import Alert from '@material-ui/lab/Alert';
import CustomTextInput from 'components/form-fields/CustomTextInput';
import ExternalLink from 'components/link/ExternalLink';
import {
  MembershipRole,
  SubscriptionTier,
  useAddUserToOrganisationMutation,
  useGetUsersOrganizationMembersQuery,
  useUpdateMemberMutation,
} from 'generated/graphql';
import { useCallback, useMemo, useState } from 'react';
import useTypographyStyles from 'styles/Typography';
import { orgMembershipLimit } from 'limits';
import { SelectAutoCompleteWithLabel } from 'components/select-autocomplete/SelectAutoCompleteWithLabel';
import { ISelectItem } from 'components/select-autocomplete/SelectAutoComplete';
import { useUserContext } from 'hooks/useUserContext';
import { WhyLabsSearchInput, WhyLabsText } from 'components/design-system';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { uniq } from 'ramda';
import TableRowForEdit, { LoadingField, TableRowSkeleton } from './TableRowForEdit';
import { userSettingsPageContentStyles } from '../utils/settingsPageUtils';

const MAX_EMAIL_THRESHOLD = 100;

function userLimitReached(n: number, tier: SubscriptionTier | null | undefined) {
  return n >= orgMembershipLimit && tier !== SubscriptionTier.Paid;
}

interface AddButtonProps {
  readonly loading: boolean;
  readonly emailString: string;
  readonly userCount: number;
  readonly tier?: SubscriptionTier | null;
}
function AddButton(props: AddButtonProps) {
  const { classes } = userSettingsPageContentStyles();
  const { loading, emailString, userCount, tier } = props;

  if (userLimitReached(userCount, tier)) {
    return (
      <Alert severity="info" className={classes.limitAlert}>
        <AlertTitle>User limit reached</AlertTitle>
        You need to remove an existing membership before you can add a new one. If you need more members than currently
        supported, please <ExternalLink to="contactLink">contact us</ExternalLink> to discuss your needs.
      </Alert>
    );
  }

  return (
    <Button
      className={classes.submitBtn}
      variant="outlined"
      color="primary"
      type="submit"
      disabled={emailString.length < 1 || loading}
    >
      <span>Add email addresses </span>
      {loading && <CircularProgress size={20} />}
    </Button>
  );
}

const getStructureForSelectValues = (): ISelectItem[] =>
  Object.keys(MembershipRole)
    .filter((r) => r !== MembershipRole.Unknown)
    .map((r) => ({
      label: r,
      value: r,
      disabled: false,
      autoSelect: false,
    }));

export const INVITE_USER_SECTION_TEST_ID = 'user-settings-invite-user-section';
export const USER_TABLE_SECTOPM_TEST_ID = 'user-settings-user-table-section';
export default function UserSettingsPageContentArea(): JSX.Element {
  const { classes, cx } = userSettingsPageContentStyles();

  useSetHtmlTitle('User management');

  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(true);
  const [membersFilter, setMembersFilter] = useState('');
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const tier = user?.organization?.subscriptionTier;
  const {
    data: userOrganisationMembers,
    loading: userOrganisationMembersLoading,
    refetch,
  } = useGetUsersOrganizationMembersQuery();
  const [multipleAddLoading, setMultipleAddLoading] = useState<boolean>(false);
  const [addUserToOrg] = useAddUserToOrganisationMutation();
  const [changedUsers, setChangedUsers] = useState<{ email: string; role: MembershipRole }[]>([]);
  const [updatingUsers, setUpdatingUsers] = useState<boolean>(false);
  const [updateMember] = useUpdateMemberMutation();
  const memberCount = userOrganisationMembers?.user.organization?.members?.length ?? 0;
  const [emailString, setEmailString] = useState<string>('');
  const rbacEnabled = true;
  const initialRole = rbacEnabled ? MembershipRole.Member : MembershipRole.Admin;
  const [role, setRole] = useState<ISelectItem>({
    label: initialRole,
    value: initialRole,
    disabled: false,
  });
  const { classes: typography } = useTypographyStyles();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const filteredTeamMembers = userOrganisationMembers?.user.organization?.members
    ? userOrganisationMembers.user.organization.members.filter(
        (member) =>
          member.email.toLowerCase().includes(membersFilter.toLowerCase()) ||
          member.role.toLowerCase().includes(membersFilter.toLowerCase()),
      )
    : userOrganisationMembers?.user.organization?.members;

  const [selectRoleTypeValues] = useState(getStructureForSelectValues());

  function getEmails(): { newEmails: string[]; alreadyAddedEmails: string[] } {
    const members = userOrganisationMembers?.user.organization?.members;
    const emailList = uniq(emailString.split(/;|,/).map((email) => email.trim().toLocaleLowerCase()));
    const emails = emailList.filter((email) => !!email);
    const addedEmails: string[] = []; // List of all emails that were already added;

    if (!members?.length) return { newEmails: emails, alreadyAddedEmails: addedEmails };

    const alreadyAddedEmails = new Set(members.map((member) => member.email));
    const filteredEmails = emails.filter((email) => {
      const isEmailAdded = alreadyAddedEmails.has(email);
      if (isEmailAdded) addedEmails.push(email);

      return !isEmailAdded; // Don't return already added emails
    });

    return { newEmails: filteredEmails, alreadyAddedEmails: addedEmails };
  }

  const addEmails = async (emails: string[]): Promise<void> => {
    const succeededEmails = new Set<string>();
    const failedReasons = new Map<string, string>();
    setMultipleAddLoading(true);
    const addRequests = emails.map(async (email) => {
      try {
        await addUserToOrg({ variables: { email, role: role.value as MembershipRole } });
        succeededEmails.add(email);
      } catch (err) {
        if (err instanceof Error) {
          failedReasons.set(email, err.message);
        } else {
          failedReasons.set(email, 'Unknown error');
        }
      }
    });
    await Promise.all(addRequests);
    await refetch().catch((err) => {
      console.log('Failed to refetch members after adding email', err);
      enqueueSnackbar({
        title: `Failed to load members`,
        variant: 'error',
      });
    });
    setMultipleAddLoading(false);

    if (succeededEmails.size) {
      enqueueSnackbar({
        title:
          succeededEmails.size === 1
            ? 'Successfully added 1 email.'
            : `Successfully added ${succeededEmails.size} emails.`,
        variant: 'success',
      });
    }
    if (failedReasons.size > 0) {
      failedReasons.forEach((reason, email) => {
        enqueueSnackbar({
          title: `Failed to add ${email}: ${reason}`,
          variant: 'error',
        });
      });
    }
  };

  const debounceHandleHappenedChange = useMemo(
    () =>
      debounce((email: string, updatedRole: MembershipRole) => {
        const existingIndex = changedUsers.findIndex((u) => u.email === email);
        const updatedUser = { email, role: updatedRole };
        if (existingIndex >= 0) {
          const changedUsersCopy = [...changedUsers];
          changedUsersCopy[existingIndex] = updatedUser;
          setChangedUsers(changedUsersCopy);
        } else {
          setChangedUsers((prevState) => [...prevState, updatedUser]);
        }
      }, 500),
    [changedUsers],
  );

  const handleHappenedChange = useCallback(
    (email: string, updatedRole: MembershipRole) => debounceHandleHappenedChange(email, updatedRole),
    [debounceHandleHappenedChange],
  );

  async function handleUpdateUsers() {
    const failedUpdates: string[] = [];

    async function updateUser(email: string, newRole: MembershipRole) {
      await updateMember({ variables: { email, role: newRole } }).catch(() => {
        failedUpdates.push(email);
      });
    }

    const updates = changedUsers.map((updatedUser) => updateUser(updatedUser.email, updatedUser.role));
    if (!updates.length) return;

    setUpdatingUsers(true);
    await Promise.all(updates).finally(async () => {
      if (failedUpdates.length > 0) {
        enqueueSnackbar({
          title: `Failed to update some member roles:`,
          description: failedUpdates.join(', '),
          variant: 'error',
        });
      } else {
        enqueueSnackbar({
          title: 'Member roles updated successfully',
        });
      }
      if (refetch) {
        await refetch();
      }
      setChangedUsers([]);
      setIsEditing(false);
      setUpdatingUsers(false);
    });
  }

  function isRowLoading(email: string): LoadingField {
    const loader: LoadingField = { isLoading: false, cause: 'unknown' };

    changedUsers.forEach((changedUser) => {
      if (changedUser.email === email && updatingUsers) {
        loader.cause = 'update';
        loader.isLoading = true;
      }
    });
    return loader;
  }

  const handleSubmit = () => {
    const { newEmails, alreadyAddedEmails } = getEmails();
    if (alreadyAddedEmails.length) {
      const message =
        alreadyAddedEmails.length === 1
          ? `${alreadyAddedEmails[0]} is already in this organization`
          : `The following emails have already been added: ${alreadyAddedEmails.join(', ')}`;
      enqueueSnackbar({
        title: message,
        variant: alreadyAddedEmails.length === 1 ? 'info' : 'success',
      });
    }
    if (newEmails.length === 0) return;

    if (newEmails.length < MAX_EMAIL_THRESHOLD) addEmails(newEmails);
    else
      enqueueSnackbar({
        title: `The maximum number of emails that can be added at the same time is ${MAX_EMAIL_THRESHOLD}`,
        variant: 'error',
      });
  };

  return (
    <div className={classes.pageRootWrap}>
      <div className={classes.pageRoot}>
        <div className={classes.contentSide} data-testid={INVITE_USER_SECTION_TEST_ID}>
          <WhyLabsText inherit className={classes.title}>
            Add team members to the WhyLabs Platform
          </WhyLabsText>
          <WhyLabsText inherit className={classes.dialogText}>
            Team members will be added to the organization:{' '}
            <strong className={classes.strong}>{user?.organization?.name}</strong>
          </WhyLabsText>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div>
              <CustomTextInput
                id="emailAddressesInput"
                disabled={userLimitReached(memberCount, tier)}
                value={emailString}
                multiline
                onChange={(e) => {
                  const newInput = e.target.value;
                  const newLastChar = newInput[newInput.length - 1];
                  const previousLastChar = emailString[emailString.length - 1];
                  const matchesSpecialChar = newLastChar === ';' || newLastChar === ',';

                  // Adds extra space if we match special char
                  if (matchesSpecialChar && previousLastChar !== ' ') setEmailString(`${newInput} `);
                  else setEmailString(newInput);
                }}
                label={
                  <>
                    Email addresses&nbsp;
                    <span style={{ fontWeight: 300, fontSize: 12 }}>comma or semi-colon separated</span>
                  </>
                }
              />
              <span className={typography.helperTextThin}>
                The maximum number of emails that can be added at the same time is {MAX_EMAIL_THRESHOLD}
              </span>
            </div>
            {rbacEnabled && (
              <div className={classes.selectWrap}>
                <SelectAutoCompleteWithLabel
                  id="inputRoleAutoComplete"
                  options={selectRoleTypeValues}
                  disabled={!rbacEnabled}
                  label={<span className={classes.textLabel}>Role</span>}
                  onChange={(changeEvent) => setRole(changeEvent as ISelectItem)}
                  placeholder="Select"
                  value={role}
                />
              </div>
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
            <AddButton emailString={emailString} loading={multipleAddLoading} userCount={memberCount} tier={tier} />
          </form>
        </div>

        <div className={classes.contentSide} data-testid={USER_TABLE_SECTOPM_TEST_ID}>
          <>
            <div className={classes.tableSide}>
              <WhyLabsText inherit className={cx(classes.title, classes.tableTitle)}>
                <span>Team members ({filteredTeamMembers?.length || 0}) </span>{' '}
                {userOrganisationMembersLoading && <CircularProgress size={10} />}
              </WhyLabsText>
              {rbacEnabled && (
                <div className={classes.tableHeaderWrap}>
                  <div className={classes.searchMembersInput}>
                    <WhyLabsSearchInput
                      label="Accounts"
                      hideLabel
                      onChange={setMembersFilter}
                      variant="borderless"
                      placeholder="Type something"
                    />
                  </div>
                  <div>
                    {isEditing ? (
                      <>
                        <Button
                          className={cx({
                            [classes.submitBtn]: true,
                            [classes.submitBtnSmall]: true,
                            [classes.submitBtnDisabled]: hasChanges,
                          })}
                          variant="outlined"
                          color="primary"
                          type="submit"
                          onClick={() => {
                            handleUpdateUsers();
                            setHasChanges(true);
                          }}
                          disabled={hasChanges}
                        >
                          Save changes
                          {/* generateLoading && */}
                          {updatingUsers && <CircularProgress style={{ marginLeft: 12 }} size={14} />}
                        </Button>
                        <Button
                          className={classes.grayButton}
                          variant="outlined"
                          onClick={() => {
                            setChangedUsers([]);
                            setIsEditing(false);
                            setHasChanges(true);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        className={classes.grayButton}
                        variant="outlined"
                        onClick={() => {
                          setIsEditing(true);
                        }}
                      >
                        Edit roles
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <TableContainer className={classes.tableContainer}>
                <Table className={classes.table} aria-label="customized table">
                  <TableHead>
                    <TableRow>
                      <TableCell className={cx(classes.tableItemText, classes.tableItemFirstColumHead)}>
                        Account
                      </TableCell>
                      <TableCell className={classes.tableItemText}>Role</TableCell>
                      <TableCell className={classes.tableItemBtn} align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userOrganisationMembersLoading &&
                      !userOrganisationMembers?.user.organization &&
                      Array.from({ length: 12 }).map((_, skeletonIndex) => (
                        /* eslint-disable react/no-array-index-key */
                        <TableRowSkeleton key={`skeleton-row-${skeletonIndex}`} classes={classes} />
                      ))}
                    {filteredTeamMembers?.map((member) => (
                      <TableRowForEdit
                        key={`member-id-${member.email}`}
                        loading={isRowLoading(member.email)}
                        isEditing={isEditing}
                        member={member}
                        setHasChanges={setHasChanges}
                        selectRoleTypeValues={selectRoleTypeValues}
                        handleHappenedChange={handleHappenedChange}
                        refetch={refetch}
                        searchTerm={membersFilter}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </>
        </div>
      </div>
    </div>
  );
}
