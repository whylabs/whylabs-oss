import { BatchProfileFragment, ReferenceProfileFragment } from 'generated/graphql';
import { dateTimeFull } from './dateUtils';

export const getProfileName = (
  profile: BatchProfileFragment | ReferenceProfileFragment | undefined,
): string | undefined => {
  if (profile) {
    return 'alias' in profile ? profile.alias : dateTimeFull(profile.timestamp);
  }
  return undefined;
};
