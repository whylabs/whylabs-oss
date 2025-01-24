import { Server } from 'http';
import { init } from '../../plugins/plugin-songbird';
import { apiKey } from './helpers/requests';
import { getOrgIdFromApiKey } from '../../helpers/apikey';
import { accountOrgId } from './config';

let scimServer: Server | undefined;

// jest.setTimeout(10 * 1000);
// Give yourself 5 minutes if you're debugging
jest.setTimeout(5 * 60 * 1000);

beforeAll(async () => {
  scimServer = init();
  if (!apiKey) {
    throw new Error('You need to set ACCOUNT_API_KEY to run these tests');
  }
  const orgId = getOrgIdFromApiKey(apiKey);
  if (orgId !== accountOrgId) {
    throw new Error(
      "Running tests on org ${orgId} rather than ${accountOrgId}. This will change the organization's members. If you are sure, update accountOrgId in config.ts",
    );
  }
});

// beforeEach(() => {});
// afterEach(() => {});

// Clean up after the tests are finished.
afterAll(async () => {
  if (scimServer) {
    scimServer.close();
  }
});
