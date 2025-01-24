import { MockedResponse } from '@apollo/client/testing';
import {
  GetUsersOrganizationMembersDocument,
  GetUsersOrganizationMembersQuery,
  MembershipRole,
} from 'generated/graphql';

const members = [
  { email: 'john.doe@whylabs.com', role: MembershipRole.Admin, userId: '1' },
  { email: 'jane.doe@whylabs.com', role: MembershipRole.Admin, userId: '2' },
  { email: 'tom.doe@whylabs.com', role: MembershipRole.Admin, userId: '3' },
];

const mockedMembersData: GetUsersOrganizationMembersQuery = {
  user: {
    isAuthenticated: true,
    auth0Id: '0',
    name: 'Bob',
    organization: {
      id: '0',
      members,
    },
  },
};

const getOrganizationMembersMockedQuery: MockedResponse = {
  request: {
    query: GetUsersOrganizationMembersDocument,
  },
  result: {
    data: mockedMembersData,
  },
};

export const queryMock: ReadonlyArray<MockedResponse> = [
  {
    ...getOrganizationMembersMockedQuery,
  },
];
