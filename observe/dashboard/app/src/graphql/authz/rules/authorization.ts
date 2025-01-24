import { Maybe } from '@graphql-tools/utils';
import { Role } from '@whylabs/songbird-node-client';
import { Logger } from 'pino';

import { AuthorizationError } from '../../../errors/dashbird-error';
import { GraphQLContext } from '../../context';
import { roleToGQL } from '../../contract-converters/songbird/membership-converter';
import { AuthDirectiveArgs, Permission } from '../../generated/graphql';

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
const roleToPermissions: ReadonlyMap<Role, readonly Permission[]> = new Map<Role, Permission[]>([
  [Role.Admin, adminPermissions],
  [Role.Member, [Permission.ManageMonitors, Permission.ViewData, Permission.ManageDashboards]],
  [Role.Viewer, [Permission.ViewData]],
]);

/**
 * Returns a user's permissions based on their role
 */
export const getRoleOrWhyLabPermissions = (role: Maybe<Role>, whylabsAdmin: boolean): Permission[] => {
  if (!role) return [];
  const permissions = roleToPermissions.get(role);
  if (!permissions) return [];
  const maybeWhyLabsAdmin = whylabsAdmin ? [Permission.ManageInternal] : [];
  return [...permissions, ...maybeWhyLabsAdmin];
};

export const getRolePermissions = (role: Maybe<Role>): Permission[] => {
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

/**
 * Checks the request context against authorization args on the field. If everything's cool, runs the resolver and returns its results.
 * @param authDirectiveArgs Arguments of the auth directive specified on the field
 * @param context Request context
 * @param logger Logger to use to log authz issues
 * @param resolve Resolver for the field
 */
export const checkPermissionsAndResolve = <T>(
  authDirectiveArgs: AuthDirectiveArgs,
  context: GraphQLContext,
  logger: Logger,
  resolve?: () => T,
): T | undefined => {
  // Default to requiring view data for any API other than those with skipPermissionsCheck
  const requiredPermissions: Permission[] = authDirectiveArgs.permissions ?? [Permission.ViewData];

  if (authDirectiveArgs.skipPermissionsCheck && !requiredPermissions.includes(Permission.ManageInternal)) {
    // authz requirements explicitly ignored on this field
    return resolve && resolve();
  }

  if (checkPermissions(context.userContext.permissions, requiredPermissions)) {
    return resolve && resolve();
  }

  const role = context.userContext.membership?.role;
  logger.warn(
    { req: context.request },
    `Received unauthorized GraphQL request: ${role} does not have the required permissions '${requiredPermissions.join(
      ', ',
    )}`,
  );
  throw new AuthorizationError(roleToGQL(role), requiredPermissions, context.request.id as string);
};
