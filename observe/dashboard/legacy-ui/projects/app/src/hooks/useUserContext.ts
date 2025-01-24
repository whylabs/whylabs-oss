import { ApolloError } from '@apollo/client';
import { useContext, useEffect, useRef } from 'react';
import { UserContext, UserState } from 'UserContext';
import { getDomain } from '@whylabs/observatory-lib';
import { CurrentUser } from 'types/userTypes';
import _isEqual from 'lodash/isEqual';
import { useUser } from './useUser';

export type UseUserContextReturnType = {
  logout: () => void;
  isWhyLabsUser: () => boolean;
  getCurrentUser: () => CurrentUser;
  userState: UserState;
  loading: boolean;
  error: ApolloError | undefined;
  canManageDatasets: boolean;
};

export function useUserContext(): UseUserContextReturnType {
  const [userState, userDispatch] = useContext(UserContext);
  if (userDispatch === undefined) {
    throw new Error('Cannot use context outside of provider');
  }
  const { loading, error, user, canManageDatasets } = useUser();
  const switchingOrgs = useRef(false);

  useEffect(() => {
    if (userState.user?.organization?.id && loading) {
      // The above is an indicator that someone may have changed the org.
      switchingOrgs.current = true;
    }
    if (!loading && user?.organization?.id && _isEqual(userState.user?.organization?.id, user?.organization?.id)) {
      // We were loading, but this isn't an initialization state and no change has been made.
      switchingOrgs.current = false;
    }
    const noticedChange = !loading && !error && !_isEqual(userState.user, user);
    const noticedOrgChange = user?.organization?.id && switchingOrgs.current;
    const isInitialState = !userState.user?.organization?.id;
    if (noticedChange && (noticedOrgChange || isInitialState)) {
      // If there is no org ID in userState, then we are in an initialization state.
      userDispatch({ user });
      switchingOrgs.current = false;
    }
  }, [loading, error, user, userDispatch, userState.user]);

  function isWhyLabsUser() {
    return getDomain(userState?.user?.email || '') === 'whylabs';
  }

  function getCurrentUser(): CurrentUser {
    return userState.user ?? null;
  }

  function logout() {
    userDispatch({});
  }

  return { logout, isWhyLabsUser, getCurrentUser, userState, loading, error, canManageDatasets };
}
