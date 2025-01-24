import fetch from 'node-fetch';
import { ScimGetResponse, ScimUser } from '../../types';
import { defaultUsers } from './mocks/users';
import { defaultHeaders } from './helpers/requests';
import { setupMockServer } from './mocks/songbird-mockserver';
import { SetupServer } from 'msw/node';
import { omit } from 'lodash';
import { rest } from 'msw';
import { basePath } from './mocks/handlers';

let legacyMockserver: SetupServer;

const expectedLegacy1 = {
  id: 'legacy-1',
  userName: 'legacy+1@test.com',
  active: true,
  emails: [{ primary: true, type: 'work', value: 'legacy+1@test.com' }],
  groups: [{ display: 'whylabs-org-managed-1:member', value: 'whylabs-org-managed-1:member', type: 'direct' }],
};

describe('Handle legacy users', () => {
  beforeAll(async () => {
    legacyMockserver = await setupMockServer('legacy');
    legacyMockserver.listen({
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

  afterEach(() => legacyMockserver.resetHandlers());

  afterAll(async () => {
    legacyMockserver.close();
  });

  it('lists legacy users', async () => {
    const res = await fetch('http://localhost:8891/Users', {
      method: 'GET',
      headers: defaultHeaders,
    });
    const resp = (await res.json()) as ScimGetResponse;
    const users = resp.Resources;
    expect(resp.totalResults).toEqual(defaultUsers.length + 1);
    const legacyUser = users.find((u) => u.id === 'legacy-1');
    expect(omit(legacyUser, ['meta', 'schemas'])).toEqual(expectedLegacy1);
  });

  it('lists legacy user by path param', async () => {
    const res = await fetch(`http://localhost:8891/Users/legacy-1`, {
      method: 'GET',
      headers: defaultHeaders,
    });
    // Note this returns single user, not array of users
    const resp = await res.json();
    expect(resp).toBeTruthy();
    expect((resp as ScimUser).id).toEqual('legacy-1');
  });

  it('deletes legacy user', async () => {
    const deleteMock = jest.fn();
    const createMock = jest.fn();
    const deleteHandler = rest.delete(`${basePath}/v0/accounts/org/:orgid/user/:id`, (req, res, ctx) => {
      deleteMock();
      expect(req.params.id).toEqual('legacy-1');
      return res(ctx.status(204), ctx.json({}));
    });
    const createHandler = rest.post(`${basePath}/v0/accounts/org/:orgid/user`, async (req, res, ctx) => {
      createMock();
      const body = await req.json();
      expect(body).toEqual({ userId: 'legacy-1', email: 'legacy+1@test.com', active: true, orgId: 'org-account' });
      return res(ctx.status(201), ctx.json({}));
    });
    legacyMockserver.use(deleteHandler);
    legacyMockserver.use(createHandler);

    await fetch(`http://localhost:8891/Users/legacy-1`, {
      method: 'DELETE',
      headers: defaultHeaders,
    });
    expect(createMock).toBeCalled();
    expect(deleteMock).toBeCalled();
  });

  it('patches legacy user', async () => {
    const createMock = jest.fn();
    const updateMock = jest.fn();
    const updateHandler = rest.put(`${basePath}/v0/accounts/org/:orgid/user/:id`, async (req, res, ctx) => {
      updateMock();
      const body = await req.json();
      return res(ctx.status(201), ctx.json(body));
    });
    legacyMockserver.use(updateHandler);
    const createHandler = rest.post(`${basePath}/v0/accounts/org/:orgid/user`, async (req, res, ctx) => {
      createMock();
      const body = await req.json();
      expect(body.userId).toEqual('legacy-1');
      expect(body.active).toEqual(true);
      return res(ctx.status(201), ctx.json(body));
    });
    legacyMockserver.use(createHandler);

    const res = await fetch(`http://localhost:8891/Users/legacy-1`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({
        Operations: [
          {
            op: 'replace',
            value: { active: false },
          },
        ],
      }),
    });
    const resp = (await res.json()) as ScimUser;
    expect(createMock).toBeCalled();
    expect(res.status).toBe(200);
    expect(omit(resp, ['meta', 'schemas'])).toEqual(expectedLegacy1);
  });

  it('reconciles a legacy member on modify groups', async () => {
    const createMock = jest.fn();
    const createHandler = rest.post(`${basePath}/v0/accounts/org/:orgid/user`, async (req, res, ctx) => {
      createMock();
      const body = await req.json();
      expect(body.userId).toEqual('legacy-1');
      expect(body.active).toEqual(true);
      return res(ctx.status(201), ctx.json(body));
    });
    legacyMockserver.use(createHandler);

    const res = await fetch(`http://localhost:8891/Groups/org-managed-1:viewer`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({
        Operations: [
          {
            op: 'add',
            value: { members: [{ value: 'legacy-1' }] },
          },
        ],
      }),
    });
    expect(createMock).toBeCalled();
    expect(res.status).toBe(200);
  });
});
