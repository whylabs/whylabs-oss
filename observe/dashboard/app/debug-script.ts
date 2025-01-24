import { getOrganizations } from './src/services/data/songbird/api-wrappers/organizations';

/**
 * Hi,
 *
 * I am a helper script for debugging and automation purposes. You can modify me as needed to fulfill some greater purpose.
 * Thus I serve. For Aiur!
 *
 * Run me with:
 * ts-node -r dotenv/config --files debug-script.ts
 *
 * See README for more information
 */
const someScript = async (): Promise<void> => {
  const allOrgs = await getOrganizations();
  const filteredOrgs = allOrgs.filter(
    (o) =>
      !o.name?.toLocaleLowerCase().includes('test-org') &&
      !o.name?.toLocaleLowerCase().includes('integration') &&
      !o.name?.toLocaleLowerCase().includes('org name'),
  );
  console.log(`Found ${filteredOrgs.length} organizations`);
};

someScript();
