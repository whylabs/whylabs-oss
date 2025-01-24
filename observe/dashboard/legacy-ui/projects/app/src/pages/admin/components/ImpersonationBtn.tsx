import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheckEmailVerifiedLazyQuery, useImpersonateUserMutation } from 'generated/graphql';
import { SILENT_LOGIN_URI } from 'ui/constants';
import { canAccessInternalAdmin } from 'utils/permissionUtils';
import { useUserContext } from 'hooks/useUserContext';
import { WhyLabsButton, WhyLabsModal, WhyLabsText } from 'components/design-system';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

const isImpersonationDurationValid = (duration: string): boolean => !!duration.length && !Number.isNaN(+duration);

type ImpersonationBtnProps = {
  userId: string;
  orgId: string;
  email: string;
};

export const ImpersonationBtn: React.FC<ImpersonationBtnProps> = ({ userId, orgId, email }) => {
  const [impersonateUser] = useImpersonateUserMutation();
  const [checkEmailVerified, { data, loading }] = useCheckEmailVerifiedLazyQuery({ variables: { email } });
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const navigate = useNavigate();

  const [isUserImpersonationViewOpen, setIsUserImpersonationViewOpen] = useState<boolean>(false);
  const [impersonationDurationHours, setImpersonationDurationHours] = useState<string>('1');

  const { getCurrentUser } = useUserContext();

  // must have Whylabs admin access to view this page
  if (!canAccessInternalAdmin(getCurrentUser())) {
    return null;
  }

  const handleImpersonateUser = (): void => {
    setIsUserImpersonationViewOpen(true);
    checkEmailVerified();
  };

  const handleCloseUserImpersonationView = (): void => {
    setIsUserImpersonationViewOpen(false);
  };

  const handleConfirmUserImpersonation = async (): Promise<void> => {
    if (!isImpersonationDurationValid(impersonationDurationHours)) {
      enqueueSnackbar({ title: `${impersonationDurationHours} is not a valid duration`, variant: 'error' });
      return;
    }
    impersonateUser({
      variables: {
        userId,
        durationMinutes: parseInt(impersonationDurationHours, 10) * 60,
      },
    })
      .then(() => {
        enqueueSnackbar({ title: 'Impersonation successful. Redirecting to login page.' });
        setTimeout(() => navigate(SILENT_LOGIN_URI), 1000);
      })
      .catch((err) =>
        enqueueSnackbar({ title: 'Failed to impersonate user', description: err.message, variant: 'error' }),
      );
  };

  const title = `Confirm impersonation${data?.admin?.checkAuth0Verified ? '' : ' - USER HAS UNVERIFIED EMAIL'}`;
  return (
    <>
      <WhyLabsButton size="xs" variant="outline" color="primary" onClick={handleImpersonateUser}>
        Impersonate
      </WhyLabsButton>
      <WhyLabsModal
        title={title}
        opened={isUserImpersonationViewOpen && !loading}
        onClose={handleCloseUserImpersonationView}
        size="lg"
        centered
      >
        <WhyLabsText>Impersonate the following user?</WhyLabsText>
        <br />
        <WhyLabsText>ID: {userId}</WhyLabsText>
        <WhyLabsText>Org: {orgId}</WhyLabsText>
        <WhyLabsText>Email: {email}</WhyLabsText>
        Duration (hours) (maximum: 8){' '}
        <input
          style={{ marginRight: 8, height: 30 }}
          value={impersonationDurationHours}
          onChange={(e) => setImpersonationDurationHours(e.target.value)}
        />
        <WhyLabsButton size="xs" variant="outline" color="primary" onClick={() => handleConfirmUserImpersonation()}>
          Confirm
        </WhyLabsButton>
      </WhyLabsModal>
    </>
  );
};
