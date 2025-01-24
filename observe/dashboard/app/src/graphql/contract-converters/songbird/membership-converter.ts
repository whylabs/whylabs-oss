import { Role } from '@whylabs/songbird-node-client';
import { MembershipMetadata } from '@whylabs/songbird-node-client';

import { getLogger } from '../../../providers/logger';
import { Member, MembershipRole } from '../../generated/graphql';

const logger = getLogger('MembershipConverterLogger');

export const roleToGQL = (role?: Role | undefined): MembershipRole => {
  switch (role) {
    case Role.Admin:
      return MembershipRole.Admin;
    case Role.Member:
      return MembershipRole.Member;
    case Role.Viewer:
      return MembershipRole.Viewer;
    case undefined:
      return MembershipRole.Unknown;
    default:
      logger.error('Unknown membership role in contract: %s', role);
      return MembershipRole.Unknown;
  }
};

export const gqlToRole = (role: MembershipRole): Role => {
  switch (role) {
    case MembershipRole.Admin:
      return Role.Admin;
    case MembershipRole.Member:
      return Role.Member;
    case MembershipRole.Viewer:
      return Role.Viewer;
    default:
      return Role.Member;
  }
};

export const membershipToGQL = (membership: MembershipMetadata, email: string): Member => {
  const { userId, orgId, role } = membership;
  if (!userId || !orgId) throw new Error(`Invalid membership entry: ${JSON.stringify(membership)}`);
  return {
    userId,
    orgId,
    email,
    role: roleToGQL(role),
  };
};
