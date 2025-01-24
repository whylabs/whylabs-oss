// =================================================================================
// This plugin was originally based on the scim-plugin by Jarle Elshaug but
// has been heavily modified.
// https://github.com/jelhub/scimGateway/blob/master/lib/plugin-scim.js
// =================================================================================
import path from 'path';
import { difference, pick, sortBy } from 'lodash';
import ScimGateway from 'scimgateway';

import {
  RequestContext,
  ScimGetRequest,
  ScimGetResponse,
  ScimGroup,
  ScimUser,
  ScimUserAttrs,
  UserModify,
} from '../types';
import {
  formatErrorContext,
  getOrgAndClient,
  getOrgsInAccount,
  membershipsToAccountUsers,
  orgRoleToGroupId,
  scimToWhylabsUser,
  supportedScimAttr,
  tryGet,
  tryWrite,
  uniqueUsers,
  whylabsToScimMember,
  whylabsToScimUser,
} from '../songbird/songbird-wrapper';
import { AccountUser, OrganizationRoleMembers, Role } from '@whylabs/songbird-node-client';
import { scimRequestError, systemError } from '../helpers/errors';
import { getOrgRoleFromGroupOrThrow } from '../helpers/group';
import { Server } from 'http';
import { patchResolver } from '../helpers/patch-resolver';

export const init = (): Server => {
  // mandatory plugin initialization - start
  const scimGateway = new ScimGateway();
  const pluginName = path.basename(__filename);
  // The .ts. in the config file is required because scimGateway reads the config on load based on a pattern assuming .js
  const validScimAttr = [
    ...supportedScimAttr,
    'password', // okta requires this to be allowed, even though it should not send it
  ];
  scimGateway.authPassThroughAllowed = true; // true enables auth passThrough (no scimGateway authentication).
  // scimGateway instead includes ctx (ctx.request.header) in plugin methods.
  // Note, requires plugin-logic for handling/passing ctx.request.header.authorization to be used in endpoint communication
  // mandatory plugin initialization - end

  const validateUserAttributes = (userObj: ScimUserAttrs, logContext: string): void => {
    const notValid = Object.keys(userObj).filter((key) => !validScimAttr.includes(key));
    if (notValid.length > 0) {
      scimGateway.logger.info(`${logContext} Scim attributes "${notValid}" are not supported and are being ignored`);
    }
    // make sure we dont pass thru password
    if ('password' in userObj) {
      delete userObj['password'];
    }
  };

  const getAccountOrLegacyUser = async (
    action: string,
    userId: string,
    context: object,
  ): Promise<AccountUser | null> => {
    const [orgId, songbirdClient] = getOrgAndClient(context);
    const actionContext = { action, orgId };
    const existingUser = await tryGet(
      () => songbirdClient.accounts.getAccountUserById(orgId, userId),
      scimGateway.logger,
      {
        action,
        orgId,
      },
    );
    if (existingUser) return existingUser;

    // it's probably a legacy user, so we need to get the memberships and create a user object if so
    const membResponse = await tryGet(
      () => songbirdClient.accounts.getAccountMemberships(orgId, userId),
      scimGateway.logger,
      actionContext,
    );
    const memberships = membResponse ? Array.from(membResponse.memberships) : [];
    const memberUsers = membershipsToAccountUsers(orgId, memberships);
    const legacyUser = memberUsers.find((u) => u.userId === userId);
    if (legacyUser) {
      // it is a legacy user
      scimGateway.logger.warn(
        `${formatErrorContext(actionContext)} Legacy user ${userId} found - creating account user`,
      );
      return tryWrite(
        () => songbirdClient.accounts.createAccountUser(orgId, legacyUser),
        scimGateway.logger,
        actionContext,
      );
    }
    return null;
  };

  const reconcileLegacyUsers = async (ids: string[], context: RequestContext) => {
    // The provisioner is trying to add members who may be legacy users. We need to check if they are and create them if so.
    const [orgId, songbirdClient] = getOrgAndClient(context);
    const actionContext = { action: 'reconcileLegacyUsers', orgId };
    const accountUser =
      (await tryGet(() => songbirdClient.accounts.listAccountUsers(orgId), scimGateway.logger, actionContext)) ?? [];
    const unknownAccountUsers = difference(
      ids,
      accountUser.map((u) => u.userId),
    );
    if (unknownAccountUsers.length === 0) return;
    const membResponse = await tryGet(
      () => songbirdClient.accounts.getAccountMemberships(orgId),
      scimGateway.logger,
      actionContext,
    );
    const memberships = membResponse ? Array.from(membResponse.memberships) : [];
    const memberUsers = membershipsToAccountUsers(orgId, memberships);

    const legacyUsers = memberUsers.filter((u) => unknownAccountUsers.includes(u.userId));
    if (legacyUsers.length === 0) return;
    scimGateway.logger.warn(
      `${formatErrorContext(actionContext)} Legacy users ${legacyUsers.map(
        (u) => u.userId,
      )} in membership update - creating account users`,
    );
    await Promise.all(
      legacyUsers.map((legacyUser) =>
        tryWrite(() => songbirdClient.accounts.createAccountUser(orgId, legacyUser), scimGateway.logger, actionContext),
      ),
    );
  };

  // =================================================
  // getUsers
  // =================================================
  scimGateway.getUsers = async (
    baseEntity: string,
    getObj: ScimGetRequest,
    attributes: string[],
    context: RequestContext,
  ) => {
    //
    // "getObj" = { attribute: <>, operator: <>, value: <>, rawFilter: <>, startIndex: <>, count: <> }
    // rawFilter is always included when filtering
    // attribute, operator and value are included when requesting unique object or simple filtering
    // See comments in the "mandatory if-else logic - start"
    //
    // "attributes" is array of attributes to be returned - if empty, all supported attributes should be returned
    // Should normally return all supported user attributes having id and userName as mandatory
    // Note, the value of returned 'id' will be used as 'id' in modifyUser and deleteUser
    // scimGateway will automatically filter response according to the attributes list
    //
    let action = 'getUsers';
    scimGateway.logger.debug(
      `${pluginName}[${baseEntity}] handling "${action}" getObj=${
        getObj ? JSON.stringify(getObj) : ''
      } attributes=${attributes}`,
    );

    let userId: string | null = null;
    let userName: string | null = null;
    const [orgId, songbirdClient] = getOrgAndClient(context);
    const logContext = formatErrorContext({ action, orgId });

    // start mandatory if-else logic
    // Support filter by id or by userName (aka email)
    if (getObj.operator) {
      if (getObj.operator === 'eq') {
        // mandatory - unique filtering - single unique user to be returned
        if (getObj.attribute === 'id') {
          userId = getObj.value;
        } // GET /Users/bjensen?attributes=
        else if (getObj.attribute === 'userName') {
          // support simple filter on userName aka email
          userName = getObj.value;
        } // GET /Users?filter=userName eq "bjensen"&attributes=userName
        else {
          throw scimRequestError(
            `${logContext} Filtering on attribute ${getObj.attribute} is not supported`,
            'invalidFilter',
          );
        }
      } else {
        throw scimRequestError(`${logContext} Operators other than "eq" are not supported`, 'invalidFilter');
      }
    } else if (getObj.rawFilter) {
      // optional - advanced filtering having and/or/not - use getObj.rawFilter
      throw scimRequestError(`${logContext} Advanced filtering is not supported: ${getObj.rawFilter}`, 'invalidFilter');
    } else {
      // mandatory - no filtering (!getObj.operator && !getObj.rawFilter) - all users to be returned
    }
    // end mandatory if-else logic

    const ret: ScimGetResponse = {
      // itemsPerPage will be set by scimGateway
      Resources: [],
      totalResults: 0,
    };

    // Need to get memberships to detect legacy users and to populate the groups field in the returned users
    const membResponse = await tryGet(
      () => songbirdClient.accounts.getAccountMemberships(orgId, userId ?? undefined),
      scimGateway.logger,
      {
        action,
        orgId,
      },
    );
    const memberships = membResponse ? Array.from(membResponse.memberships) : [];
    const memberUsers = membershipsToAccountUsers(orgId, memberships);

    let users: AccountUser[];

    // Either get all account users, or get a specific user by userId or userName (email).
    if (userName) {
      action = `getUser by name ${userName}`;
      const email: string = userName;
      let user = await tryGet(() => songbirdClient.accounts.getAccountUserByEmail(orgId, email), scimGateway.logger, {
        action,
        orgId,
      });
      if (!user) {
        user = memberUsers.find((u) => u.email === email) ?? null;
      }
      users = user ? [user] : [];
    } else if (userId) {
      action = `getUser by ID ${userId}`;
      const idString: string = userId;
      let user = await tryGet(() => songbirdClient.accounts.getAccountUserById(orgId, idString), scimGateway.logger, {
        action,
        orgId,
      });
      if (!user) {
        user = memberUsers.find((u) => u.userId === userId) ?? null;
      }
      users = user ? [user] : [];
    } else {
      // get the orgs within the account and all members
      users =
        (await tryGet(() => songbirdClient.accounts.listAccountUsers(orgId), scimGateway.logger, {
          action,
          orgId,
        })) ?? [];
      users = uniqueUsers(users.concat(memberUsers));
      if (uniqueUsers.length > users.length) {
        const legacyUserIds = difference(pick(memberUsers, ['userId']), pick(users, ['userId'])).map((u) => u);
        scimGateway.logger.warn(`${formatErrorContext({ action, orgId })} Legacy users ${legacyUserIds} found`);
      }
    }

    const sortedUsers = sortBy(users, ['orgId', 'userId']); // if we do pagination we need this order to be stable
    const responseArr: ScimUser[] = sortedUsers.map((user) => whylabsToScimUser(user, memberships));

    // client request may or may not have paging
    const startIndex = getObj.startIndex ?? 1;
    const totalResults = responseArr.length;
    const count = getObj.count ?? totalResults;
    ret.Resources = responseArr.slice(startIndex - 1, startIndex + count - 1);
    ret.totalResults = totalResults;
    return ret;
  };

  // =================================================
  // createUser
  // =================================================
  scimGateway.createUser = async (baseEntity: string, userObj: ScimUser, context: object): Promise<ScimUser | null> => {
    const action = 'createUser';
    scimGateway.logger.debug(`${pluginName}[${baseEntity}] handling "${action}" userObj=${JSON.stringify(userObj)}`);
    const [orgId, songbirdClient] = getOrgAndClient(context);
    const logContext = formatErrorContext({ action, orgId });

    validateUserAttributes(userObj, logContext);

    // Here we should associate the user with the account, creating a whylabs user if we need to.
    // Our proxy for now is creating the least-access membership in the org.
    // This only works for existing users, which seems wrong... an admin in an org should be able to invite
    // someone who has not yet signed up. It also fails if the user already has a role. So basically just a placeholder
    const user = await tryWrite(
      () => songbirdClient.accounts.createAccountUser(orgId, scimToWhylabsUser(userObj)),
      scimGateway.logger,
      {
        action,
        orgId,
      },
    );
    if (user) return whylabsToScimUser(user);
    return null;
  };

  // =================================================
  // deleteUser
  // =================================================
  scimGateway.deleteUser = async (baseEntity: string, id: string, context: object) => {
    const action = 'deleteUser';
    scimGateway.logger.debug(`${pluginName}[${baseEntity}] handling "${action}" id=${id}`);

    const [orgId, songbirdClient] = getOrgAndClient(context);
    // make sure a legacy user is deleted if it exists, by creating an account user from the legacy user
    await getAccountOrLegacyUser(action, id, context);
    await tryWrite(() => songbirdClient.accounts.deleteAccountUser(orgId, id), scimGateway.logger, {
      action,
      orgId,
    });
  };

  // =================================================
  // modifyUser
  // =================================================
  scimGateway.modifyUser = async (baseEntity: string, id: string, attrObj: UserModify, context: object) => {
    const action = 'modifyUser';
    scimGateway.logger.debug(
      `${pluginName}[${baseEntity}] handling "${action}" id=${id} attrObj=${JSON.stringify(attrObj)}`,
    );
    const [orgId, songbirdClient] = getOrgAndClient(context);
    const actionContext = { action, orgId };
    const logContext = formatErrorContext(actionContext);

    // Workaround for case where user does not exist and scimgateway returns corrupted attrObj
    if ('Resources' in attrObj) {
      delete attrObj['Resources'];
    }
    if ('totalResults' in attrObj) {
      delete attrObj['totalResults'];
    }
    validateUserAttributes(attrObj, logContext);

    // need to get existing user and merge values
    const existingUser = await getAccountOrLegacyUser(action, id, context);
    const scimUser = existingUser ? whylabsToScimUser(existingUser) : {};
    const userAttrs = patchResolver(scimUser, attrObj, scimGateway);

    return tryWrite(
      () => songbirdClient.accounts.updateAccountUser(orgId, id, scimToWhylabsUser(userAttrs)),
      scimGateway.logger,
      actionContext,
    );
  };

  // =================================================
  // getGroups
  // =================================================
  scimGateway.getGroups = async (
    baseEntity: string,
    getObj: ScimGetRequest,
    attributes: string[],
    context: object,
  ): Promise<ScimGetResponse> => {
    //
    // "getObj" = { attribute: <>, operator: <>, value: <>, rawFilter: <>, startIndex: <>, count: <> }
    // rawFilter is always included when filtering
    // attribute, operator and value are included when requesting unique object or simpel filtering
    // See comments in the "mandatory if-else logic - start"
    //
    // "attributes" is array of attributes to be returned - if empty, all supported attributes should be returned
    // Should normally return all supported group attributes having id, displayName and members as mandatory
    // id and displayName are most often considered as "the same" having value = <GroupName>
    // Note, the value of returned 'id' will be used as 'id' in modifyGroup and deleteGroup
    // scimGateway will automatically filter response according to the attributes list
    //
    let action = 'getGroups';
    scimGateway.logger.debug(
      `${pluginName}[${baseEntity}] handling "${action}" getObj=${
        getObj ? JSON.stringify(getObj) : ''
      } attributes=${attributes}`,
    );
    const [orgId, songbirdClient] = getOrgAndClient(context);
    const logContext = formatErrorContext({ action, orgId });

    // This should consist of getting the list of account orgs and returning constructed org:role groups and their
    // members. Note this does imply the provisioner needs to have the cross-product of org:role groups even if
    // they dont use them all, unless we let the provisioner "create" the ones they are interested in.

    // mandatory if-else logic - start
    let group: string | null = null;
    let userId: string | null = null;
    if (getObj.operator) {
      if (getObj.operator === 'eq') {
        // In future, we may want to add in support externalId
        if (['id', 'displayName'].includes(getObj.attribute)) {
          // mandatory - unique filtering - single unique user to be returned
          group = getObj.value;
        } else if (getObj.attribute === 'members.value') {
          // mandatory - return all groups the user 'id' (getObj.value) is member of
          // Resources = [{ id: <id-group>> , displayName: <displayName-group>, members [{value: <id-user>}] }]
          userId = getObj.value;
        } else {
          // optional - simple filtering - we dont have other attributes to filter on so return all, rightly or wrongly
        }
      } else {
        // other operators aren't supported
        throw scimRequestError(`${logContext} Operators other than "eq" are not supported`, 'invalidFilter');
      }
    } else if (getObj.rawFilter) {
      // optional - advanced filtering having and/or/not - use getObj.rawFilter
      throw scimRequestError(`${action} Advanced filtering is not supported: ${getObj.rawFilter}`, 'invalidFilter');
    } else {
      // mandatory - no filtering (!getObj.operator && !getObj.rawFilter) - all groups to be returned
    }
    // mandatory if-else logic - end

    const ret: ScimGetResponse = {
      // itemsPerPage will be set by scimGateway
      Resources: [],
      totalResults: 0,
    };
    let groupOrg: string | undefined;
    let groupRole: Role | undefined;
    if (group) {
      action = `getGroup ${group}`;
      [groupOrg, groupRole] = getOrgRoleFromGroupOrThrow(getObj.value);
    }

    // This call can be for all groups, a selected group, or a selected user
    const response = await tryGet(
      () => songbirdClient.accounts.getAccountMemberships(orgId, userId ?? undefined, groupOrg, groupRole),
      scimGateway.logger,
      {
        action,
        orgId,
      },
    );
    const memberships = response ? Array.from(response.memberships) : [];
    let filteredMemberships: OrganizationRoleMembers[] = [];

    if (userId) {
      // groups for a user
      filteredMemberships = memberships;
    } else if (group && memberships.length > 0) {
      // specific group that has members
      filteredMemberships = memberships;
    } else {
      // get the org/roles within the account even if no members
      const accountOrgIds = await getOrgsInAccount(songbirdClient, orgId);
      if (groupOrg && groupRole) {
        if (accountOrgIds.indexOf(groupOrg) !== -1) {
          filteredMemberships = [{ orgId: groupOrg, role: groupRole, members: [] }];
        }
      } else {
        accountOrgIds.forEach((anOrgId) => {
          Object.values(Role).forEach((role) => {
            const membership = memberships.find((m) => m.orgId === anOrgId && m.role === role);
            filteredMemberships.push(membership ?? { orgId: anOrgId, role, members: [] });
          });
        });
      }
    }

    const sortedMemberships = sortBy(filteredMemberships, ['orgId', 'role']); // for pagination we need this order to be stable
    const responseArr: ScimGroup[] = sortedMemberships.map((m) => {
      const groupId = orgRoleToGroupId(m);
      return {
        id: groupId,
        displayName: groupId,
        members: m.members.map((member) => whylabsToScimMember(member)),
      };
    });

    // client request may or may not have paging
    const startIndex = getObj.startIndex ?? 1;
    const totalResults = responseArr.length;
    const count = getObj.count ?? totalResults;
    ret.Resources = responseArr.slice(startIndex - 1, startIndex + count - 1);
    ret.totalResults = totalResults;
    return ret;
  };

  // =================================================
  // createGroup
  // =================================================
  scimGateway.createGroup = async (baseEntity: string, groupObj: ScimGroup) => {
    const action = 'createGroup';
    scimGateway.logger.debug(`${pluginName}[${baseEntity}] handling "${action}" groupObj=${JSON.stringify(groupObj)}`);
    throw scimRequestError(
      `${action} error: Creating new groups (whylabs organization:role) is not supported`,
      'mutability',
    );
  };

  // =================================================
  // deleteGroup
  // =================================================
  scimGateway.deleteGroup = async (baseEntity: string, id: string) => {
    const action = 'deleteGroup';
    scimGateway.logger.debug(`${pluginName}[${baseEntity}] handling "${action}" id=${id}`);
    throw scimRequestError(
      `${action} error: Deleting groups (whylabs organization:role) is not supported`,
      'mutability',
    );
  };

  // =================================================
  // modifyGroup
  // The scimgateway converts both PUT and PATCH requests into the required adds and deletes, based on a call to getGroups.
  // It will also call getGroups at the end to get and return the updated group.
  // =================================================
  type GroupModify = {
    members: { operation?: 'delete'; value: string }[];
  };
  scimGateway.modifyGroup = async (baseEntity: string, groupId: string, attrObj: GroupModify, context: object) => {
    const action = 'modifyGroup';
    scimGateway.logger.debug(
      `${pluginName}[${baseEntity}] handling "${action}" id=${groupId} attrObj=${JSON.stringify(attrObj)}`,
    );
    const [orgId, songbirdClient] = getOrgAndClient(context);
    const logContext = formatErrorContext({ action, orgId });

    // warn if unsupported attributes are included
    const unsupported = Object.keys(attrObj).filter((key) => !['displayName', 'id', 'members'].includes(key));
    if (unsupported.length > 1) {
      scimGateway.logger.warn(
        `${logContext} Only modification of members is supported - ignoring "${unsupported}" keys`,
      );
    }

    if (!attrObj.members) {
      return;
    }

    if (!Array.isArray(attrObj.members)) {
      throw scimRequestError(
        `${logContext} ${JSON.stringify(attrObj)} - correct syntax is { "members": [...] }`,
        'invalidSyntax',
      );
    }
    await reconcileLegacyUsers(
      attrObj.members.map((m) => m.value),
      context,
    );

    const userIdsToAdd = new Set<string>();
    const userIdsToDelete = new Set<string>();
    const [groupOrg, groupRole] = getOrgRoleFromGroupOrThrow(groupId);
    attrObj.members.forEach(function (el) {
      // This logic looks nothing like the request as scimgateway is doing a conversion to its internal interface (GroupModify)
      if (el.operation && el.operation === 'delete') {
        // delete member from group
        userIdsToDelete.add(el.value);
      } else {
        if (el.value) {
          // add member to group
          userIdsToAdd.add(el.value);
        }
      }
    });
    if (userIdsToAdd.size < 1 && userIdsToDelete.size < 1) return;
    const results = await tryWrite(
      () =>
        songbirdClient.accounts.patchOrganizationMemberships(orgId, groupOrg, groupRole, {
          userIdsToAdd: Array.from(userIdsToAdd),
          userIdsToDelete: Array.from(userIdsToDelete),
        }),
      scimGateway.logger,
      {
        action,
        orgId,
      },
      true,
    );
    // return an error to let caller know if there were failures
    if (results?.errors && results?.errors.length > 0) {
      const users = results.errors.map((e) => e.itemId);
      if (users.length > 0) {
        throw scimRequestError(`${logContext} Some users did not exist ${users.join(', ')}`, 'invalidValue');
      } else {
        throw systemError(`${logContext} Request failed with errors ${results.errors.join('\n')}`);
      }
    }
  };

  //
  // Cleanup on exit
  //
  process.on('SIGTERM', () => {
    // kill
  });

  process.on('SIGINT', () => {
    // Ctrl+C
  });

  return scimGateway.server;
};
