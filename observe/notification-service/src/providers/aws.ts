import { S3 } from '@aws-sdk/client-s3';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { SES } from '@aws-sdk/client-ses';
import { SQS } from '@aws-sdk/client-sqs';
import { STS } from '@aws-sdk/client-sts';
import { config } from '../config';

const awsConfig = { region: config.region };

const s3 = new S3(awsConfig);
const sqs = new SQS(awsConfig);
const sts = new STS(awsConfig);
const secretsManager = new SecretsManager(awsConfig);
const ses = new SES(awsConfig);

export { ses, sqs, s3, sts, secretsManager };
