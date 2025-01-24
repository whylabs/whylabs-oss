import { CurrentUser } from '~/types/userTypes';

import { toTrackableUser } from './common';

export const initPendoSession = (user: CurrentUser): void => {
  const trackableUser = toTrackableUser(user);
  if (!trackableUser) {
    // no-op
    return;
  }

  pendo.initialize({
    visitor: {
      id: trackableUser.auth0Id, // Required if user is logged in
      orgId: trackableUser.organization.id,
      email: trackableUser.email,

      // You can add any additional visitor level key-values here,
      // as long as it's not one of the above reserved names.
    },
  });
};
