import { config } from '../../config';
import { getLogger } from '../../providers/logger';
import { SQS, DeleteMessageRequest, Message, ReceiveMessageRequest } from '@aws-sdk/client-sqs';
import { getStatus, ServerStatus } from '../../routes/health';

const logger = getLogger('MessageQueue');

/* Handler function to run on every queue message */
type MessageHandler<T> = (messageId: string, message: T, queueUrl: string) => Promise<void>;

const { pollIntervalMs, maxNumberOfMessages: MaxNumberOfMessages, longPollSeconds: WaitTimeSeconds } = config.sqs;

/**
 * Remove the specified message from queue
 * @param messageId
 * @param receiptHandle
 * @param sqsClient AWS SQS client to use
 * @param queueUrl URL of the SQS queue
 */
const removeMessage = async (
  messageId: string,
  receiptHandle: string,
  sqsClient: SQS,
  queueUrl: string,
): Promise<void> => {
  logger.debug('Removing message from queue, id: %s', messageId);
  const deleteParams: DeleteMessageRequest = {
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  };
  await sqsClient.deleteMessage(deleteParams);
  logger.debug('Successfully removed message %s', messageId);
};

/**
 * Uses the supplied handler on the Body of the message. Deletes the message from queue on success
 * @param message Message to process
 * @param handler Handler to call for each message
 * @param sqsClient AWS SQS client to use
 * @param queueUrl URL of the SQS queue
 */
export const processMessage = async <T>(
  message: Message,
  handler: MessageHandler<T>,
  sqsClient: SQS,
  queueUrl: string,
): Promise<void> => {
  if (!message.MessageId || !message.Body || !message.ReceiptHandle)
    throw new Error(
      `Received a message with missing parameters. ID present: ${!!message.MessageId}, 
      body present: ${!!message.Body}, receipt handle present: ${!!message.ReceiptHandle}`,
    );

  logger.info('Processing message from queue %s, id: %s', queueUrl, message.MessageId);

  let parsedMessage: T;
  try {
    parsedMessage = JSON.parse(message.Body);
  } catch (err) {
    logger.error(err, 'Could not parse JSON message. Removing it from queue. Message ID %s.', message.MessageId);
    await removeMessage(message.MessageId, message.ReceiptHandle, sqsClient, queueUrl);
    return;
  }

  try {
    await handler(message.MessageId, parsedMessage, queueUrl);
    logger.info('Processed message %s', message.MessageId);
  } catch (err) {
    // Swallow errors processing messages here.
    // Retries should be handled at a deeper level. If a message processor failed, we can assume it's not retriable and it's safe to remove message.
    logger.error(
      err,
      'Something went wrong when handling message: %s. Message ID: %s, body: %s',
      (err as Error).message,
      message.MessageId,
      message.Body,
    );
  } finally {
    await removeMessage(message.MessageId, message.ReceiptHandle, sqsClient, queueUrl);
  }
};

/**
 * Uses the supplied handler on the Body of each SQS message. Deletes the messages from queue on success and non-transient failures.
 * Continually polls for new messages.
 * @param handler Handler to call for each message
 * @param sqsClient AWS SQS client to use
 * @param pollContinuously Whether to continue polling once the first batch of messages was processed
 * @param queueUrl URL of the SQS queue
 */
export const pollForMessages = async <T>(
  handler: MessageHandler<T>,
  sqsClient: SQS,
  pollContinuously: boolean,
  queueUrl: string,
): Promise<void> => {
  const hrStart = process.hrtime();
  try {
    logger.debug(`Polling for messages on ${queueUrl}...`);
    const params: ReceiveMessageRequest = {
      MaxNumberOfMessages,
      QueueUrl: queueUrl,
      WaitTimeSeconds,
    };
    const response = await sqsClient.receiveMessage(params);
    const { requestId } = response.$metadata;

    logger.debug('Received response, request id: %s', requestId);
    if (!response.Messages) {
      logger.debug('No messages in queue.');
      return;
    }

    logger.debug('Received %s messages, processing.', response.Messages.length);
    const messageTasks = response.Messages.map((m) => processMessage(m, handler, sqsClient, queueUrl));

    // ensure all promises are awaited
    const settlementResult = await Promise.allSettled(messageTasks);
    const failedTasks = settlementResult.filter((r) => r.status === 'rejected');
    if (failedTasks.length) {
      logger.error(
        'Failed to process %s out of %s messages. Request id: %s',
        failedTasks.length,
        response.Messages.length,
        requestId,
      );
    }

    logger.debug('Finished processing messages for request id: %s', requestId);
  } catch (err) {
    logger.error(err, 'Encountered an error while polling for messages.');
  } finally {
    const hrEnd = process.hrtime(hrStart);
    logger.debug(
      'Polling and processing took %sms. Scheduling another poll for messages in %s seconds',
      Math.round(hrEnd[1] / 1000000),
      pollIntervalMs / 1000,
    );
    if (pollContinuously)
      if (getStatus() === ServerStatus.Stopping) {
        logger.info(`Server is stopping, ending poll on ${queueUrl}`);
      } else {
        setTimeout(() => pollForMessages(handler, sqsClient, pollContinuously, queueUrl), pollIntervalMs);
      }
  }
};
