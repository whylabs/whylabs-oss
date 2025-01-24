import { config as devConfig } from './config/development';
import { config as intConfig } from './config/integration';
import { config as localConfig } from './config/local';
import { config as prodConfig } from './config/production';

type Environment = 'local' | 'development' | 'integration' | 'production';

export interface Configuration {
  readonly defaultUrlDomain: string;
  readonly environment: Environment;
  readonly region: string;
  readonly latestCommit?: string;
  readonly sqs: {
    /* Digest notifications */
    readonly digestQueueName?: string;

    /* Analytic/metric events from other services */
    readonly eventsQueueName?: string;
    readonly eventsDLQName?: string;

    /* User membership event notifications */
    readonly userMembershipNotificationQueueName?: string;

    /* Test notification event */
    readonly testNotificationQueueName?: string;

    /* Monitor notification queue */
    readonly monitorNotificationQueueName?: string;

    /* How often to poll for new messages, in milliseconds */
    readonly pollIntervalMs: number;

    /* How many messages to request from the queue */
    readonly maxNumberOfMessages: number;

    /* How long to wait for messages */
    readonly longPollSeconds: number;
  };
  readonly metadataBucketName?: string;
  readonly ses: {
    readonly fromName: string;
    readonly fromEmail: string;
  };
  readonly songbird: {
    endpoint?: string;
    roleArn?: string;
  };
  readonly test: {
    orgId: string;
    monitorId: string;
    monitorDisplayName: string;
    datasetId: string;
    datasetName: string;
    columnName: string;
  };
}

const getConfigForEnv = (nodeEnvVar?: string): Configuration => {
  switch (nodeEnvVar) {
    case 'local':
      return localConfig;
    case 'development':
      return devConfig;
    case 'integration':
      return intConfig;
    case 'production':
      return prodConfig;
    case 'test':
      return devConfig;
    default:
      throw new Error(`Attempted to load config for unknown environment ${nodeEnvVar}`);
  }
};

const getSongbirdConfig = (): Configuration['songbird'] => ({
  roleArn: process.env.SONGBIRD_ROLE_ARN,
  endpoint: process.env.SONGBIRD_API_ENDPOINT,
});

export const config: Configuration = {
  ...getConfigForEnv(process.env.NODE_ENV),
  songbird: getSongbirdConfig(),
  metadataBucketName: process.env.METADATA_BUCKET ?? 'development-db-metadata-20211118232856376200000001',
  latestCommit: process.env.LATEST_COMMIT,
};

export const port = process.env.PORT ? Number(process.env.PORT) : 3000;
