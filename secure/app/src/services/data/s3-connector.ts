import { Readable } from 'node:stream';

import AWS_S3, { S3ServiceException } from '@aws-sdk/client-s3';

import { s3 } from '../../providers/aws';
import { getLogger } from '../../providers/logger';

const logger = getLogger('S3Connector');

const streamToBuffer = async (stream: string | ReadableStream | Readable): Promise<Buffer> => {
  if (typeof stream === 'string') return Buffer.from(stream);
  const chunks = [];

  for await (const chunk of stream as Readable) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

interface S3ObjectMetadata {
  key: string;
  lastModified: string | null; // ISO datetime
  etag?: string;
  bucket?: string;
}

export interface S3Object extends S3ObjectMetadata {
  data: Buffer | null;
}

interface GetObjectOptions {
  ignoreMissingObject: boolean;
}

export const writeObject = async (Bucket: string, Key: string, content: string): Promise<void> => {
  logger.info(`Writing object to S3 as ${Key} in bucket ${Bucket}`);
  try {
    await s3.putObject({
      Bucket,
      Key,
      Body: content,
    });
  } catch (err) {
    logger.error(err, `Error writing object to S3 as ${Key} in bucket ${Bucket}`);
    throw err;
  }
};

export const deleteObject = async (Bucket: string, Key: string): Promise<void> => {
  logger.info(`Deleting object ${Key} in bucket ${Bucket}`);
  try {
    await s3.deleteObject({
      Bucket,
      Key,
    });
  } catch (err) {
    logger.error(err, `Error deleting object in S3: ${Key} in bucket ${Bucket}`);
    throw err;
  }
};

export const getObject = async (bucket: string, key: string, opts?: GetObjectOptions): Promise<S3Object> => {
  const params: AWS_S3.GetObjectCommandInput = {
    Bucket: bucket,
    Key: key,
  };
  try {
    logger.debug('Loading S3 object %s from bucket %s', key, bucket);
    const response: AWS_S3.GetObjectCommandOutput = await s3.getObject(params);
    const stream = response.Body?.transformToWebStream();
    return {
      data: stream ? await streamToBuffer(stream) : null,
      etag: response.ETag ?? '',
      key,
      lastModified: response.LastModified?.toISOString() ?? null,
    };
  } catch (err) {
    if (opts?.ignoreMissingObject && (err as S3ServiceException).name === 'NoSuchKey') {
      logger.debug(
        'Object %s in bucket %s was not found, but the call is proceeding with null data based on call params.',
        key,
        bucket,
      );
      return { data: null, key, lastModified: null };
    }
    logger.error(err, 'Error loading object %s from bucket %s.', key, bucket);
    throw err;
  }
};
