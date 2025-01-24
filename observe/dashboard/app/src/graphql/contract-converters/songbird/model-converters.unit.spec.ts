import { ModelType } from '@whylabs/songbird-node-client';
import { expect } from 'chai';

import { ModelType as GQLAssetType } from '../../generated/graphql';
import { gqlAssetTypeToContract } from './model-converters';

describe('Converting models works', function () {
  describe('gqlAssetTypeToContract', function () {
    it('converts Unknown gql asset types to undefined', function () {
      expect(gqlAssetTypeToContract(null)).to.eq(undefined);
      expect(gqlAssetTypeToContract(undefined)).to.eq(undefined);
      expect(gqlAssetTypeToContract(GQLAssetType.Unknown)).to.eq(undefined);
    });

    it('converts known gql asset types to their counterpart', function () {
      expect(gqlAssetTypeToContract(GQLAssetType.Classification)).to.eq(ModelType.Classification);
      // no need to test everything here, that util func is pretty straightforward
    });
  });
});
