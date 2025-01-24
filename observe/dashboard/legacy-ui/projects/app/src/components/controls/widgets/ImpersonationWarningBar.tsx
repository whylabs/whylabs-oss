import { useNavigate } from 'react-router-dom';
import { useUserContext } from 'hooks/useUserContext';
import { SILENT_LOGIN_URI } from 'ui/constants';
import { useClearImpersonationMutation } from 'generated/graphql';
import { WarningBar } from 'components/design-system/banner/WarningBar';
import { timeLong } from 'utils/dateUtils';
import { useCallback, useState } from 'react';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

export const ImpersonationWarningBar: React.FC = () => {
  const { getCurrentUser, loading: userLoading } = useUserContext();
  const [clearImpersonation] = useClearImpersonationMutation();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const navigate = useNavigate();

  const currentUser = getCurrentUser();
  const { isActiveNow, expiration } = currentUser?.metadata?.masquerade ?? {};
  const userIsImpersonating = !!isActiveNow;

  const [isHidden, setIsHidden] = useState(false);

  const onClose = useCallback(() => {
    setIsHidden(true);
  }, []);

  const endSessionClickHandler = useCallback(() => {
    clearImpersonation()
      .then(() => {
        enqueueSnackbar({ title: 'Successfully ended user session. Redirecting to login page.', variant: 'info' });
        setTimeout(() => navigate(SILENT_LOGIN_URI), 1000);
      })
      .catch((err) => {
        const explanation = 'Failed to end user session';
        console.error(`${explanation}. ${err}`);
        enqueueErrorSnackbar({ err, explanation });
      });
  }, [clearImpersonation, enqueueSnackbar, enqueueErrorSnackbar, navigate]);

  if (userLoading || !userIsImpersonating || isHidden) {
    return null;
  }

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
