import { AppRoutePaths } from '~/types/AppRoutePaths';
import { logOrThrowError } from '~/utils/logUtils';

export type SettingsRootPagesPathIds = keyof Pick<
  typeof AppRoutePaths,
  | 'orgIdSettingsAccessToken'
  | 'orgIdSettingsBilling'
  | 'orgIdSettingsIntegrations'
  | 'orgIdSettingsResourceManagement'
  | 'orgIdSettingsNotifications'
  | 'orgIdSettingsUserManagement'
>;

export function getSettingsTabTitle(pathId: SettingsRootPagesPathIds): string {
  switch (pathId) {
    case 'orgIdSettingsAccessToken':
      return 'Access tokens';
    case 'orgIdSettingsBilling':
      return 'Billing';
    case 'orgIdSettingsIntegrations':
      return 'Integrations';
    case 'orgIdSettingsResourceManagement':
      return 'Resources';
    case 'orgIdSettingsNotifications':
      return 'Notifications';
    case 'orgIdSettingsUserManagement':
      return 'Users';
    default:
      return logOrThrowError(`Must define a label to the PageType: ${pathId}`);
  }
}

export function getSettingsPageTitle(pathId: SettingsRootPagesPathIds): string {
  switch (pathId) {
    case 'orgIdSettingsAccessToken':
      return 'Access tokens';
    case 'orgIdSettingsBilling':
      return 'Billing';
    case 'orgIdSettingsIntegrations':
      return 'Integrations';
    case 'orgIdSettingsResourceManagement':
      return 'Resource management';
    case 'orgIdSettingsNotifications':
      return 'Notification actions';
    case 'orgIdSettingsUserManagement':
      return 'User management';
    default:
      return '';
  }
}
