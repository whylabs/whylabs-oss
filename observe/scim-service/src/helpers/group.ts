import { Role } from '@whylabs/songbird-node-client';
import { scimRequestError } from './errors';

export const getOrgRoleFromGroup = (group: string): [string, Role] | null => {
  if (!group) return null;
  const groupParts = group.split(':');
  if (groupParts.length < 2) return null;
  const groupOrg = groupParts[0].replace('whylabs-', '');
  const groupRole = Object.values(Role).find((role) => role === groupParts[1].toUpperCase());
  if (!groupRole) return null;
  return [groupOrg, groupRole];
};

export const getOrgRoleFromGroupOrThrow = (group: string): [string, Role] => {
  const orgRole = getOrgRoleFromGroup(group);
  if (!orgRole) {
    throw scimRequestError(`${group} is not a valid WhyLabs orgId:role`, 'invalidValue');
  }
  return orgRole;
};
