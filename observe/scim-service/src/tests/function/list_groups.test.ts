import fetch from 'node-fetch';
import { ScimGetResponse } from '../../types';
import { defaultHeaders } from './helpers/requests';
import { allGroups, allOrgs } from './mocks/groups';
import { allMemberships } from './mocks/users';
import { Role } from '@whylabs/songbird-node-client';
import { pick } from 'lodash';
import { setupMockServer } from './mocks/songbird-mockserver';
import { SetupServer } from 'msw/lib/node';

let defaultMockserver: SetupServer;

describe('List Groups', () => {
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

  it('list all account groups', async () => {
    const res = await fetch('http://localhost:8891/Groups', {
      method: 'GET',
      headers: defaultHeaders,
    });
    const resp = (await res.json()) as ScimGetResponse;
    const groups = resp.Resources;
    expect(resp.totalResults).toEqual(allOrgs.length * 3);
    expect(groups.length).toEqual(resp.totalResults);
    // users should be sorted
    expect(groups.map((g) => g.id)).toEqual(allGroups.sort());
  });

  it('get specific group', async () => {
    const res = await fetch(`http://localhost:8891/Groups/whylabs-org-managed-1:admin`, {
      method: 'GET',
      headers: defaultHeaders,
    });
    const resp = await res.json();
    const groupMembership = allMemberships('default').find((m) => m.orgId === 'org-managed-1' && m.role === Role.Admin);
    expect(pick(resp, ['displayName', 'id', 'members'])).toEqual({
      displayName: 'whylabs-org-managed-1:admin',
      id: 'whylabs-org-managed-1:admin',
      members: groupMembership?.members.map((m) => ({ value: m.userId, display: m.email })),
    });
  });

  it('get specific group for org that is not managed', async () => {
    const res = await fetch(`http://localhost:8891/Groups/whylabs-org-not-managed:viewer`, {
      method: 'GET',
      headers: defaultHeaders,
    });
    expect(res.status).toBe(404);
  });
});
