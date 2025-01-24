import { Role } from '@whylabs/songbird-node-client';
import { uniq } from 'ramda';

import { WHYLABS_OIDC_ROLE_KEY } from '../../../constants';
import { getLogger } from '../../../providers/logger';
import { WhyLabsRole } from '../../../services/security/auth0-wrapper';
import { expect } from '../../../tests/integration-common';
import { isWhyLabsAdmin } from '../../../util/security-utils';
import { GraphQLContext } from '../../context';
import { AuthDirectiveArgs, Permission } from '../../generated/graphql';
import { checkPermissionsAndResolve, getRoleOrWhyLabPermissions } from './authorization';

const logger = getLogger('TestLogger');

const getMockAuth0User = (role: string) => ({
  sub: 'test@user.com',
  email_verified: true,
  [WHYLABS_OIDC_ROLE_KEY]: [role],
});

const getMockGQLContext = (role: Role | null = null, whylabsRole: WhyLabsRole = 'some-fake-role'): GraphQLContext => {
  const mockAuth0User = getMockAuth0User(whylabsRole);
  return {
    userContext: {
      auth0Id: mockAuth0User.sub,
      membership: { role },
      permissions: getRoleOrWhyLabPermissions(role, isWhyLabsAdmin(mockAuth0User)),
    },
    request: {
      id: '123', // TODO: figure out how to type this properly, so we don't have to resort to the double typecast below
    },
  } as unknown as GraphQLContext;
};

describe('Test Authorization functions', function () {
  const testResolverResult = 'resolved-data';
  const testResolver = () => testResolverResult;
  const unauthorizedErrorCode = 'Unauthorized';

  describe('Authorization Directive', function () {
    it('should allow users with view data privilege to access resources that dont have any special authz requirements', function () {
      const args: AuthDirectiveArgs = {
        // no special reqs
      };
      const context = getMockGQLContext(Role.Viewer);
      expect(checkPermissionsAndResolve(args, context, logger, testResolver)).to.eq(testResolverResult);
    });

    it('should prevent users without a role from accessing resources that dont have any special authz requirements', function () {
      const args: AuthDirectiveArgs = {
        // no special reqs
      };
      const context = getMockGQLContext(null);
      expect(() => {
        checkPermissionsAndResolve(args, context, logger, testResolver);
      }).to.throw(unauthorizedErrorCode);
    });

    it('should prevent viewers from accessing resources that require manage permission', function () {
      const args: AuthDirectiveArgs = {
        permissions: [Permission.ManageMonitors],
      };
      const context = getMockGQLContext();
      expect(() => {
        checkPermissionsAndResolve(args, context, logger, testResolver);
      }).to.throw(unauthorizedErrorCode);
    });

    it('should allow users to access resources with skipped permissions check', function () {
      const args: AuthDirectiveArgs = {
        skipPermissionsCheck: true,
      };
      const context = getMockGQLContext();
      expect(checkPermissionsAndResolve(args, context, logger, testResolver)).to.eq(testResolverResult);
    });

    it('should allow WhyLabs users to access internal admin resources', function () {
      const args: AuthDirectiveArgs = {
        permissions: [Permission.ManageInternal],
      };
      const context = getMockGQLContext(Role.Viewer, 'WhyLabs Admin');
      expect(checkPermissionsAndResolve(args, context, logger, testResolver)).to.eq(testResolverResult);
    });

    it('should prevent non-WhyLabs users from accessing internal admin resources', function () {
      const args: AuthDirectiveArgs = {
        permissions: [Permission.ManageInternal],
      };
      const context = getMockGQLContext(Role.Admin, 'some-random-role');
      expect(() => checkPermissionsAndResolve(args, context, logger, testResolver)).to.throw(unauthorizedErrorCode);
    });

    it('should not be possible to skip permissions check for whylabs-only resources', function () {
      const args: AuthDirectiveArgs = {
        permissions: [Permission.ManageInternal],
        skipPermissionsCheck: true,
      };
      const context = getMockGQLContext(Role.Admin, 'some-random-role');
      expect(() => checkPermissionsAndResolve(args, context, logger, testResolver)).to.throw(unauthorizedErrorCode);
    });
    describe('getRolePermissions', function () {
      it('should return MANAGE_INTERNAL for whylabs admin', function () {
        expect(getRoleOrWhyLabPermissions(Role.Admin, isWhyLabsAdmin(getMockAuth0User('WhyLabs Admin')))).to.include(
          Permission.ManageInternal,
        );
      });

      it('should not return MANAGE_INTERNAL for non admin', function () {
        expect(getRoleOrWhyLabPermissions(Role.Admin, isWhyLabsAdmin(getMockAuth0User('some role')))).not.to.include(
          Permission.ManageInternal,
        );
      });

      it('should return the same permissions in successive calls', function () {
        const mockAuth0User = getMockAuth0User('WhyLabs Admin');
        const permissions1 = getRoleOrWhyLabPermissions(Role.Admin, isWhyLabsAdmin(mockAuth0User));
        const permissions2 = getRoleOrWhyLabPermissions(Role.Admin, isWhyLabsAdmin(mockAuth0User));
        expect(permissions1).to.eql(permissions2);
        expect(permissions1).to.eql(uniq(permissions1));
      });
    });
  });
});
