import fetch from 'node-fetch';
import { defaultHeaders } from './helpers/requests';
import { setupMockServer, songbirdBasePath } from './mocks/songbird-mockserver';
import { rest, RestHandler } from 'msw';
import { patchMembersRequest } from './mocks/groups';
import { pick } from 'lodash';
import { membershipsByGroup } from './mocks/users';
import { Member, PatchAccountMembershipsRequest } from '@whylabs/songbird-node-client';
import { SetupServer } from 'msw/lib/node';

const patchedMembers = (groupOrg: string, groupRole: string, patchReq: PatchAccountMembershipsRequest): Member[] => {
  const orig = membershipsByGroup('default', `${groupOrg}:${groupRole}`);
  const newMembers = patchReq.userIdsToAdd.map((userId) => ({ userId, email: `${userId}@test.com` }));
  if (!orig || orig.length === 0) return newMembers;
  return orig[0].members.filter((o) => !patchReq.userIdsToDelete.includes(o.userId)).concat(newMembers);
};

const getAfterModifyHandler = (members: Member[]): RestHandler => {
  return rest.get(`${songbirdBasePath}/v0/accounts/org/:org_id/memberships`, async (req, res, ctx) => {
    const groupOrg = req.url.searchParams.get('managed_org_id');
    const groupRole = req.url.searchParams.get('role') ?? '';
    return res(
      ctx.status(200),
      ctx.json({
        memberships: [
          {
            orgId: groupOrg,
            role: groupRole,
            members,
          },
        ],
      }),
    );
  });
};

let defaultMockserver: SetupServer;

describe('Modify Group', () => {
  beforeAll(async () => {
    defaultMockserver = await setupMockServer('default');
    defaultMockserver.listen({
      onUnhandledRequest(request, print) {
        // Do not print warnings on unhandled requests to plugin
        if (request.url.hostname === 'localhost' && request.url.port === '8891') {
          return;
        }
        // Print the regular MSW unhandled request warning otherwise.
        print.warning();
      },
    });
  });

  afterEach(() => defaultMockserver.resetHandlers());

  afterAll(async () => {
    defaultMockserver.close();
  });

  it('adds a user into an org in a role', async () => {
    const updatedMembers = patchedMembers('whylabs-org-managed-1', 'member', {
      userIdsToAdd: ['user-1'],
      userIdsToDelete: [],
    });
    defaultMockserver.use(getAfterModifyHandler(updatedMembers));
    const res = await fetch('http://localhost:8891/Groups/whylabs-org-managed-1:member', {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify(patchMembersRequest(['user-1'], [])),
    });
    expect(res.status).toBe(200);
    const resp = await res.json();
    expect(pick(resp, ['id', 'displayName', ['members']])).toEqual({
      id: 'whylabs-org-managed-1:member',
      displayName: 'whylabs-org-managed-1:member',
      members: [{ value: 'user-1', display: 'user-1@test.com' }],
    });
  });

  it('removes a user from a role', async () => {
    const updatedMembers = patchedMembers('whylabs-org-managed-1', 'viewer', {
      userIdsToAdd: [],
      userIdsToDelete: ['user-1'],
    });
    defaultMockserver.use(getAfterModifyHandler(updatedMembers));
    const res = await fetch('http://localhost:8891/Groups/whylabs-org-managed-1:viewer', {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify(patchMembersRequest([], ['user-0'])),
    });
    expect(res.status).toBe(200);
    const resp = await res.json();
    expect(pick(resp, ['id', 'displayName', ['members']])).toEqual({
      id: 'whylabs-org-managed-1:viewer',
      displayName: 'whylabs-org-managed-1:viewer',
      members: [{ value: 'user-0', display: 'user-0' }],
    });
  });

  it('handles a not found from patch', async () => {
    const res = await fetch('http://localhost:8891/Groups/org-not-exist:viewer', {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify(patchMembersRequest(['user-0'], [])),
    });
    expect(res.status).toBe(404);
  });

  it('handles a not found from put', async () => {
    const res = await fetch('http://localhost:8891/Groups/org-not-exist:viewer', {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify(patchMembersRequest([], ['user-0'])),
    });
    expect(res.status).toBe(404);
  });

  it('handles invalid request from patch', async () => {
    const res = await fetch('http://localhost:8891/Groups/org-not-exist:foo', {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify(patchMembersRequest([], ['user-0'])),
    });
    expect(res.status).toBe(400);
  });

  it('puts empty list of members', async () => {
    defaultMockserver.use(getAfterModifyHandler([]));
    const res = await fetch('http://localhost:8891/Groups/whylabs-org-managed-1:viewer', {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify({ members: [] }),
    });
    expect(res.status).toBe(200);
    const resp = await res.json();
    expect(pick(resp, ['id', 'displayName', ['members']])).toEqual({
      id: 'whylabs-org-managed-1:viewer',
      displayName: 'whylabs-org-managed-1:viewer',
    });
  });

  it('puts non-empty list of members', async () => {
    defaultMockserver.use(getAfterModifyHandler([{ userId: 'user-3', email: 'user+3@test.com' }]));
    const res = await fetch('http://localhost:8891/Groups/whylabs-org-managed-1:viewer', {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify({ members: ['user-3'] }),
    });
    expect(res.status).toBe(200);
    const resp = await res.json();
    expect(pick(resp, ['id', 'displayName', ['members']])).toEqual({
      id: 'whylabs-org-managed-1:viewer',
      displayName: 'whylabs-org-managed-1:viewer',
      members: [{ value: 'user-3', display: 'user+3@test.com' }],
    });
  });
});
