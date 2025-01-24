import fetch from 'node-fetch';
import { songbirdBasePath, setupMockServer } from './mocks/songbird-mockserver';
import { rest } from 'msw';
import { ScimErrorResponse, ScimGetResponse, ScimUser } from '../../types';
import { defaultUsers } from './mocks/users';
import { defaultHeaders } from './helpers/requests';
import { validateUser1 } from './helpers/validators';
import { SetupServer } from 'msw/lib/node';

let defaultMockserver: SetupServer;

describe('List Users', () => {
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

  it('list all account users', async () => {
    const res = await fetch('http://localhost:8891/Users', {
      method: 'GET',
      headers: defaultHeaders,
    });
    const resp = (await res.json()) as ScimGetResponse;
    const users = resp.Resources;
    expect(resp.totalResults).toEqual(defaultUsers.length);
    expect(users.length).toEqual(resp.totalResults);
    // users should be sorted
    const expectedUserIds = [...Array(5).keys()].map((n) => `user-${n}`);
    expect(users.map((u) => u.id)).toEqual(expectedUserIds);
    // check user1's content
    validateUser1(users[1]);
  });

  it('list all account users internal server error', async () => {
    // override default handler
    defaultMockserver.use(
      rest.get(`${songbirdBasePath}/v0/accounts/org/:orgid/users`, (req, res, ctx) => res(ctx.status(500))),
    );
    const res = await fetch('http://localhost:8891/Users', {
      method: 'GET',
      headers: defaultHeaders,
    });
    const resp = (await res.json()) as ScimErrorResponse;
    expect(resp.status).toEqual('500');
  });

  it('lists single user by path param', async () => {
    const res = await fetch(`http://localhost:8891/Users/user-1`, {
      method: 'GET',
      headers: defaultHeaders,
    });
    // Note this returns single user, not array of users
    const resp = await res.json();
    expect(resp).toBeTruthy();
    validateUser1(resp as ScimUser);
  });

  it('returns not found for single user by path param', async () => {
    const res = await fetch(`http://localhost:8891/Users/user-not-exist`, {
      method: 'GET',
      headers: defaultHeaders,
    });
    expect(res.status).toBe(404);
    const resp = (await res.json()) as ScimErrorResponse;
    expect(resp.status).toBe(404);
    expect(resp.detail).toContain('user-not-exist not found');
  });

  it('lists single user by name filter', async () => {
    const queryParams = new URLSearchParams({ filter: 'userName eq user+1@test.com' });
    const res = await fetch(`http://localhost:8891/Users?${queryParams}`, {
      method: 'GET',
      headers: defaultHeaders,
    });
    const resp = (await res.json()) as ScimGetResponse;
    const users = resp.Resources;
    expect(users.length).toEqual(1);
    validateUser1(users[0]);
  });
});
