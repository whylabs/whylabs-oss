import fetch from 'node-fetch';
import { defaultUsers, filteredUserAttrs, updatedUser1, usersById } from './mocks/users';
import { defaultHeaders } from './helpers/requests';
import { setupMockServer, songbirdBasePath } from './mocks/songbird-mockserver';
import { rest } from 'msw';
import { ScimUser } from '../../types';
import { scimToWhylabsUser } from '../../songbird/songbird-wrapper';
import { SetupServer } from 'msw/lib/node';

let defaultMockserver: SetupServer;

describe('Modify Users', () => {
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

  it('puts a user', async () => {
    const updatedWhyLabsUser = {
      ...scimToWhylabsUser(updatedUser1),
      userId: 'user-1',
      email: defaultUsers[1].email,
    };
    let getCount = 0;
    defaultMockserver.use(
      rest.get(`${songbirdBasePath}/v0/accounts/org/:org_id/user/id`, (req, res, ctx) => {
        if (getCount === 0) {
          getCount += 1;
          return res(ctx.status(200), ctx.json(usersById('default', req.url.searchParams.get('user_id') ?? '')));
        }
        return res(ctx.status(200), ctx.json(updatedWhyLabsUser));
      }),
    );
    const res = await fetch('http://localhost:8891/Users/user-1', {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify(updatedUser1),
    });
    expect(res.status).toBe(200);
    const resp = await res.json();
    const filteredActual = filteredUserAttrs(resp as ScimUser);
    expect(filteredActual).toEqual(updatedUser1);
  });

  it('returns 404 if the user does not exist', async () => {
    const res = await fetch('http://localhost:8891/Users/user-10', {
      method: 'PUT',
      headers: defaultHeaders,
      body: JSON.stringify({ id: 'user-10', userName: 'user+10@test.com', active: true }),
    });
    expect(res.status).toBe(404);
  });

  it('patches active status of a user', async () => {
    defaultMockserver.use(
      rest.put(`${songbirdBasePath}/v0/accounts/org/:org_id/user`, async (req, res, ctx) => {
        const update = await req.json();
        const schema = JSON.parse(update.userSchema);
        expect(schema.name.givenName).toEqual('Test');
        expect(schema.emails).toEqual([{ value: 'user1@work.com', type: 'work', primary: true }]);
        expect(update.active).toEqual(false);
        return res(ctx.status(200), ctx.json({}));
      }),
    );
    const res = await fetch('http://localhost:8891/Users/user-1', {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({ Operations: [{ op: 'replace', path: 'active', value: false }] }),
    });
    expect(res.status).toBe(200);
  });
});
