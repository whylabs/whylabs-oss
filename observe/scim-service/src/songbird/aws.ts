import { S3 } from '@aws-sdk/client-s3';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { STS } from '@aws-sdk/client-sts';

const awsConfig = { region: 'us-west-2' };

const s3 = new S3(awsConfig);
const sts = new STS(awsConfig);
const secretsManager = new SecretsManager(awsConfig);

export { s3, sts, secretsManager };
