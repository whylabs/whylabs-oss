import { useGetMaintenanceBannerQuery } from 'generated/graphql';
import { WarningBar } from 'components/design-system/banner/WarningBar';
import { format } from 'date-fns-tz';
import { hourlyGraphFormat } from 'utils/dateUtils';
import { useUserContext } from 'hooks/useUserContext';

export const MaintenanceWarningBar: React.FC = () => {
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();

  const { data, loading, error } = useGetMaintenanceBannerQuery({
    pollInterval: 5 * 60 * 1000, // refetch every few minutes
    skip: !user?.isAuthenticated || !user?.emailVerified, // component requires auth
  });

  if (error) {
    console.error(`Failed to fetch maintenance banner state. ${error}`);
    // no snackbar - don't want to tell users we failed to fetch outage bar :|
    return null;
  }

  const { message, updatedAt } = data?.maintenanceBanner ?? {};

  if (!message || loading) {
    return null;
  }

  const localUpdatedAt = updatedAt ? format(new Date(updatedAt), hourlyGraphFormat) : 'unknown';

  return (
    <WarningBar id="maintenance">
      {message} - {localUpdatedAt}
    </WarningBar>
  );
};
