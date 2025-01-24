import {
  GetMarketplaceMetadataResponse,
  OrganizationSummary,
  ProvisionNewAWSMarketplaceUserResponse,
  ProvisionNewUserResponse,
  SubscriptionTier,
} from '@whylabs/songbird-node-client';

import { serviceUrl } from '../../../../config';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { extractEmailDomain } from '../../../../util/misc';
import { songbirdClient } from '../songbird-client-factory';
import { logger, tryGetMetadata } from './utils';

export const partiallyUpdateOrganization = async (
  orgId: string,
  updates: Partial<OrganizationSummary>,
  options?: CallOptions,
): Promise<OrganizationSummary> => {
  let fieldDetails = '';
  if ('name' in updates) fieldDetails += `name: ${updates.name}`;
  if ('emailDomains' in updates) fieldDetails += `emailDomains: ${updates.emailDomains}`;
  if ('subscriptionTier' in updates) fieldDetails += `tier: ${updates.subscriptionTier}`;
  logger.info(`Updating organization ${orgId} fields ${Object.keys(updates).join(',')} - ${fieldDetails}`);

  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () =>
      client.organizations.partiallyUpdateOrganization(
        orgId,
        updates.name,
        updates.subscriptionTier ?? undefined,
        updates.emailDomains ?? undefined,
        undefined, // set by system
        undefined, // not currently user-updateable
        undefined, // storageBucketOverride is a new field, unused for now
        undefined, // storageUriOverride
        undefined, // allowManagedMembershipUpdatesOnly
        undefined, // useCloudFront
        axiosCallConfig(options),
      ),
    options,
  );

  return response.data;
};
export const updateOrganizationSubscriptionTier = async (
  orgId: string,
  newTier: SubscriptionTier,
  options?: CallOptions,
): Promise<OrganizationSummary> => {
  return partiallyUpdateOrganization(orgId, { subscriptionTier: newTier }, options);
};
export const getOrganization = async (orgId: string, options?: CallOptions): Promise<OrganizationSummary | null> => {
  const context = options?.context;
  logger.info('Getting org %s for user %s', orgId, context?.whylabsUserId ?? context?.auth0UserId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  return tryGetMetadata(
    () => client.organizations.getOrganization(orgId, axiosCallConfig(options)),
    true,
    options?.context,
  );
};
export const getAWSMarketplaceMetadata = async (
  orgId: string,
  options?: CallOptions,
): Promise<GetMarketplaceMetadataResponse | null> => {
  logger.info('Getting aws marketplace metadata %s', orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  return tryGetMetadata(
    () => client.organizations.getAWSMarketplaceMetadata(orgId, axiosCallConfig(options)),
    true,
    options?.context,
  );
};
export const getOrganizations = async (options?: CallOptions): Promise<OrganizationSummary[]> => {
  logger.info('Fetching all available organizations');
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(() => client.organizations.listOrganizations(axiosCallConfig(options)), options);
  return Array.from(response.data.items);
};
export const createOrganizationWithDefaults = async (
  name: string,
  subscriptionTier: SubscriptionTier,
  options?: CallOptions,
): Promise<OrganizationSummary> => {
  return createOrganization(name, subscriptionTier, serviceUrl, undefined, options);
};
export const createOrganization = async (
  name: string,
  subscriptionTier: SubscriptionTier,
  observatoryUrl: string,
  emailDomains?: string,
  options?: CallOptions,
): Promise<OrganizationSummary> => {
  logger.info('Creating org with name %s, subscription tier %s', name, subscriptionTier);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () =>
      client.organizations.createOrganization(
        name,
        subscriptionTier,
        emailDomains,
        undefined, // overrideId
        observatoryUrl,
        undefined,
        undefined, // storageBucketOverride is a new field, unused for now
        undefined, // storageUriOverride
        undefined, // allowManagedMembershipUpdatesOnly
        undefined, // useCloudFront
        axiosCallConfig(options),
      ),
    options,
  );
  return response.data;
};
export const updateOrganizationEmailDomains = async (
  orgId: string,
  newEmailDomains?: string,
  options?: CallOptions,
): Promise<OrganizationSummary> => {
  return partiallyUpdateOrganization(orgId, { emailDomains: newEmailDomains }, options);
};
export const provisionAWSMarketplaceOrganization = async (
  orgName: string,
  modelName: string,
  email: string,
  auth0UserID: string,
  customerIdToken: string,
  options?: CallOptions,
): Promise<ProvisionNewAWSMarketplaceUserResponse> => {
  logger.info(
    'Starting aws marketplace organization provisioning for Auth0 user %s, domain %s',
    auth0UserID,
    extractEmailDomain(email),
  );
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () =>
      client.provisioning.provisionAWSMarketplaceNewUser(
        {
          email,
          orgName,
          modelName,
          customerIdToken,
        },
        axiosCallConfig(options),
      ),
    options,
  );

  logger.info('Created an org for user %s: %s', auth0UserID, response.data.orgId);
  return response.data;
};
export const provisionOrganization = async (
  orgName: string,
  modelName: string,
  email: string,
  auth0UserID: string,
  expectExisting: boolean,
  options?: CallOptions,
): Promise<ProvisionNewUserResponse> => {
  logger.info(
    'Starting organization provisioning for Auth0 user %s, domain %s',
    auth0UserID,
    extractEmailDomain(email),
  );
  const client = options?.context?.songbirdClient ?? songbirdClient;
  const response = await tryCall(
    () =>
      client.provisioning.provisionNewUser(
        {
          orgName,
          modelName,
          email,
          expectExisting,
          subscriptionTier: SubscriptionTier.Free, // always provision free orgs for now
        },
        axiosCallConfig(options),
      ),
    options,
  );

  logger.info('Created an org for user %s: %s', auth0UserID, response.data.orgId);
  return response.data;
};
