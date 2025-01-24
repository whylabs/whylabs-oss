import {
  AdminApi,
  ApiKeyApi,
  Configuration,
  DatasetProfileApi,
  EmbeddingsApi,
  FeatureFlagsApi,
  FeatureWeightsApi,
  LogApi,
  MembershipApi,
  ModelsApi,
  MonitorApi,
  NotificationSettingsApi,
  OrganizationsApi,
  PolicyApi,
  ProvisionApi,
  SecurityApi,
  SessionsApi,
  UserApi,
} from '@whylabs/songbird-node-client';
// This and the cast as below is an ugly workaround because the Api may pickup the wrong axios prior to this
import { AxiosInstance as OrigAxiosInstance } from 'axios';
import axios from 'axios-song';

import { config } from '../../../config';
import { OpenAPIClientKind, getOpenAPIClientConfig, getStandardOpenApiOptions } from '../openapi-client-factory';

const { endpoint: basePath } = config.songbird;

const songbirdConfig = getOpenAPIClientConfig(OpenAPIClientKind.Songbird);

/**
 * Note: config MUST be provided to every API, otherwise songbird client auth will not function correctly
 */
const getClient = (config: Configuration) => {
  const axiosInstance: OrigAxiosInstance = axios.create(config.baseOptions) as OrigAxiosInstance;

  return {
    profiles: new DatasetProfileApi(config, undefined, axiosInstance),
    models: new ModelsApi(config, undefined, axiosInstance),
    sessions: new SessionsApi(config, undefined, axiosInstance),
    users: new UserApi(config, undefined, axiosInstance),
    membership: new MembershipApi(config, undefined, axiosInstance),
    organizations: new OrganizationsApi(config, undefined, axiosInstance),
    notifications: new NotificationSettingsApi(config, undefined, axiosInstance),
    apiKeys: new ApiKeyApi(config, undefined, axiosInstance),
    provisioning: new ProvisionApi(config, undefined, axiosInstance),
    log: new LogApi(config, undefined, axiosInstance),
    featureFlags: new FeatureFlagsApi(config, undefined, axiosInstance),
    monitors: new MonitorApi(config, undefined, axiosInstance),
    weights: new FeatureWeightsApi(config, undefined, axiosInstance),
    security: new SecurityApi(config, undefined, axiosInstance),
    policy: new PolicyApi(config, undefined, axiosInstance),
    admin: new AdminApi(config, undefined, axiosInstance),
    embeddings: new EmbeddingsApi(config, undefined, axiosInstance),
  };
};

export type SongbirdClient = ReturnType<typeof getClient>;

export const songbirdClient = getClient(songbirdConfig);

export const getUserSpecificSongbirdClient = (apiKey: string): SongbirdClient => {
  const config = new Configuration({ apiKey: apiKey, basePath, baseOptions: getStandardOpenApiOptions() });
  return getClient(config);
};
