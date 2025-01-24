import { InvalidOrganizationErrorPage, NotFoundPage, UnknownErrorPage, UnverifiedEmailPage } from 'pages/errors';
import { DeprecatedPages, PageBases, Pages, RelativeOldPages } from 'pages/page-types/pageType';
import ResourcesRouteBase from 'pages/route-bases/ResourcesRouteBase';
import DashboardsRouteBase from 'pages/route-bases/DashboardsRouteBase';
import SettingsRouteBase from 'pages/route-bases/SettingsRouteBase';
import { useEffect, useRef } from 'react';
import { Navigate, Route, RouteProps, Routes, useLocation, useSearchParams } from 'react-router-dom';
import GlobalLoader from 'components/global-loader/GlobalLoader';
import GetStartedRouteBase from 'pages/route-bases/GetStartedRouteBase';
import HowToUseMobileRouteBase from 'pages/route-bases/HowToUseMobileRouteBase';
import useSetupQueryStringListeners from 'hooks/queryParams/useSetupQueryStringListeners';
import { BASE_LOGIN_URI, BASE_LOGOUT_URI, BASE_SIGNUP_URI, DASHBIRD_URI } from 'ui/constants';
import DesignPlaygroundPage from 'pages/design-playground/DesignPlaygroundPage';
import { ChartsPlayground } from 'pages/design-playground/ChartsPlayground';
import RedirectWrapper from 'components/redirect/RedirectWrapper';
import { AuthorizedRoute, AuthorizedRouteProps } from 'components/routes/AuthorizedRoute';
import { AdminPage } from 'pages/admin/AdminPage';
import { NewUserPage } from 'pages/new-user-page/NewUserPage';

import { useUserContext } from 'hooks/useUserContext';
import { getDashbirdErrors } from 'utils/error-utils';
import { DashbirdErrorCode } from 'generated/graphql';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { useIsDemoOrg } from 'hooks/useIsDemoOrg';
import { useStackCustomEventListeners } from 'hooks/useStackCustomEventListeners';
import { useMediaQuery } from '@mantine/hooks';
import { initPendoSession } from 'telemetry/pendo';
import { useMarketplaceExpirationWarning } from './components/marketplace/marketplace-expiration-warning';
import DashbirdErrorPage from './pages/errors/dashbird-error/DashbirdErrorPage';

/**
 * It's very important to trigger a hard browser redirect for certain routes
 * (specifically authentication).
 * Do not redirect elsewhere in the app from these routes.
 * @param dashbirdRoute Dashbird route to redirect the user to
 */
const RedirectToDashbird = ({ route }: { route: string }): null => {
  const { search } = useLocation();
  window.location.href = `${DASHBIRD_URI}/${route}${search}`;
  return null;
};

export const WhyRoutes: React.FC = () => {
  useSetupQueryStringListeners();
  useStackCustomEventListeners();
  useMarketplaceExpirationWarning();

  const [searchParams, setSearchParams] = useSearchParams();
  const { loading, error, getCurrentUser, isWhyLabsUser } = useUserContext();
  const user = getCurrentUser();
  const isDemoOrg = useIsDemoOrg();
  const isMobileUser = useMediaQuery('(max-width:1000px)');

  const targetOrgParam = searchParams.get(TARGET_ORG_QUERY_NAME);

  const currentTargetOrgRef = useRef<string>(targetOrgParam);

  const currentOrgId = user?.organization?.id;
  useEffect(() => {
    // if the user is in a demo org, and they don't have a targetOrgParam, force the page reload to exit the org id
    // OR if the current org id is different than the target org param, force a browser reload
    if ((isDemoOrg && !targetOrgParam) || (targetOrgParam && targetOrgParam !== currentTargetOrgRef?.current)) {
      window.location.reload();
      return;
    }
    if (currentOrgId && !targetOrgParam) {
      setSearchParams(
        (nextParams) => {
          nextParams.set(TARGET_ORG_QUERY_NAME, currentOrgId);
          return nextParams;
        },
        // Using replace: true because there is no sense in navigating to the no-org page
        { replace: true },
      );
    }
  }, [currentOrgId, isDemoOrg, searchParams, setSearchParams, targetOrgParam]);

  useEffect(() => {
    initPendoSession(user);
  }, [user]);

  if (loading) {
    return <GlobalLoader interval={500} />;
  }

  if (error) {
    const knownErrors = getDashbirdErrors(error);
    if (knownErrors.some((err) => err.extensions.code === DashbirdErrorCode.InvalidOrganization)) {
      // user is trying to access a nonexistent or otherwise inaccessible org
      return <InvalidOrganizationErrorPage />;
    }
    if (knownErrors.length) {
      return <DashbirdErrorPage error={knownErrors[0]} />;
    }
    // unknown error
    return <UnknownErrorPage />;
  }

  return (
    <Routes>
      {[RelativeOldPages.models, RelativeOldPages.assets].map(redirectRouteToResource)}

      <Route index element={redirectToIndexPage()} />
      {renderAuthorizedRoute(`${PageBases.resources}/*`, { children: <ResourcesRouteBase /> })}
      {renderAuthorizedRoute(`${PageBases.summary}/*`, { children: <DashboardsRouteBase /> })}
      <Route path={`${DeprecatedPages.investigator}/*`} element={<Navigate to={Pages.customDashboards} />} />

      {renderAuthorizedRoute(`${PageBases.settings}/*`, { children: handleSettingsPage() })}
      {renderAuthorizedRoute(`${PageBases.getStarted}/*`, { children: <GetStartedRouteBase />, mobileFriendly: true })}

      {renderAuthorizedRoute(`${PageBases.howToUseMobile}/*`, {
        children: <HowToUseMobileRouteBase />,
        mobileFriendly: true,
      })}

      {renderAuthorizedRoute(PageBases.admin, { children: <AdminPage /> })}

      <Route path={PageBases.newUser} element={<NewUserPage />} />

      <Route path={PageBases.unverifiedEmail} element={<UnverifiedEmailPage />} />

      {/* Short overview of our design components */}
      {isWhyLabsUser() && renderAuthorizedRoute(PageBases.designPlayground, { children: <DesignPlaygroundPage /> })}

      {/* Short overview of our chart components */}
      {isWhyLabsUser() && renderAuthorizedRoute(PageBases.chartPlayground, { children: <ChartsPlayground /> })}

      {/* Auth routes must redirect to Dashbird */}
      {[BASE_LOGIN_URI, BASE_SIGNUP_URI, BASE_LOGOUT_URI].map((route) => (
        <Route key={route} path={route} element={<RedirectToDashbird route={route} />} />
      ))}

      <Route path={Pages.notFound} element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to={Pages.notFound} />} />
    </Routes>
  );

  function redirectToIndexPage() {
    if (isMobileUser) {
      return <Navigate to={PageBases.getStarted} />;
    }

    return <Navigate to={Pages.dashboard} />;
  }

  function handleSettingsPage() {
    return <SettingsRouteBase />;
  }

  function renderAuthorizedRoute(path: RouteProps['path'], props: AuthorizedRouteProps) {
    return <Route path={path} element={<AuthorizedRoute {...props} />} />;
  }

  function redirectRouteToResource(oldPath: string) {
    return (
      <Route
        key={oldPath}
        path={`${oldPath}/*`}
        element={<RedirectWrapper keepSearchParams newPath="resources" oldPath={oldPath} />}
      />
    );
  }
};
