import { TRPCError, inferProcedureInput } from '@trpc/server';
import { SubscriptionTier } from '@whylabs/songbird-node-client';
import { MarketplaceDimensions } from '@whylabs/songbird-node-client';
import chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { AppRouter } from '../index';
import { OrganizationsList, getCaller, getSongbirdClientMock } from '../util/testUtils.spec';

chai.use(chaiAsPromised);

const nonAdminCallerInfo = {
  customSession: { whylabsAdmin: false },
  songbirdClient: getSongbirdClientMock(),
};
const adminCallerInfo = {
  customSession: { whylabsAdmin: true },
  songbirdClient: getSongbirdClientMock(
    new Set([
      { id: 'org-test1', name: 'test1' },
      { id: 'org-test2', name: 'test2' },
    ]),
  ),
};
const expectEventuallyToBeForbidden = async <T>(promise: Promise<T>): Promise<void> =>
  expect(promise).to.be.rejected.then((error) => {
    expect(error).to.be.an.instanceOf(TRPCError);
    expect(error.code).to.equal('FORBIDDEN');
  });

describe('TRPC admin.organizations', function () {
  describe('admin.organizations.list', function () {
    it('should require whylabs admin', async function () {
      const caller = getCaller(nonAdminCallerInfo);
      await expectEventuallyToBeForbidden(caller.admin.organizations.list());
    });

    it('should return an empty list', async function () {
      const caller = getCaller({ customSession: { whylabsAdmin: true }, songbirdClient: getSongbirdClientMock() });

      const result = await caller.admin.organizations.list();
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return list of organizations', async function () {
      const organizations: OrganizationsList = new Set([
        { id: 'org-test1', name: 'test1' },
        { id: 'org-test2', name: 'test2' },
      ]);
      const caller = getCaller(adminCallerInfo);

      const result = await caller.admin.organizations.list();

      expect(result).to.have.length(organizations.size);
      expect(result).to.deep.equal(Array.from(organizations));
    });
  });

  describe('admin.organizations.create', function () {
    it('should require whylabs admin', async function () {
      const caller = getCaller(nonAdminCallerInfo);
      await expectEventuallyToBeForbidden(
        caller.admin.organizations.create({ name: 'Org Test 3', tier: SubscriptionTier.Free }),
      );
    });

    it('should create a new item', async function () {
      const caller = getCaller({ customSession: { whylabsAdmin: true }, songbirdClient: getSongbirdClientMock() });

      type InputType = inferProcedureInput<AppRouter['admin']['organizations']['create']>;
      const input: InputType = { name: 'Org Test 3', tier: SubscriptionTier.Free };
      await caller.admin.organizations.create(input);

      const result = await caller.admin.organizations.list();
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('Org Test 3');
    });
  });

  describe('admin.organizations.describe', function () {
    it('should require whylabs admin', async function () {
      const caller = getCaller(nonAdminCallerInfo);
      await expectEventuallyToBeForbidden(caller.admin.organizations.describe({ id: 'org-test2' }));
    });

    it('should get item by its id', async function () {
      const organizations: OrganizationsList = new Set([
        { id: 'org-test1', name: 'Org 1' },
        { id: 'org-test2', name: 'Org 2' },
        { id: 'org-test3', name: 'Org 3' },
      ]);
      const [, secondOrg] = organizations;

      const songbirdClient = getSongbirdClientMock(organizations);
      const caller = getCaller({ customSession: { whylabsAdmin: true }, songbirdClient });

      type InputType = inferProcedureInput<AppRouter['admin']['organizations']['describe']>;
      const input: InputType = { id: 'org-test2' };
      const result = await caller.admin.organizations.describe(input);
      expect(result).to.eql({ ...secondOrg, creationTime: 0, deleted: false });
    });
  });

  describe('admin.organizations.getAWSMarketplaceMetadata', function () {
    it('should require whylabs admin', async function () {
      const caller = getCaller(nonAdminCallerInfo);
      await expectEventuallyToBeForbidden(caller.admin.organizations.describe({ id: 'org-test1' }));
    });

    it('should get item metadata', async function () {
      const metadata = {
        orgId: 'org-test1',
        awsMarketplaceCustomerId: 'org-test1-customerid',
        awsMarketplaceProductCode: 'whatever',
        dimension: MarketplaceDimensions.Free,
        expirationTime: '123',
        expirationUpdateTime: '123',
      };
      const organizations: OrganizationsList = new Set([
        {
          id: 'org-test1',
          name: 'Org 1',
          metadata,
        },
      ]);

      const songbirdClient = getSongbirdClientMock(organizations);
      const caller = getCaller({ customSession: { whylabsAdmin: true }, songbirdClient });

      type InputType = inferProcedureInput<AppRouter['admin']['organizations']['getAWSMarketplaceMetadata']>;
      const input: InputType = { id: 'org-test1' };
      const result = await caller.admin.organizations.getAWSMarketplaceMetadata(input);
      expect(result).to.eql(metadata);
    });
  });
});
