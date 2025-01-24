import { TRPCError, initTRPC } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { OpenIDUser } from 'openid-client';

import { isDebugMode, isLocalMode } from '../config';
import { DEMO_GLOBAL_ORG_ID } from '../constants';
import { checkPermissions, getRoleOrWhyLabPermissions } from '../graphql/authz/rules/authorization';
import { DEMO_ORG_ID } from '../graphql/authz/user-context';
import { Permission } from '../graphql/generated/graphql';
import { ipIsAllowed } from '../middleware/ip-allow-list';
import { WhyLabsUserMetadata } from '../middleware/user-metadata';
import {
  DataServiceClient,
  dataServiceClient as defaultDataServiceClient,
} from '../services/data/data-service/data-service-client-factory';
import {
  SongbirdClient,
  songbirdClient as defaultSongbirdClient,
} from '../services/data/songbird/songbird-client-factory';
import { Auth0ImpersonationMetadata } from '../services/security/auth0-wrapper';
import { callOptionsFromTrpcContext } from './util/call-context';
import { intervalSchema, orgSchema, resourceSchema } from './util/schemas';

const ENABLE_STACKTRACE = isLocalMode() || isDebugMode();

export type TrpcContext = {
  userMetadata: WhyLabsUserMetadata | undefined;
  impersonation: Auth0ImpersonationMetadata | undefined;
  songbirdClient: SongbirdClient;
  dataServiceClient: DataServiceClient; // deprecated, use source
  targetOrgId: string | undefined;
  auth0UserId: string | undefined;
  auditOrigIp: string | undefined;
};

const createBadRequestError = (message: string) => {
  return new TRPCError({
    code: 'BAD_REQUEST',
    // Display the message in stacktrace mode, but not in production
    message: ENABLE_STACKTRACE ? message : undefined,
  });
};

const createForbiddenError = (message: string) => {
  return new TRPCError({
    code: 'FORBIDDEN',
    // Display the message in stacktrace mode, but not in production
    message: ENABLE_STACKTRACE ? message : undefined,
  });
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions): TrpcContext => {
  const whySession = req.session ?? {};
  const songbirdClient: SongbirdClient = defaultSongbirdClient;
  const dataServiceClient: DataServiceClient = defaultDataServiceClient;
  const targetOrgId: string | undefined = undefined;
  const auth0User: OpenIDUser | undefined = req.identity?.user ?? undefined;
  const userMetadata = whySession['userMetadata'];
  return {
    userMetadata,
    impersonation: res.locals.impersonation,
    songbirdClient,
    dataServiceClient,
    targetOrgId,
    auth0UserId: auth0User?.sub,
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

const checkIsDemoOrg = (orgId?: string) => {
  if (!orgId) return false;
  return DEMO_ORG_ID === orgId || DEMO_GLOBAL_ORG_ID === orgId;
};

const checkTargetOrgMiddleware = t.middleware((opts) => {
  const { ctx, meta, next } = opts;
  if (!meta?.bypassOrgCheck) {
    const result = orgSchema.safeParse(opts.rawInput);
    if (!result.success) {
      throw createBadRequestError(result.error.message);
    }
    const { orgId } = result.data;
    ctx.targetOrgId = orgId; // intentionally setting in ctx for logging of error
    if (!ctx.userMetadata?.memberships.find((m) => m.orgId === orgId)) {
      throw createForbiddenError("User doesn't have a membership in the target organization");
    }
  }
  return next({ ctx });
});

// needs to happen after checkTargetOrgMiddleware
const checkOrgIpWhitelist = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (await ipIsAllowed(ctx.auditOrigIp, ctx.targetOrgId, callOptionsFromTrpcContext(ctx))) {
    return next({ ctx });
  }
  throw createForbiddenError('Access to this organization is not permitted from this IP address');
});

// Any authenticated user should have an active membership
const checkUserAuthenticatedMiddleware = t.middleware((opts) => {
  const { ctx, next } = opts;
  if (!ctx.userMetadata?.defaultOrgId || !ctx.auth0UserId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next();
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
    if (
      ctx.userMetadata &&
      checkIsDemoOrg(ctx.targetOrgId) &&
      checkPermissions([Permission.ViewData], requiredPermissions)
    ) {
      return next({ ctx });
    }

    const membership = ctx.userMetadata?.memberships?.find((m) => m.orgId === ctx.targetOrgId);
    if (!membership) {
      throw createForbiddenError("User doesn't have a membership");
    }
    const granted = getRoleOrWhyLabPermissions(membership.role, !!ctx.userMetadata?.whylabsAdmin);
    if (!checkPermissions(granted, requiredPermissions)) {
      throw createForbiddenError("User doesn't have the required permissions");
    }
    return next({ ctx });
  });

const canViewData = permissionCheckMiddleware([Permission.ViewData]);
const canManageMonitors = permissionCheckMiddleware([Permission.ManageMonitors]);
const canManageResources = permissionCheckMiddleware([Permission.ManageDatasets]);
const canManageOrg = permissionCheckMiddleware([Permission.ManageOrg]);
const canManageDashboards = permissionCheckMiddleware([Permission.ManageDashboards]);
// const canManageNotifications = permissionCheckMiddleware([Permission.ManageActions]);
// const canManageApiKeys = permissionCheckMiddleware([Permission.ManageApiTokens]);

const isWhyLabsMiddleware = t.middleware((opts) => {
  const { ctx, next } = opts;
  if (!ctx.userMetadata?.whylabsAdmin) {
    throw createForbiddenError('User is not a WhyLabs admin');
  }
  return next({ ctx });
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;

/**
 * Public route without any auth required.
 */
export const publicProcedure = t.procedure;

export const authenticatedProcedure = t.procedure.use(checkUserAuthenticatedMiddleware);
export const authenticatedOrgProcedure = authenticatedProcedure
  .input(orgSchema)
  .use(checkTargetOrgMiddleware)
  .use(checkOrgIpWhitelist);
/**
 * Read only permission within this specific organization
 */
export const viewDataProcedure = authenticatedOrgProcedure.use(canViewData);

/**
 * Read only permission for the resources within this specific organization
 */
export const viewResourceDataProcedure = viewDataProcedure.input(resourceSchema);

/**
 * Read only permission for data within this specific organization with a date interval validation
 */
export const viewDataProcedureWithDateInterval = viewDataProcedure
  .input(intervalSchema)
  .use(checkDateIntervalMiddleware);

/**
 * Read only permission for the resources within this specific organization with a date interval validation
 */
export const viewResourceDataProcedureWithDateInterval = viewResourceDataProcedure
  .input(intervalSchema)
  .use(checkDateIntervalMiddleware);

/**
 * Permission for managing monitoring (member)
 */
export const manageMonitorsProcedure = authenticatedOrgProcedure.use(canManageMonitors);

/*
 * Permission for managing dashboards (member)
 */
export const manageDashboardsProcedure = authenticatedOrgProcedure.use(canManageDashboards);

/**
 * Admin permission for the organization admin
 */
export const manageOrgProcedure = authenticatedOrgProcedure.use(canManageOrg);

export const manageResourcesProcedure = authenticatedOrgProcedure.use(canManageResources);

export const manageResourceFeatureProcedure = authenticatedOrgProcedure.use(canManageResources).input(resourceSchema);

/**
 * For internal WhyLabs callers
 */
export const whylabsAdminProcedure = authenticatedProcedure.use(isWhyLabsMiddleware);
