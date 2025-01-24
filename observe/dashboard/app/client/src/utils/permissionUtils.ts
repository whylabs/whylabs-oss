import { CurrentUser } from '~/types/userTypes';
import { Permission } from '~server/graphql/generated/graphql';

function checkUserPermission(permission: Permission, user: CurrentUser): boolean {
  return (user?.permissions ?? []).includes(permission);
}

export function canManageOrg(user: CurrentUser): boolean {
  return checkUserPermission(Permission.ManageOrg, user);
}

export function canManageTokens(user: CurrentUser): boolean {
  return checkUserPermission(Permission.ManageApiTokens, user);
}

export function canManageDatasets(user: CurrentUser): boolean {
  return checkUserPermission(Permission.ManageDatasets, user);
}

export function canManageMonitors(user: CurrentUser): boolean {
  return checkUserPermission(Permission.ManageMonitors, user);
}

export function canManageActions(user: CurrentUser): boolean {
  return checkUserPermission(Permission.ManageActions, user);
}

export function canManageSettings(user: CurrentUser): boolean {
  return (
    checkUserPermission(Permission.ManageOrg, user) ||
    checkUserPermission(Permission.ManageDatasets, user) ||
    checkUserPermission(Permission.ManageActions, user)
  );
}

export function canAccessInternalAdmin(user: CurrentUser): boolean {
  return checkUserPermission(Permission.ManageInternal, user);
}
