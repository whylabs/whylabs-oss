import { CurrentUser } from '~/types/userTypes';
import LogRocket from 'logrocket';

import { clearHeapSession } from './ClearHeapSession';
import { toTrackableUser } from './common';

/**
 * Note: the keys in this dictionary is what gets published to Heap
 * We use these to set up filters in Heap for our Dashboards
 * Don't change the keys on this dictionary without making the corresponding changes in Heap and/or checking with CRM team
 */
type HeapEventProperties = {
  'Organization ID': string;
  'Organization Name': string;
  'Organization Subscription Tier': string;
  'Auth0 ID': string;
};

// Include all Heap Event properties in here for backwards compatibility.
// Technically this should only be props that are tightly coupled with the User entity, such as the user's email
type HeapUserProperties = HeapEventProperties & {
  // email property name must be lower case: https://developers.heap.io/reference#adduserproperties
  email?: string;
};

type HeapProperties = HeapEventProperties | HeapUserProperties;

declare global {
  interface Window {
    // https://developers.heap.io/reference#client-side-apis-overview
    heap?: {
      appid?: string;
      loaded?: boolean;
      identify?: (userId: string) => void;
      addUserProperties?: (props: HeapProperties) => void;
      addEventProperties?: (props: HeapProperties) => void;
      clearEventProperties?: () => void;
    };
  }
}

/**
 * Ensures Heap has loaded. Should only be called once per application load, to avoid spamming LogRocket
 */
export const ensureHeapAnalytics = (): void => {
  const delaySeconds = 5; // give Heap some time to initialize
  setTimeout(() => {
    if (!window.heap?.loaded) {
      LogRocket.error(`Heap did not load after ${delaySeconds} seconds`);
    }
  }, delaySeconds * 1000);
};

export const initHeapSession = (user: CurrentUser): void => {
  /*
   * Identify establishes user identity for analytics purposes
   * We'll also want to add some additional user properties in the future, e.g. position, permissions, etc
   */
  const trackableUser = toTrackableUser(user);

  if (!trackableUser) {
    return;
  }

  const { heap } = window;
  if (!heap) {
    return;
  }

  // clear the session properties before updating them per Heap's recommendation:
  // https://developers.heap.io/reference#addeventproperties
  clearHeapSession();

  const heapEventProps: HeapEventProperties = {
    'Organization ID': trackableUser.organization.id,
    'Organization Name': trackableUser.organization.name,
    'Organization Subscription Tier': trackableUser.organization.subscriptionTier,
    'Auth0 ID': trackableUser.auth0Id,
  };

  /**
   * Establish user identity
   * Try to use WhyLabs User ID if available, fall back to Auth0 ID.
   * WhyLabs ID is the most consistent, because Auth0 ID varies depending on *how* the user logged in (google, linkedin, etc)
   */
  if (heap.identify) {
    heap.identify(trackableUser.whyLabsId ?? trackableUser.auth0Id);
  }

  /**
   * Add User properties
   * These are the properties that will NOT change between Sessions
   */
  if (heap.addUserProperties) {
    heap.addUserProperties({
      // adding event properties in here as well for backwards compatibility with existing Heap filters
      ...heapEventProps,
      email: trackableUser.email,
    });
  }

  /**
   * Add Session-specific information
   * These are the properties that can change between logins or during the Session
   * (e.g. Organization can change)
   */
  if (heap.addEventProperties) {
    heap.addEventProperties(heapEventProps);
  }
};
