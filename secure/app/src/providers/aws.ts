import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import { Lambda } from '@aws-sdk/client-lambda';
import { S3 } from '@aws-sdk/client-s3';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { SQS } from '@aws-sdk/client-sqs';
import { STS } from '@aws-sdk/client-sts';

import { config } from '../config';

const awsConfig = { region: config.region };

const s3 = new S3(awsConfig);
const sqs = new SQS(awsConfig);
const cloudWatch = new CloudWatchLogs(awsConfig);
const sts = new STS(awsConfig);
const secretsManager = new SecretsManager(awsConfig);
const lambda = new Lambda(awsConfig);

export { s3, cloudWatch, sts, secretsManager, lambda, sqs };
