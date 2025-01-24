import { ScimGroup, ScimUser } from '../../../types';
import { defaultUsers, user1Schema } from '../mocks/users';

export const validateUser1 = (actual: ScimUser | ScimGroup): void => {
  const songbirdUser1 = defaultUsers[1];
  expect(actual).toEqual({
    id: songbirdUser1.userId,
    userName: songbirdUser1.email,
    active: songbirdUser1.active ?? true,
    name: user1Schema.name,
    emails: user1Schema.emails,
    groups: [
      {
        value: 'whylabs-org-managed-1:viewer',
        display: 'whylabs-org-managed-1:viewer',
        type: 'direct',
      },
    ],
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    meta: {
      resourceType: 'User',
      location: 'http://localhost:8891/Users/user-1',
    },
  });
};
