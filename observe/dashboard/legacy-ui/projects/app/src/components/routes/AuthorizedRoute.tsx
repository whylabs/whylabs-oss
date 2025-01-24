import { useApolloClient } from '@apollo/client';
import GlobalLoader from 'components/global-loader/GlobalLoader';
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from 'hooks/useUser';
import { PageBases } from 'pages/page-types/pageType';
import { useAuthNavigationHandler } from 'hooks/usePageLinkHandler';
import { MediaRoute, MediaRouteProps } from './MediaRoute';
import { getDashbirdErrors } from '../../utils/error-utils';
import { DashbirdErrorCode } from '../../generated/graphql';
import { InvalidOrganizationErrorPage } from '../../pages/errors';

export type AuthorizedRouteProps = MediaRouteProps;

export const AuthorizedRoute = ({ mobileFriendly = false, ...rest }: AuthorizedRouteProps): JSX.Element | null => {
  const { loading, isAuthenticated, error, emailVerified, hasOrg, refetch } = useUser(10 * 1000); // poll user state every 10 seconds
  const location = useLocation();
  const { triggerLogin } = useAuthNavigationHandler();
  const apolloClient = useApolloClient();

  useEffect(() => {
    const updateUserState = async () => refetch();
    updateUserState().catch((err) => console.error(`Failed to refresh user state on navigation: ${err}`));
  }, [location, refetch]);

  // Wait till useUser is finished fetching user data. Or retries if we had network error
  // TBD Update to loading component
  if (loading) {
    return <GlobalLoader interval={500} />;
  }

  if (error) {
    const knownErrors = getDashbirdErrors(error);
    if (knownErrors.some((err) => err.extensions.code === DashbirdErrorCode.InvalidOrganization)) {
      // user is trying to access a nonexistent or otherwise inaccessible org (e.g. due to end of impersonation)
      return <InvalidOrganizationErrorPage />;
    }
    // unknown error
    return <GlobalLoader interval={500} />;
  }

  if (!isAuthenticated) {
    // user has not logged in yet
    apolloClient.stop();
    triggerLogin({ preserveLocation: true });
    return null;
  }

  if (!emailVerified) {
    // user has not yet verified their email address, so they cannot be mapped to a WhyLabs User or Organization on our end
    return <Navigate to={PageBases.unverifiedEmail} />;
  }

  if (!hasOrg) {
    // user cannot be mapped to an organization (meaning they're not yet a customer)
    return <Navigate to={PageBases.newUser} />;
  }

  return <MediaRoute mobileFriendly={mobileFriendly} {...rest} />;
};
