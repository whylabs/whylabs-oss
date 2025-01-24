import { initTRPC, TRPCError } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';

import { isDebugMode, isLocalMode } from '../config';
import { checkPermissions, getRoleOrWhyLabPermissions } from '../graphql/authz/rules/authorization';
import { WhyLabsUserMetadata } from '../middleware/user-metadata';
import { MembershipRole, Permission } from '../types/api';
import { intervalSchema, resourceSchema } from './util/schemas';

const ENABLE_STACKTRACE = isLocalMode() || isDebugMode();

export type TrpcContext = {
  userMetadata: WhyLabsUserMetadata | undefined;
  auth0UserId: string | undefined;
  auditOrigIp: string | undefined;
};

const createBadRequestError = (message: string) => {
  return new TRPCError({
    code: 'BAD_REQUEST',
    // Display the message in stacktrace mode, but not in production
    message: ENABLE_STACKTRACE ? message : 'error',
  });
};

const createForbiddenError = (message: string) => {
  return new TRPCError({
    code: 'FORBIDDEN',
    // Display the message in stacktrace mode, but not in production
    message: ENABLE_STACKTRACE ? message : 'error',
  });
};

export const createContext = ({ req }: trpcExpress.CreateExpressContextOptions): TrpcContext => {
  return {
    userMetadata: {
      auth0Id: 'foo',
      userId: 'foo',
      email: 'foo@bar.com',
      name: 'foo bar',
      whylabsAdmin: false,
      includeClaims: false,
      lastSyncedTimeInEpochMillis: new Date().getTime(),
    },
    auth0UserId: 'xyzs',
    auditOrigIp: req.ip,
  };
};

interface Meta {
  bypassOrgCheck: boolean;
}

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<TrpcContext>().meta<Meta>().create({
  isDev: ENABLE_STACKTRACE, // turns on stacktrace
});

const checkDateIntervalMiddleware = t.middleware(({ next, rawInput }) => {
  const result = intervalSchema.safeParse(rawInput);
  if (!result.success) {
    throw createBadRequestError(result.error.message);
  }

  const { fromTimestamp, toTimestamp } = result.data;
  if (toTimestamp && fromTimestamp > toTimestamp) {
    throw createBadRequestError('fromTimestamp must be before toTimestamp');
  }
  return next();
});

const permissionCheckMiddleware = (requiredPermissions: Permission[]) =>
  t.middleware((opts) => {
    const { ctx, next } = opts;

    // Allow access to demo org as long as the user is authenticated and the required permission is ViewData
    if (ctx.userMetadata && checkPermissions([Permission.ViewData], requiredPermissions)) {
      return next({ ctx });
    }

    const granted = getRoleOrWhyLabPermissions(MembershipRole.Admin, !!ctx.userMetadata?.whylabsAdmin);
    if (!checkPermissions(granted, requiredPermissions)) {
      throw createForbiddenError("User doesn't have the required permissions");
    }
    return next({ ctx });
  });

const canViewData = permissionCheckMiddleware([Permission.ViewData]);
const canManageResources = permissionCheckMiddleware([Permission.ManageDatasets]);

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;

/**
 * Public route without any auth required.
 */
export const publicProcedure = t.procedure;

/**
 * Read only permission within this specific organization
 */
export const viewDataProcedure = publicProcedure.use(canViewData);

/**
 * Read only permission for the resources within this specific organization
 */
export const viewResourceDataProcedure = viewDataProcedure.input(resourceSchema);

/**
 * Read only permission for the resources within this specific organization with a date interval validation
 */
export const viewResourceDataProcedureWithDateInterval = viewResourceDataProcedure
  .input(intervalSchema)
  .use(checkDateIntervalMiddleware);

export const manageResourceFeatureProcedure = publicProcedure.use(canManageResources).input(resourceSchema);
