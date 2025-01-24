import { GetObjectCommandInput, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { s3 } from '../../providers/aws';
import { getLogger } from '../../providers/logger';
import { Readable } from 'node:stream';
const logger = getLogger('S3Connector');

const streamToBuffer = async (stream: string | ReadableStream | Readable): Promise<Buffer> => {
  if (typeof stream === 'string') return Buffer.from(stream);
  const chunks = [];

  for await (const chunk of stream as Readable) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

export const getObject = async (bucket: string, key: string): Promise<Buffer | null> => {
  const params: GetObjectCommandInput = {
    Bucket: bucket,
    Key: key,
  };
  try {
    logger.debug('Loading S3 object %s from bucket %s', key, bucket);
    const response: GetObjectCommandOutput = await s3.getObject(params);
    const stream = response.Body?.transformToWebStream();
    return stream ? await streamToBuffer(stream) : null;
  } catch (err) {
    logger.error(err, 'Error loading object %s from bucket %s.', key, bucket);
    throw err;
  }
};

export const writeObject = async (bucket: string, key: string, content: string): Promise<void> => {
  logger.info(`Writing object to S3 as ${key} in bucket ${bucket}`);
  try {
    await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: content,
    });
  } catch (err) {
    logger.error(err, `Error writing object to S3 as ${key} in bucket ${bucket}`);
    throw err;
  }
};

export const parseUrl = (
  url: string,
): {
  bucket: string;
  key: string;
} => {
  const parts = url.split('/');
  return {
    bucket: parts[2],
    key: parts.splice(3, parts.length).join('/'),
  };
};
