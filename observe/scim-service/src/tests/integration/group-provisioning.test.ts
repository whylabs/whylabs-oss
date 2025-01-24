import {
  createUser,
  deleteUser,
  getExpectedGroupIds,
  getGroup,
  getGroups,
  getUserByEmail,
  patchGroup,
  patchUser,
  putGroup,
  putGroupReq,
  resetUser,
} from './helpers/requests';
import { accountOrgId } from './config';
import { omit } from 'lodash';
import { ScimPatchOperation } from '../../types';

// choose a group unlikely to have real members
const testGroupId = 'whylabs-org-5JvvvS:viewer';

describe('Group provisioning tests', () => {
  it('Lists expected groups', async () => {
    const groups = await getGroups();
    const groupIds = groups.map((g) => g.id);
    const expectedGroupIds = await getExpectedGroupIds(accountOrgId);
    expect(groups.length).toBe(expectedGroupIds.length);
    expect(groupIds.sort()).toEqual(expectedGroupIds.sort());
    expect(groups.map((g) => g.displayName).sort()).toEqual(expectedGroupIds.sort());
    const aGroup = await getGroup(groups[5].id);
    expect(aGroup).toEqual(groups[5]);
  });

  it('Gets a specific group', async () => {
    const groups = await getGroups();
    expect(groups.length).toBeGreaterThanOrEqual(6); // at least one managed org and account org
    const group = await getGroup(groups[5].id);
    expect(group).toEqual(groups[5]);
  });

  it('Puts group members', async () => {
    const user = await resetUser({ userName: 'testuser+1@whylabs.ai' }, true);
    if (!user) throw Error('Reset user failed in put group members');
    const origGroup = await getGroup(testGroupId);
    if (origGroup.members?.length) {
      // if group has members, remove them
      const updatedGroup = await putGroup(origGroup.id, { members: [] });
      // bug in gateway: location field in meta isnt returned from putGroup
      // also members is omitted when empty, but thats probably ok
      expect(omit(updatedGroup, ['meta'])).toEqual(omit(origGroup, ['meta', 'members']));
    }
    // group has no members, so add one then remove
    const expectedMembers = [{ value: user.id, display: user.userName }];
    const updatedGroup = await putGroup(origGroup.id, { members: expectedMembers });
    expect(updatedGroup.members).toEqual(expectedMembers);
    const restoredGroup = await putGroup(origGroup.id, { members: [] });
    expect(omit(restoredGroup, ['meta'])).toEqual(omit(origGroup, ['meta']));
  });

  it('Put invalid group member', async () => {
    const user = await resetUser({ userName: 'testuser+1@whylabs.ai' }, true);
    if (!user) throw Error('Reset user failed in put invalid group members');
    const member = { value: user.id, display: user.userName };
    await resetUser({ userName: 'testuser+1@whylabs.ai' }, false);
    const res = await putGroupReq(testGroupId, { members: [member] });
    expect(res.status).toBe(400);
    const json: { status?: string; scimType?: string; detail?: string } = (await res.json()) as object;
    expect(json.status).toEqual('400');
    expect(json.detail).toContain('Some users did not exist');
    expect(json.scimType).toEqual('invalidValue');
  });

  it('Patches group members', async () => {
    const user = await resetUser({ userName: 'testuser+1@whylabs.ai' }, true);
    if (!user) throw Error('Reset user failed in put group members');
    const addUserOp: ScimPatchOperation = { op: 'add', path: 'members', value: [{ value: user.id }] };
    const removeUserOp: ScimPatchOperation = { op: 'remove', path: 'members', value: [{ value: user.id }] };
    const origGroup = await getGroup(testGroupId);
    const origMemberIds = origGroup.members?.map((m) => m.value) ?? [];
    if (origMemberIds.includes(user.id)) {
      // if user is in members, remove then add
      const updatedGroup = await patchGroup(origGroup.id, [removeUserOp]);
      const expectedMembers = origGroup.members?.filter((m) => m.value !== user.id);
      expect((updatedGroup.members ?? []).sort()).toEqual(expectedMembers);
      const restoredGroup = await patchGroup(origGroup.id, [addUserOp]);
      expect(restoredGroup.members?.sort()).toEqual(origGroup.members?.sort());
    } else {
      // user is not in members, add them then remove them
      const expectedMembers = [...origMemberIds, { value: user.id, display: user.userName }];
      const updatedGroup = await patchGroup(origGroup.id, [addUserOp]);
      expect(updatedGroup.members).toEqual(expectedMembers);
      const restoredGroup = await patchGroup(origGroup.id, [removeUserOp]);
      expect(restoredGroup.members).toBeUndefined();
    }
  });

  it('Patches an empty group with replace', async () => {
    const origGroup = await getGroup(testGroupId);
    const origMemberIds = origGroup.members?.map((m) => m.value) ?? [];
    const user = await resetUser({ userName: 'testuser+2@whylabs.ai' }, true);
    if (!user) throw Error('Reset user failed in patch empty group');
    const replaceUserOp: ScimPatchOperation = {
      op: 'replace',
      value: { members: [{ value: user.id }] },
    };
    const updated = await patchGroup(origGroup.id, [replaceUserOp]);
    expect(updated.members).toEqual([{ value: user.id, display: user.userName }]);
    const replaceEmptyOp: ScimPatchOperation = {
      op: 'replace',
      value: { members: [], id: origGroup.id, displayName: origGroup.displayName },
    };
    const emptiedGroup = await patchGroup(origGroup.id, [replaceEmptyOp]);
    expect(emptiedGroup.members).toBeUndefined(); // or empty?

    const restoredGroup = await putGroup(origGroup.id, {
      members: origMemberIds.map((id) => ({ value: id, display: id })),
    });
    expect(restoredGroup.members?.sort()).toEqual(origGroup.members?.sort());
  });

  it('Deletes memberships on user delete', async () => {
    const user =
      (await getUserByEmail('testuser+1@whylabs.ai')) ?? (await createUser({ userName: 'testuser+1@whylabs.ai' }));
    if (!user) throw Error('Unable to get/create test user');
    const origGroup = await getGroup(testGroupId);
    const origMemberIds = origGroup.members?.map((m) => m.value) ?? [];
    if (!origMemberIds.includes(user.id)) {
      const patchedGroup = await patchGroup(origGroup.id, [
        { op: 'add', path: 'members', value: [{ value: user.id }] },
      ]);
      expect(patchedGroup.members?.map((m) => m.value) ?? []).toContain(user.id);
    }
    await deleteUser(user.id);
    const group = await getGroup(origGroup.id);
    expect(group.members?.map((m) => m.value) ?? []).not.toContain(user.id);
    await createUser({ userName: 'testuser+1@whylabs.ai' });
    const groupAfterCreate = await getGroup(origGroup.id);
    expect(groupAfterCreate.members?.map((m) => m.value) ?? []).not.toContain(user.id);
  });

  it('Deletes memberships on user disable', async () => {
    const user =
      (await getUserByEmail('testuser+1@whylabs.ai')) ?? (await createUser({ userName: 'testuser+1@whylabs.ai' }));
    if (!user) throw Error('Unable to get/create test user');
    const origGroup = await getGroup(testGroupId);
    const origMemberIds = origGroup.members?.map((m) => m.value) ?? [];
    if (!origMemberIds.includes(user.id)) {
      const patchedGroup = await patchGroup(origGroup.id, [
        { op: 'add', path: 'members', value: [{ value: user.id }] },
      ]);
      expect(patchedGroup.members?.map((m) => m.value) ?? []).toContain(user.id);
    }
    await patchUser(user.id, [{ op: 'replace', path: 'active', value: false }]);
    const group = await getGroup(origGroup.id);
    expect(group.members?.map((m) => m.value) ?? []).not.toContain(user.id);
    await patchUser(user.id, [{ op: 'replace', path: 'active', value: true }]);
    const groupAfterActive = await getGroup(origGroup.id);
    expect(groupAfterActive.members?.map((m) => m.value) ?? []).not.toContain(user.id);
  });
});
