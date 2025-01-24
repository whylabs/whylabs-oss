import { InsightEntry } from '@whylabs/data-service-node-client';
import { Role } from '@whylabs/songbird-node-client';
import {
  GetMarketplaceMetadataResponse,
  ListOrganizationsResponse,
  OrganizationMetadata,
  OrganizationSummary,
} from '@whylabs/songbird-node-client';

import { WhyLabsUserMetadata } from '../../middleware/user-metadata';
import { DataServiceClient } from '../../services/data/data-service/data-service-client-factory';
import { SongbirdClient } from '../../services/data/songbird/songbird-client-factory';
import { Auth0ImpersonationMetadata } from '../../services/security/auth0-wrapper';
// Helpers
import { appRouter } from '../index';

export const getCaller = ({
  customSession = undefined,
  songbirdClient = getSongbirdClientMock(),
  dataServiceClient = getDataServiceClientMock(),
  auth0UserId = 'test-user-id',
  impersonation = undefined,
}: {
  customSession?: Partial<WhyLabsUserMetadata> | undefined;
  songbirdClient?: SongbirdClient;
  dataServiceClient?: DataServiceClient;
  auth0UserId?: string | undefined;
  impersonation?: Auth0ImpersonationMetadata;
} = {}): ReturnType<typeof appRouter.createCaller> => {
  const userMetadata = createSession(customSession);
  return appRouter.createCaller({
    userMetadata,
    songbirdClient,
    dataServiceClient,
    targetOrgId: undefined,
    auditOrigIp: undefined,
    auth0UserId,
    impersonation,
  });
};
const createSession = (custom: Partial<WhyLabsUserMetadata> = {}): WhyLabsUserMetadata => {
  return {
    auth0Id: 'auth0-id',
    defaultOrgId: 'org-test',
    userId: 'user-id',
    email: 'test.user@test.com',
    whylabsAdmin: false,
    lastSyncedTimeInEpochMillis: 100,
    includeClaims: false,
    memberships: [
      {
        orgId: 'org-test',
        role: Role.Admin,
      },
    ],
    ...custom,
  };
};

export type OrganizationsList = ListOrganizationsResponse['items'];
export const getSongbirdClientMock = (items?: OrganizationsList): SongbirdClient => ({
  // @ts-expect-error - Mocking only what is used in existent tests
  organizations: new OrganizationsApiMock(items),
});

class OrganizationsApiMock {
  items: OrganizationsList;

  constructor(items?: OrganizationsList) {
    this.items = items || new Set([]);
  }

  createOrganization = async (name: string): Promise<{ data: OrganizationSummary }> => {
    const newOrg = {
      id: `item${this.items.size}`,
      name,
    };
    this.items.add(newOrg);

    return { data: newOrg };
  };

  getOrganization = async (orgId: string): Promise<{ data: OrganizationMetadata | undefined }> => {
    const result = Array.from(this.items).find(({ id }) => id === orgId);
    if (!result) return { data: undefined };
    return { data: { ...result, creationTime: 0, deleted: false } };
  };

  getAWSMarketplaceMetadata = async (orgId: string): Promise<{ data: GetMarketplaceMetadataResponse }> => {
    const result = Array.from(this.items).find(({ id }) => id === orgId);
    // @ts-expect-error - for the test purpose it works well, I'm unsure on how the production implementation does that
    return { data: result.metadata };
  };

  listOrganizations = async (): Promise<{ data: ListOrganizationsResponse }> => {
    return { data: { items: this.items, internal: true } };
  };
}

export const getDataServiceClientMock = (): DataServiceClient => ({
  // @ts-expect-error - Mocking only what is used in existent tests
  profiles: new ProfilesAPIMock(),
});

class ProfilesAPIMock {
  singleProfileInsight = async (): Promise<{ data: InsightEntry[] }> => {
    return {
      data: [
        {
          name: 'mocked-insight',
          message: 'this is a mocked metric for testing purposes',
          metrics: { most_freq_value: 'whylabs' },
          column: 'column-name',
          description: 'description goes here',
        },
      ],
    };
  };
}
