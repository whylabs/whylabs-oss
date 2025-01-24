import { MembershipRole } from '../types/api';

export interface Membership {
  role?: MembershipRole;
}

// Add information here very sparingly as it is stored in the cookie and may cause us to hit header limit
export type WhyLabsUserMetadata = {
  auth0Id: string;
  userId: string;
  email: string;
  name?: string;
  whylabsAdmin: boolean; // whether the user is a whylabs admin
  includeClaims: boolean; // whether the user logged in with claims
  impersonator?: string; // auth0 ID of impersonator - should not be persisted in Auth0
  impersonatorEmail?: string; // email of impersonator - should not be persisted in Auth0
  lastSyncedTimeInEpochMillis: number; // utc millis
};
