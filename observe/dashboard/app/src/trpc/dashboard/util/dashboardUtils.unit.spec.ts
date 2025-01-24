import { assert, expect } from 'chai';

import { readUsedOnDashboard } from './dashboardUtils';

describe('dashboardUtils', function () {
  describe('readUsedOnDashboard()', function () {
    it('returns null when usedOn is null', function () {
      const result = readUsedOnDashboard(null);
      expect(result).to.be.null;
    });

    it('returns null when usedOn is undefined', function () {
      const result = readUsedOnDashboard(undefined);
      expect(result).to.be.null;
    });

    it('returns null when usedOn is %p', function () {
      const result = readUsedOnDashboard('');
      expect(result).to.be.null;
    });

    it('returns an object resourceId, and meta when usedOn is in the correct format', function () {
      const usedOn = 'resource|model-0';
      const result = readUsedOnDashboard(usedOn);
      assert.deepEqual(result, { meta: 'resource', resourceId: 'model-0', raw: usedOn });
    });

    it('returns does not return resourceId when meta is not resource', function () {
      const usedOn = 'not-resource|anotherId';
      const result = readUsedOnDashboard(usedOn);
      expect(result).to.be.null;
    });

    it('returns does not return resourceId when it is missing', function () {
      const usedOn = 'resource';
      const result = readUsedOnDashboard(usedOn);
      expect(result).to.be.null;
    });
  });
});
