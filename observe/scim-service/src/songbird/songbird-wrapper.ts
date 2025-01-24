import { AxiosError } from 'axios';
import { formatAxiosError, isAxiosError, sleepAsync } from './songbird-errors';
import { errorWithStatusCode, scimRequestError, systemError } from '../helpers/errors';
import { RequestContext, ScimEmail, ScimMember, ScimUser, ScimUserGroup } from '../types';
import {
  AccountUser,
  CreateAccountUserRequest,
  Member,
  OrganizationRoleMembers,
  Role,
} from '@whylabs/songbird-node-client';
import { difference, pick, uniqWith } from 'lodash';
import { getSongbirdClient, SongbirdClient } from './songbird-client';
import { notNullish } from '../helpers/checkers';
import { getApiKeyFromContext, getOrgIdFromApiKey } from '../helpers/apikey';

const retryableSongbirdCodes = new Set([408, 502, 503, 504]);

const shouldRetrySongbirdReq = (err: AxiosError): boolean => {
  const statusCode = err.response?.status;
  if (!statusCode) {
    return false;
  }

  return retryableSongbirdCodes.has(statusCode);
};

type ActionContext = {
  orgId: string;
  action: string;
};

// PLACEHOLDER for something better
type Log = {
  error: (msg: string) => void;
  warn: (msg: string) => void;
  info: (msg: string) => void;
  debug: (msg: string) => void;
};

export const formatContext = (context?: ActionContext): string => {
  if (!context) return '';
  return `"${context.action}" for org ${context.orgId}`;
};

export const formatErrorContext = (context?: ActionContext): string => {
  if (!context) return '';
  return `${formatContext(context)} error:`;
};

const handleSongbirdError = (err: unknown, logger: Log, cxtString: string, throwOn404 = false): null => {
  if (!isAxiosError(err)) {
    const msg = err instanceof Error ? err.message : `Unknown error when calling Songbird ${err}`;
    throw systemError(msg);
  }
  if (err.response?.status && 400 <= err.response.status) {
    if (err.response?.status === 404 && !throwOn404) {
      logger.info(`${cxtString} Songbird could not find the requested data`);
      return null;
    }
    if ([401, 403].includes(err.response.status)) {
      logger.error(`${cxtString} Auth or authz fail: ${formatAxiosError(err)}`);
      throw errorWithStatusCode('Access denied', err.response.status);
    }
    const data = err.response.data;
    const message = data.message ?? err.message;
    // https://www.rfc-editor.org/rfc/rfc7644.html#section-3.12
    if (err.response.status === 400 && data.type === 'IllegalArgument') {
      throw scimRequestError(message, 'invalidValue');
    }
    throw errorWithStatusCode(message, err.response.status);
  }
  throw systemError(`${cxtString} Failed to get data. Error: ${formatAxiosError(err)}`);
};

export const tryGet = async <T>(
  getter: () => Promise<{ data?: T }>,
  logger: Log,
  context: ActionContext | undefined = undefined,
  retry = true,
): Promise<T | null> => {
  try {
    return (await getter()).data ?? null;
  } catch (err) {
    const cxtString = formatContext(context);
    if (!isAxiosError(err)) {
      const msg = err instanceof Error ? err.message : `Unknown error when calling Songbird ${err}`;
      throw systemError(msg);
    }
    if (retry && shouldRetrySongbirdReq(err)) {
      logger.warn(`${cxtString} Songbird failed to get data with err ${err}. Retrying.`);
      await sleepAsync(100);
      return tryGet(getter, logger, context, false);
    }
    return handleSongbirdError(err, logger, cxtString); // returns null if not found
  }
};

export const tryWrite = async <Res>(
  writer: () => Promise<{ data?: Res }>,
  logger: Log,
  context: ActionContext | undefined = undefined,
  throwOn404 = false,
): Promise<Res | null> => {
  const cxtString = formatContext(context);
  try {
    return (await writer()).data ?? null;
  } catch (err) {
    return handleSongbirdError(err, logger, cxtString, throwOn404); // returns null if not found
  }
};

export const supportedScimAttr = [
  // Array containing scim attributes supported by our plugin code.
  'userName', // userName is mandatory and maps to email in songbird
  'externalId',
  'active',
  'name',
  'emails',
];

// include userName in schema so we preserve capitalization that gets canonicalized in email (Okta test)
const userSchemaAttrs = difference(supportedScimAttr, ['active']);

export const scimToWhylabsUser = (scimUser: ScimUser): CreateAccountUserRequest => {
  const userSchema = pick(scimUser, userSchemaAttrs);
  return {
    active: scimUser.active ?? true,
    email: scimUser.userName,
    userSchema: JSON.stringify(userSchema),
  };
};

export const orgRoleForUser = (userId: string, memberships: OrganizationRoleMembers[]): OrganizationRoleMembers[] => {
  const filteredMembers = memberships.map((entry) => ({
    ...entry,
    members: entry.members.filter((member) => member.userId === userId),
  }));
  return filteredMembers.filter((m) => m.members.length !== 0);
};

export const orgRoleToGroupId = (orgRole: { orgId: string; role: Role }): string => {
  return `whylabs-${orgRole.orgId}:${orgRole.role.toLowerCase()}`;
};

export const orgRoleToScimUserGroup = (orgRole: { orgId: string; role: Role }): ScimUserGroup => {
  const groupId = orgRoleToGroupId(orgRole);
  return {
    value: groupId,
    display: groupId,
    type: 'direct',
  };
};

const includePrimaryEmail = (emails: ScimEmail[] | undefined, primaryEmail: string): ScimEmail[] => {
  const primary: ScimEmail = { type: 'work', primary: true, value: primaryEmail };
  if (!emails) return [primary];
  if (emails.find((e) => e.primary)) return emails;
  return [primary, ...emails];
};

export const whylabsToScimUser = (
  whylabsUser: AccountUser,
  memberships: OrganizationRoleMembers[] | undefined = undefined,
): ScimUser => {
  const userSchema = whylabsUser.userSchema ? JSON.parse(whylabsUser.userSchema) : {};
  const filteredSchema = pick(userSchema, userSchemaAttrs);
  // put this last so if the userName in user schema is null or '' we do fallback to email (unknown should never happen)
  const userName = filteredSchema.userName ? filteredSchema.userName : whylabsUser.email ?? 'unknown';
  const groups = memberships ? orgRoleForUser(whylabsUser.userId, memberships).map(orgRoleToScimUserGroup) : undefined;
  return {
    id: whylabsUser.userId,
    active: whylabsUser.active ?? true,
    ...filteredSchema,
    emails: includePrimaryEmail(filteredSchema.emails, whylabsUser.email ?? ''),
    userName,
    groups,
  };
};

const memberToAccountUser = (member: Member, orgId: string): AccountUser => ({
  orgId,
  email: member.email,
  userId: member.userId,
  active: true,
});

export const uniqueUsers = (users: AccountUser[]): AccountUser[] => {
  return uniqWith(users, (a, b) => a.userId === b.userId && a.orgId === b.orgId);
};

export const membershipsToAccountUsers = (
  accountOrgId: string,
  memberships: OrganizationRoleMembers[],
): AccountUser[] => {
  const allMembers = memberships.flatMap((m) => m.members.map((member) => memberToAccountUser(member, accountOrgId)));
  return uniqueUsers(allMembers);
};

export const whylabsToScimMember = (whylabsMember: Member): ScimMember => {
  return {
    value: whylabsMember.userId,
    display: whylabsMember.email,
  };
};

export const getOrgsInAccount = async (client: SongbirdClient, accountOrgId: string): Promise<string[]> => {
  const managedOrgResp = await client.accounts.listManagedOrganizations(accountOrgId);
  const accountOrgIds: string[] = managedOrgResp.data.map((o) => o.orgId).filter(notNullish);
  accountOrgIds.push(accountOrgId);
  return accountOrgIds;
};

export const getOrgAndClient = (context: RequestContext): [string, SongbirdClient] => {
  const apiKey = getApiKeyFromContext(context) ?? '';
  const orgId = getOrgIdFromApiKey(apiKey);
  return [orgId, getSongbirdClient(apiKey)];
};
