import { useAuthNavigationHandler } from '~/hooks/useAuthNavigationHandler';
import { useUserContext } from '~/hooks/useUserContext';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { clearHeapSession } from '~/telemetry';
import { timeLong } from '~/utils/dateUtils';
import { trpc } from '~/utils/trpc';
import LogRocket from 'logrocket';
import { useCallback, useState } from 'react';

import { WarningBar } from './WarningBar';

export const ImpersonationWarningBar = () => {
  const { currentUser } = useUserContext();
  const { triggerSilentLogin } = useAuthNavigationHandler();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const [isHidden, setIsHidden] = useState(false);

  const clearImpersonationMutation = trpc.meta.user.clearImpersonation.useMutation();

  const { isActiveNow, expiration } = currentUser?.metadata?.masquerade ?? {};
  const userIsImpersonating = !!isActiveNow;

  const onClose = useCallback(() => {
    setIsHidden(true);
  }, []);

  const endSessionClickHandler = useCallback(() => {
    clearImpersonationMutation
      .mutateAsync()
      .then(() => {
        enqueueSnackbar({ title: 'Successfully ended user session. Redirecting to login page.' });
        clearHeapSession();
        triggerSilentLogin();
      })
      .catch((error) => {
        const explanation = 'Failed to end user session';
        LogRocket.error({ error, explanation });
        enqueueErrorSnackbar({ err: error, explanation });
      });
  }, [clearImpersonationMutation, enqueueErrorSnackbar, enqueueSnackbar, triggerSilentLogin]);

  if (!userIsImpersonating || isHidden) return null;

  const formattedExpirationTime = expiration ? timeLong(new Date(expiration).getTime()) : '';

  return (
    <WarningBar
      button={{ label: 'End session', onClick: endSessionClickHandler }}
      id="impersonation-status"
      onClose={onClose}
    >
      You are logged in as <span>{currentUser?.name}</span> ({currentUser?.email}/{currentUser?.whyLabsId}) in{' '}
      <span>{currentUser?.organization?.name}</span> ({currentUser?.organization?.id}) until {formattedExpirationTime}
    </WarningBar>
  );
};
