import { Role } from '@whylabs/songbird-node-client';
import { ScimPatchOperation } from '../../../types';
import { orgRoleToGroupId } from '../../../songbird/songbird-wrapper';

export const managedOrgs = [
  {
    orgId: 'org-managed-1',
    name: 'Managed Org 1',
  },
  {
    orgId: 'org-managed-2',
    name: 'Managed Org 2',
  },
];

export const accountOrg = {
  orgId: 'org-account',
  name: 'Account Org',
};

export const allOrgs = [...managedOrgs, accountOrg];

export const allGroups = allOrgs.flatMap((o) =>
  Object.values(Role).map((role) => orgRoleToGroupId({ orgId: o.orgId, role })),
);

export const patchMembersRequest = (
  usersToAdd: string[],
  usersToRemove: string[],
): { Operations: ScimPatchOperation[] } => {
  const ops: ScimPatchOperation[] = [];
  if (usersToAdd.length > 0) {
    ops.push({
      op: 'add',
      path: 'members',
      value: usersToAdd.map((u) => ({ value: u })),
    });
  }
  if (usersToRemove.length > 0) {
    ops.push({
      op: 'remove',
      path: 'members',
      value: usersToRemove.map((u) => ({ value: u })),
    });
  }
  return {
    Operations: ops,
  };
};
