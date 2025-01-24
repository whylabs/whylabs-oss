import { rest, RestHandler, RestRequest } from 'msw';
import { allMemberships, allUsers, membershipsByGroup, membershipsByUser, usersByEmail, usersById } from './users';
import { AccountUser, UpdateAccountUserRequest } from '@whylabs/songbird-node-client';
import { allOrgs, managedOrgs } from './groups';

type OrgPathParams = {
  org_id: string;
};
type OrgRestRequest = RestRequest<never, OrgPathParams>;

export const basePath = 'https://songbird.development.whylabsdev.com';

export const updateUser = (
  scenario: string,
  userId: string,
  updates: UpdateAccountUserRequest,
  orgId: string,
): AccountUser | null => {
  const users = allUsers(scenario);
  const user = users.find((u) => u.userId === userId);
  if (!user) {
    return null;
  }
  return { ...updates, userId, email: user.email, orgId };
};

export const handlers = (scenario: string): RestHandler[] => [
  rest.get(`${basePath}/v0/accounts/org/:orgid/user/id`, (req: OrgRestRequest, res, ctx) => {
    return res(ctx.status(200), ctx.json(usersById(scenario, req.url.searchParams.get('user_id') ?? '')));
  }),

  rest.get(`${basePath}/v0/accounts/org/:orgid/user/email`, (req: OrgRestRequest, res, ctx) => {
    return res(ctx.status(200), ctx.json(usersByEmail(scenario, req.url.searchParams.get('email') ?? '')));
  }),

  rest.get(`${basePath}/v0/accounts/org/:orgid/users`, (req: OrgRestRequest, res, ctx) => {
    return res(ctx.status(200), ctx.json(allUsers(scenario)));
  }),

  // see if we can specify the request/response types
  rest.get(`${basePath}/v0/accounts/org/:orgid/memberships`, (req: OrgRestRequest, res, ctx) => {
    const groupOrg = req.url.searchParams.get('managed_org_id');
    const groupRole = req.url.searchParams.get('role');
    const userId = req.url.searchParams.get('user_id');
    if (userId) {
      return res(ctx.status(200), ctx.json({ memberships: membershipsByUser(scenario, userId) }));
    }
    if (groupOrg && groupRole) {
      return res(ctx.status(200), ctx.json({ memberships: membershipsByGroup(scenario, `${groupOrg}:${groupRole}`) }));
    }
    return res(ctx.status(200), ctx.json({ memberships: allMemberships(scenario) }));
  }),

  rest.put(`${basePath}/v0/accounts/org/:orgid/user`, async (req: OrgRestRequest, res, ctx) => {
    const userId = req.url.searchParams.get('user_id');
    const updatedAttrs = await req.json();
    const updatedUser = updateUser(scenario, userId ?? '', updatedAttrs, req.params.org_id);
    if (!updatedUser) {
      return res(ctx.status(404), ctx.json({ error: { message: 'User not found' } }));
    }
    return res(ctx.status(200), ctx.json(updatedUser));
  }),

  rest.get(`${basePath}/v0/accounts/org/:orgid/organizations`, (req: OrgRestRequest, res, ctx) => {
    return res(ctx.status(200), ctx.json(managedOrgs));
  }),

  rest.patch(`${basePath}/v0/accounts/org/:orgid/memberships`, (req: OrgRestRequest, res, ctx) => {
    const groupOrg = req.url.searchParams.get('managed_org_id');
    const groupRole = req.url.searchParams.get('role');
    if (groupOrg && groupRole) {
      if (!allOrgs.find((o) => o.orgId === groupOrg)) {
        return res(ctx.status(404), ctx.json({ message: 'Org not found' }));
      }
      return res(ctx.status(200), ctx.json({}));
    }
    return res(ctx.status(400), ctx.json({ message: 'Invalid request' }));
  }),
];
