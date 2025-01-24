import { generateApiKey } from '../../services/data/songbird/api-wrappers/api-keys';
import {
  SongbirdClient,
  getUserSpecificSongbirdClient,
  songbirdClient as mainSongbirdClient,
} from '../../services/data/songbird/songbird-client-factory';
import { expect } from '../integration-common';

const TestNonWhyLabsOrg = 'org-9758';
const TestNonWhyLabsUserId = 'bob';

describe('APIKeys', function () {
  let testKey: string;
  let testKeyId: string;
  let testSongbirdClient: SongbirdClient;
  before(async function () {
    const newKey = await generateApiKey(
      TestNonWhyLabsOrg,
      TestNonWhyLabsUserId,
      'int_test_key',
      Date.now() + 3 * 60 * 1000,
    );

    if (!newKey.key || !newKey.keyId) throw new Error('Failed to generate api key');
    testKey = newKey.key;
    testKeyId = newKey.keyId;
    testSongbirdClient = getUserSpecificSongbirdClient(testKey);
  });

  describe('API Access', function () {
    it('should not be able to create orgs', async function () {
      await expect(testSongbirdClient.organizations.createOrganization('test')).to.be.rejected;
    });

    it('should not be able to list orgs', async function () {
      await expect(testSongbirdClient.organizations.listOrganizations()).to.be.rejected;
    });

    it('should be able to list models for its own org', async function () {
      const models = await testSongbirdClient.models.listModels(TestNonWhyLabsOrg);
      expect(Array.from(models.data.items).length).to.be.gte(0);
    });

    it('the key should no longer work after being revoked', async function () {
      // revoke key using system client
      await mainSongbirdClient.apiKeys.revokeApiKey(TestNonWhyLabsOrg, TestNonWhyLabsUserId, testKeyId);

      // try using key using the user's client
      await expect(testSongbirdClient.organizations.listOrganizations()).to.be.rejected;
    });

    after(async function () {
      await mainSongbirdClient.apiKeys.revokeApiKey(TestNonWhyLabsOrg, TestNonWhyLabsUserId, testKeyId);
    });
  });
});
