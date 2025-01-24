import { config as devConfig } from './config/development';
import { config as localConfig } from './config/local';
import { config as enterpriseConfig } from './config/production-enterprise';
import { getNumericEnvVar } from './util/misc';

export type Stage = 'local' | 'test' | 'development' | 'production' | 'production-enterprise';

interface ExtendedConfig extends Configuration {
  stage: Stage;
}

export interface Configuration {
  readonly region: string;
  readonly ddCspReportingUrl: string;
  readonly analytics: {
    readonly heapAppId: string;
    readonly googleAppId: string;
    readonly pendoSubId: string;
  };
  readonly networking: {
    // set keepalive timeouts to be longer than load balancer timeouts to prevent random 502s
    // see here: https://shuheikagawa.com/blog/2019/04/25/keep-alive-timeout/
    readonly keepAliveTimeout: number;
    // This should be bigger than `keepAliveTimeout + the server's expected response time`
    readonly headersTimeout: number;
  };
  // total number of instances of Dashbird running in the current deployment environment
  readonly totalNodes?: number;
  readonly storage: {
    readonly cloudWatchAuditLogGroup?: string;
    readonly cloudWatchAuditLogStream?: string;
    readonly metadataBucket?: string;
  };
  readonly songbird: {
    readonly endpoint?: string;
    readonly roleArn?: string;
  };
  readonly dataService?: {
    readonly endpoint?: string;
    readonly roleArn?: string;
  };
  readonly feedbackSecretId?: string;
  readonly demos?: {
    readonly demoOrgId?: string; // organization that holds demo data that can be viewed by anyone
  };
}

export const latestCommit = process.env.LATEST_COMMIT ?? 'unknown';

const getConfigForStage = (stage?: Stage): Configuration => {
  switch (stage) {
    case 'local':
      return localConfig;
    case 'test':
    case 'development':
      return devConfig;
    case 'production':
      return enterpriseConfig;
    case 'production-enterprise':
      return enterpriseConfig;
    default:
      throw new Error(`Attempted to load config for unknown stage ${stage}. Commit: ${latestCommit}`);
  }
};

const getSongbirdConfig = (): Configuration['songbird'] => ({
  // TODO can we get yarn test:unit to work without the default roleArn
  roleArn: process.env.SONGBIRD_ROLE_ARN ?? '',
  endpoint: process.env.SONGBIRD_API_ENDPOINT,
});

const getDataServiceConfig = (): Configuration['dataService'] => ({
  roleArn: undefined,
  endpoint: process.env.DATA_SERVICE_API_ENDPOINT ?? 'http://dev-dataservice',
});

const getDemoConfig = (): Configuration['demos'] => ({
  demoOrgId: process.env.DEMO_ORG_ID, // do not set a default here to avoid accidentally selecting an org that exists in this environment, but shouldn't be used for demos...
});

const stage = ((): Stage => {
  const stageVar = process.env.STAGE as Stage | undefined;
  if (!stageVar) return 'local';
  return stageVar;
})();

const stageConfig = getConfigForStage(stage);

export const config: ExtendedConfig = {
  ...stageConfig,
  stage,
  songbird: getSongbirdConfig(),
  dataService: getDataServiceConfig(),
  feedbackSecretId: process.env.FEEDBACK_WEBHOOK_SECRET_ID ?? stageConfig.feedbackSecretId,
  // default to 1 for one node running locally
  totalNodes: getNumericEnvVar('TOTAL_SERVICE_NODES') ?? 1,
  demos: getDemoConfig(),
};

// debug mode suppresses production mode
export const isDebugMode = (): boolean => !!process.env.DEBUG_MODE;

// production mode enables enhanced security and limits functionality that is not ready for production
export const isProdMode = (): boolean => {
  const prodStages: Stage[] = ['production', 'production-enterprise'];
  return !isDebugMode() && prodStages.some((prodStage) => prodStage === config.stage);
};

export const isLocalMode = (): boolean => {
  const localStages: Stage[] = ['local', 'test'];
  return localStages.some((localStage) => localStage === config.stage);
};

export const serviceName = 'dashboard';
export const port = process.env.PORT ?? 3000;
export const serviceUrl = process.env.BASE_URL ?? `http://localhost:${port}`;
