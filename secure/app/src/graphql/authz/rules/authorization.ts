import { MembershipRole, Permission } from '../../../types/api';

/**
 * Permissions cover what is needed for the non-WhyLabs admin roles and access to Dashbird via the UI.
 */

export const adminPermissions: Permission[] = [
  Permission.ManageActions,
  Permission.ManageOrg,
  Permission.ManageDatasets,
  Permission.ManageMonitors,
  Permission.ManageApiTokens,
  Permission.ManageDashboards,
  Permission.ViewData,
];
const roleToPermissions: ReadonlyMap<MembershipRole, readonly Permission[]> = new Map<MembershipRole, Permission[]>([
  [MembershipRole.Admin, adminPermissions],
  [MembershipRole.Member, [Permission.ManageMonitors, Permission.ViewData, Permission.ManageDashboards]],
  [MembershipRole.Viewer, [Permission.ViewData]],
]);

/**
 * Returns a user's permissions based on their role
 */
export const getRoleOrWhyLabPermissions = (role: MembershipRole | undefined, whylabsAdmin: boolean): Permission[] => {
  if (!role) return [];
  const permissions = roleToPermissions.get(role);
  if (!permissions) return [];
  const maybeWhyLabsAdmin = whylabsAdmin ? [Permission.ManageInternal] : [];
  return [...permissions, ...maybeWhyLabsAdmin];
};

export const getRolePermissions = (role: MembershipRole | undefined): Permission[] => {
  if (!role) return [];
  const permissions = roleToPermissions.get(role);
  if (!permissions) return [];
  return [...permissions];
};

/**
 * A user must have all the required permissions to perform an action.
 */
export const checkPermissions = (granted: Permission[], required: Permission[]): boolean => {
  return required.every((p) => granted.includes(p));
};
