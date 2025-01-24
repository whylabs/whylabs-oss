import {
  createUser,
  createUserExpectError,
  deleteUser,
  getUser,
  getUserByEmail,
  getUserExpectError,
  getUsers,
  patchUser,
  putUser,
  resetUser,
} from './helpers/requests';
import { conflictValidator, notFoundValidator } from './helpers/validators';
import { ScimPatchOperation, ScimUserAttrs } from '../../types';
import { pick } from 'lodash';

describe('User provisioning tests', () => {
  it('Paginates and lists users in a consistent order', async () => {
    const startIndex = 2;
    const count = 3;
    const users1 = await getUsers({});
    const users2 = await getUsers({ startIndex: String(startIndex), count: String(count) });
    expect(users2.length).toBeLessThanOrEqual(count);
    const expectedUsers2 = users1.slice(startIndex - 1, startIndex - 1 + count);
    expect(users2).toEqual(expectedUsers2);
  });

  it('Gets a specific user', async () => {
    const users1 = await getUsers({});
    if (users1.length) {
      const user = await getUser(users1[0].id ?? '');
      expect(user).toEqual(users1[0]);
    }
  });

  it('Returns expected result if user does not exist', async () => {
    await getUserExpectError('id-not-exist', 404, notFoundValidator);
  });

  it('Creates a user if that user does not exist', async () => {
    const userName = 'testuser+1@whylabs.ai';
    await resetUser({ userName }, false);
    const user = await createUser({ userName });
    expect(user.userName).toEqual(userName);
    expect(user.groups?.length ?? 0).toBe(0);
  });

  it('Returns an error if a user already exists', async () => {
    const userName = 'testuser+1@whylabs.ai';
    // make sure the user exists
    await resetUser({ userName }, true);
    await createUserExpectError({ userName }, 409, conflictValidator);
  });

  it('Deletes a user', async () => {
    const userName = 'testuser+1@whylabs.ai';
    // make sure the user exists
    let user = await getUserByEmail(userName);
    if (!user) {
      user = await createUser({ userName });
    }
    expect(user).toBeTruthy();
    await deleteUser(user.id ?? '');
    await getUserExpectError(user.id ?? '', 404, notFoundValidator);
  });

  it('Puts user with additional attributes', async () => {
    const userName = 'testuser+1@whylabs.ai';
    const additionalAttrs = {
      externalId: 'ext-id-1',
      active: true,
      emails: [{ value: 'foo@test.com', type: 'work', primary: true }],
      name: { givenName: 'Test', familyName: 'User' },
    };
    const existingUser = await resetUser({ userName });
    expect(existingUser).toBeTruthy();
    const expectedUserAttrs = {
      ...additionalAttrs,
      userName,
    };
    await putUser(existingUser?.id ?? '', expectedUserAttrs);
    const updatedUser = await getUser(existingUser?.id ?? '');
    const keys = Object.keys(expectedUserAttrs);
    expect(pick(updatedUser, keys)).toEqual(expectedUserAttrs);
  });

  it('Patches user active status without changing additional attributes', async () => {
    const initialAttrs: ScimUserAttrs & { userName: string } = {
      userName: 'testuser+1@whylabs.ai',
      externalId: 'ext-id-1',
      active: true,
      emails: [{ value: 'foo@test.com', type: 'work', primary: true }],
      name: { givenName: 'Test', familyName: 'User' },
    };
    const patchOp: ScimPatchOperation = { op: 'replace', path: 'active', value: false };
    await resetUser(initialAttrs, false);
    const existingUser = await createUser(initialAttrs);
    const updatedUser = await patchUser(existingUser?.id ?? '', [patchOp]);
    const expectedUserAttrs = { ...initialAttrs, active: false };
    const keys = Object.keys(expectedUserAttrs);
    expect(pick(updatedUser, keys)).toEqual(expectedUserAttrs);
  });

  it('Patches user with additional attributes without changing others', async () => {
    const initialAttrs: ScimUserAttrs & { userName: string } = {
      userName: 'testuser+1@whylabs.ai',
      externalId: 'ext-id-1',
      active: true,
      emails: [{ value: 'foo@test.com', type: 'work', primary: true }],
      name: { givenName: 'Test', familyName: 'User' },
    };
    const patchedName = { givenName: 'Test1', familyName: 'User1' };
    await resetUser(initialAttrs, false);
    const existingUser = await createUser(initialAttrs);
    const updatedUser = await patchUser(existingUser?.id ?? '', [{ op: 'replace', path: 'name', value: patchedName }]);
    const expectedUserAttrs = { ...initialAttrs, name: patchedName };
    const keys = Object.keys(expectedUserAttrs);
    expect(pick(updatedUser, keys)).toEqual(expectedUserAttrs);
  });

  it('Returns capitalized user name as given', async () => {
    const attrs: ScimUserAttrs & { userName: string } = {
      userName: 'Testuser+5@whylabs.ai',
      externalId: 'Ext-id-5',
      active: true,
      emails: [{ value: 'foo@test.com', type: 'work', primary: true }],
      name: { givenName: 'Test', familyName: 'User' },
    };
    await resetUser(attrs, false);
    const user = await createUser(attrs);
    const keys = Object.keys(attrs);
    expect(pick(user, keys)).toEqual(attrs);
  });
});
