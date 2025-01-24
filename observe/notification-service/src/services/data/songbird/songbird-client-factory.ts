import {
  ApiKeyApi,
  Configuration,
  ModelsApi,
  MonitorApi,
  NotificationSettingsApi,
  OrganizationsApi,
  UserApi,
} from '@whylabs/songbird-node-client';
import { AssumeRoleRequest, Credentials } from '@aws-sdk/client-sts';
import { sts } from '../../../providers/aws';
import { config } from '../../../config';

const { environment } = config;
const { roleArn, endpoint: basePath } = config.songbird;

interface SongbirdClient {
  models: ModelsApi;
  monitor: MonitorApi;
  organizations: OrganizationsApi;
  notifications: NotificationSettingsApi;
  users: UserApi;
  apiKeys: ApiKeyApi;
}

interface SongbirdCredentials {
  credentials: string;
  expiration: number;
}

let cachedCredentials: SongbirdCredentials;

const getSongbirdCredentials = async (): Promise<string> => {
  if (!cachedCredentials || Date.now() >= cachedCredentials.expiration) {
    if (!roleArn)
      throw new Error('No Songbird role arn specified in the current environment. Was the relevant env var set?');

    const assumeRoleRequest: AssumeRoleRequest = {
      RoleArn: roleArn,
      RoleSessionName: `siren-service-${environment}`,
      DurationSeconds: 15 * 60, // 15 minutes
    };
    const assumeRoleResponse = await sts.assumeRole(assumeRoleRequest);

    // throw if there are no credentials, or the credentials object is missing any fields
    if (
      !assumeRoleResponse.Credentials ||
      Object.keys(assumeRoleResponse.Credentials).some(
        (key) => assumeRoleResponse.Credentials && assumeRoleResponse.Credentials[key as keyof Credentials] == null,
      )
    )
      throw new Error('Could not obtain credentials from STS');

    const { AccessKeyId, SecretAccessKey, SessionToken, Expiration } = assumeRoleResponse.Credentials;
    // expire credentials a minute before real expiration time to avoid creds expiring during api calls
    const expiration = Expiration ? Expiration.valueOf() - 60 * 1000 : Date.now() + 15 * 60 * 1000;
    cachedCredentials = {
      credentials: JSON.stringify({ AccessKeyId, SecretAccessKey, SessionToken }),
      expiration,
    };
  }

  return cachedCredentials.credentials;
};

const clientConfig = new Configuration({ apiKey: getSongbirdCredentials, basePath });

export const songbirdClient: SongbirdClient = {
  models: new ModelsApi(clientConfig),
  monitor: new MonitorApi(clientConfig),
  organizations: new OrganizationsApi(clientConfig),
  notifications: new NotificationSettingsApi(clientConfig),
  users: new UserApi(clientConfig),
  apiKeys: new ApiKeyApi(clientConfig),
};
