import { Route, Routes } from 'react-router-dom';
import { RelativeOldPages, RelativePages } from 'pages/page-types/pageType';
import { SettingsPage, SettingsPageBase } from 'pages/settings-pages/SettingsPage';
import { useUserContext } from 'hooks/useUserContext';
import { NotFoundPage } from 'pages/errors';
import { canManageActions, canManageDatasets, canManageOrg, canManageTokens } from 'utils/permissionUtils';
import RedirectWrapper from 'components/redirect/RedirectWrapper';

export default function SettingsRouteBase(): JSX.Element {
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const userCanManageOrg = canManageOrg(user);
  const userCanManageDatasets = canManageDatasets(user);
  const userCanManageActions = canManageActions(user);
  const userCanManageTokens = canManageTokens(user);
  const userCanManage = userCanManageOrg || userCanManageActions || userCanManageDatasets || userCanManageTokens;

  return (
    <Routes>
      {renderRedirects()}

      {/* Settings page made flag need to add */}
      {userCanManage && <Route index element={<SettingsPageBase />} />}
      {userCanManageDatasets && <Route path={RelativePages.modelSettings} element={<SettingsPage />} />}
      {userCanManageOrg && <Route path={RelativePages.userSettings} element={<SettingsPage />} />}
      {userCanManageActions && <Route path={`${RelativePages.notifications}/*`} element={<SettingsPage />} />}
      <Route path={RelativePages.accessToken} element={<SettingsPage />} />
      <Route path={RelativePages.integrationSettings} element={<SettingsPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  function renderRedirects() {
    return [
      {
        oldPath: RelativeOldPages.modelSettings,
        newPath: RelativePages.modelSettings,
      },
      {
        oldPath: RelativeOldPages.userSettings,
        newPath: RelativePages.userSettings,
      },
      {
        oldPath: RelativeOldPages.accessToken,
        newPath: RelativePages.accessToken,
      },
    ].map(renderRedirectWrapper);
  }

  function renderRedirectWrapper({ oldPath, newPath }: { oldPath: string; newPath: string }) {
    return <Route key={oldPath} path={oldPath} element={<RedirectWrapper oldPath={oldPath} newPath={newPath} />} />;
  }
}
