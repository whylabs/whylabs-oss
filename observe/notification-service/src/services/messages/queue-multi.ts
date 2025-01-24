import { config } from '../../config';
import { getLogger } from '../../providers/logger';
import { delay } from '../../util/promises';
import { timeIt } from '../../util/timeit';
import { isNotNull, isNotUndefined } from '../../util/type-guards';
import { SQS, DeleteMessageRequest, ReceiveMessageRequest } from '@aws-sdk/client-sqs';

const logger = getLogger('MultiMessageQueue');
const { longPollSeconds: WaitTimeSeconds } = config.sqs;

export type MultiMessageHandler = (messages: Message[]) => Promise<MessageHandlerResult>;
export interface MessageHandlerResult {
  successIds: Set<string>;
}
export interface Message {
  id: string;
  body: unknown;
  receiptHandle: string;
}

export function createSqsPollBody(
  handler: MultiMessageHandler,
  sqsClient: SQS,
  queueUrl: string,
  maxMessages = 10,
  logErrors = true,
): () => Promise<PollResult> {
  return async () => {
    const params: ReceiveMessageRequest = {
      MaxNumberOfMessages: maxMessages, // TODO find out how to include this in config. Need to be set per queue
      QueueUrl: queueUrl,
      WaitTimeSeconds,
    };
    logger.debug(`Polling for messages on ${queueUrl}...`);
    const response = await sqsClient.receiveMessage(params);
    const { requestId } = response.$metadata;
    logger.debug('Received response, request id: %s', requestId);

    if (!response.Messages) {
      logger.debug(`No messages in queue ${queueUrl}`);
      return { type: 'NoOpPollResult' };
    } else {
      logger.debug('Received %s messages, processing.', response.Messages.length);

      // Parse each of the messages into Messages and filter the ones out that can't be
      const parsedMessages = response.Messages.map((message) => {
        // TODO how can this actually happen? It would imply the message cannot be removed at all later.
        if (message.Body === undefined || message.MessageId === undefined || message.ReceiptHandle === undefined) {
          logger.warn(`Message filtered from handler because it had no body/id: ${JSON.stringify(message)}`);
          return;
        }

        return [message.Body, message.MessageId, message.ReceiptHandle] as const;
      })
        .filter(isNotUndefined)
        .map(([bodyStr, id, receiptHandle]) => {
          const msg: Message = { id, body: JSON.parse(bodyStr), receiptHandle };
          return msg;
        });

      let results: MessageHandlerResult;
      try {
        results = await handler(parsedMessages);
      } catch (e) {
        logger.error(e, `Error in handler while processing queue ${queueUrl}`);
        return { type: 'ErrorPollResult', error: e, total: response.Messages.length };
      }

      const handledMessages = (
        await Promise.all(
          parsedMessages
            .filter((msg) => results.successIds.has(msg.id))
            .map(async (message) => {
              return safeRemoveMessage(message.id, message.receiptHandle, sqsClient, queueUrl);
            }),
        )
      ).filter(isNotNull);
      const successMessages = new Set(handledMessages);
      const failedMessages = parsedMessages.filter((msg) => !successMessages.has(msg.id));

      if (logErrors && failedMessages.length > 0) {
        logger.error(`Some messages could not be processed ${JSON.stringify(failedMessages)}`);
      } else if (failedMessages.length > 0) {
        logger.warn(`Some messages could not be processed ${JSON.stringify(failedMessages)}`);
      }

      return {
        type: failedMessages.length > 0 ? 'FailurePollResult' : 'SuccessPollResult',
        handled: handledMessages.length,
        failed: failedMessages.length,
        handledIds: Array.from(handledMessages.map((it) => it)),
        failedIds: Array.from(failedMessages.map((it) => it.id)),
        total: response.Messages.length,
      };
    }
  };
}

export type PollBody = () => Promise<PollResult>;
export interface PollConfig {
  /**
   * String tag that appears in logs.
   */
  readonly tag: string;

  /**
   * Optional delay in ms between poll attempts.
   */
  readonly pollDelay?: number;

  /**
   * Optional flag to make the poller continuous or one-off
   */
  readonly continuous?: boolean;
}

export function createPoller(config: PollConfig, body: PollBody) {
  return async function* poll(): AsyncGenerator<PollResult, void, void> {
    if (!config.continuous) {
      yield timeIt(config.tag, () => body());
      return;
    }
    while (true) {
      yield timeIt(config.tag, () => body());
      if (config.pollDelay !== undefined) {
        await delay(config.pollDelay);
      }
    }
  };
}

export type PollResult = FinishedPollResult | ErrorPollResult | NoOpPollResult;

export interface NoOpPollResult {
  readonly type: 'NoOpPollResult';
}

export interface FinishedPollResult {
  readonly type: 'SuccessPollResult' | 'FailurePollResult';
  readonly handled: number;
  readonly failed: number;
  readonly handledIds?: string[];
  readonly failedIds?: string[];
  readonly total: number;
}

export interface ErrorPollResult {
  readonly type: 'ErrorPollResult';
  readonly error: unknown;
  readonly total: number;
}

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
 * Version of removeMessage that doesn't throw. It returns either the message id or
 * null if the message couldn't be removed.
 */
async function safeRemoveMessage(
  messageId: string,
  receiptHandle: string,
  sqsClient: SQS,
  queueUrl: string,
): Promise<string | null> {
  try {
    await removeMessage(messageId, receiptHandle, sqsClient, queueUrl);
    return messageId;
  } catch (e) {
    logger.error(e, `Couldn't remove ${messageId} from the queue. It may be reprocessed.`);
    return null;
  }
}
