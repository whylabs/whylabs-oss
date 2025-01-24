import { expect } from 'chai';
import { uniq } from 'ramda';

import { MembershipRole, Permission } from '../../../types/api';
import { getRoleOrWhyLabPermissions } from './authorization';

describe('Test Authorization functions', function () {
  describe('getRolePermissions', function () {
    it('should return MANAGE_INTERNAL for whylabs admin', function () {
      expect(getRoleOrWhyLabPermissions(MembershipRole.Admin, true)).to.include(Permission.ManageInternal);
    });

    it('should not return MANAGE_INTERNAL for non admin', function () {
      expect(getRoleOrWhyLabPermissions(MembershipRole.Admin, false)).not.to.include(Permission.ManageInternal);
    });

    it('should return the same permissions in successive calls', function () {
      const permissions1 = getRoleOrWhyLabPermissions(MembershipRole.Admin, false);
      const permissions2 = getRoleOrWhyLabPermissions(MembershipRole.Admin, false);
      expect(permissions1).to.eql(permissions2);
      expect(permissions1).to.eql(uniq(permissions1));
    });
  });
});
