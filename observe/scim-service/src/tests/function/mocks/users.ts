import { AccountUser, OrganizationRoleMembers, Role } from '@whylabs/songbird-node-client';
import { getOrgRoleFromGroup } from '../../../helpers/group';
import { notNullish } from '../../../helpers/checkers';
import { cloneDeep, pick } from 'lodash';
import { ScimUser } from '../../../types';
import { orgRoleForUser, supportedScimAttr } from '../../../songbird/songbird-wrapper';

export const user1Schema = {
  name: { givenName: 'Test', familyName: 'User' },
  emails: [{ value: 'user1@work.com', type: 'work', primary: true }],
};

export const defaultUsers: AccountUser[] = [
  {
    userId: 'user-0',
    orgId: 'org-account',
    email: 'user+0@test.com',
    userSchema: JSON.stringify(user1Schema),
    active: true,
  },
  {
    userId: 'user-1',
    orgId: 'org-account',
    email: 'user+1@test.com',
    userSchema: JSON.stringify(user1Schema),
    active: true,
  },
  {
    userId: 'user-3',
    orgId: 'org-account',
    email: 'user+3@test.com',
    active: true,
  },
  // deliberately out of order
  {
    userId: 'user-2',
    orgId: 'org-account',
    email: 'user+2@test.com',
    active: true,
  },
  {
    userId: 'user-4',
    orgId: 'org-account',
    email: 'user+4@test.com',
    active: false,
  },
];

// user-0 is in multiple orgs, including account
// user-1 and user-2 are both in org-managed-1
export const defaultMemberships: OrganizationRoleMembers[] = [
  {
    orgId: 'org-managed-1',
    role: Role.Viewer,
    members: [
      {
        userId: defaultUsers[0].userId,
        email: defaultUsers[0].userId,
      },
      {
        userId: defaultUsers[1].userId,
        email: defaultUsers[1].userId,
      },
    ],
  },
  {
    orgId: 'org-account',
    role: Role.Admin,
    members: [
      {
        userId: defaultUsers[0].userId,
        email: defaultUsers[0].userId,
      },
    ],
  },
  {
    orgId: 'org-managed-1',
    role: Role.Admin,
    members: [
      {
        userId: defaultUsers[2].userId,
        email: defaultUsers[2].userId,
      },
    ],
  },
  {
    orgId: 'org-managed-2',
    role: Role.Admin,
    members: [
      {
        userId: defaultUsers[0].userId,
        email: defaultUsers[0].userId,
      },
    ],
  },
];

export const legacyMemberships: OrganizationRoleMembers[] = [
  ...cloneDeep(defaultMemberships),
  {
    orgId: 'org-managed-1',
    role: Role.Member,
    members: [
      {
        userId: 'legacy-1',
        email: 'legacy+1@test.com',
      },
    ],
  },
];

export const updatedUser1: ScimUser = {
  id: 'user-1',
  userName: 'user+1@test.com',
  name: { givenName: 'Chris', familyName: 'Draper' },
  emails: [
    { value: 'cdraper@test.com', type: 'work' },
    { value: 'user+1@test.com', type: 'work', primary: true },
  ],
  active: true,
};

export const allUsers = (scenario: string): AccountUser[] => {
  switch (scenario) {
    // legacy should return the same as default, because legacy user is not in account table
    case 'legacy':
    default:
      return [...defaultUsers];
  }
};

export const allMemberships = (scenario: string): OrganizationRoleMembers[] => {
  switch (scenario) {
    case 'legacy':
      return [...legacyMemberships];
    default:
      return [...defaultMemberships];
  }
};

export const usersById = (scenario: string, userId: string): AccountUser | undefined => {
  const users = allUsers(scenario);
  return users.find((u) => u.userId === userId);
};

export const usersByEmail = (scenario: string, email: string): AccountUser | undefined => {
  const users = allUsers(scenario);
  return users.find((u) => u.email === email);
};

export const usersByGroup = (scenario: string, groupId: string): AccountUser[] => {
  const memberships = allMemberships(scenario);
  const [orgId, role] = getOrgRoleFromGroup(groupId) ?? [];
  return memberships
    .filter((entry) => entry.orgId === orgId && entry.role === role)
    .flatMap((entry) => entry.members)
    .map((member) => allUsers(scenario).find((u) => u.userId === member.userId))
    .filter(notNullish);
};

export const membershipsByGroup = (scenario: string, groupId: string): OrganizationRoleMembers[] | undefined => {
  const memberships = allMemberships(scenario);
  const [orgId, role] = getOrgRoleFromGroup(groupId) ?? [];
  return memberships.filter((m) => m.role === role && m.orgId === orgId);
};

export const membershipsByUser = (scenario: string, userId: string): OrganizationRoleMembers[] | undefined => {
  const memberships = allMemberships(scenario);
  return orgRoleForUser(userId, memberships);
};

const filterAttrs = [...supportedScimAttr, 'id'];
export const filteredUserAttrs = (user: ScimUser): Partial<ScimUser> => pick(user, filterAttrs);
