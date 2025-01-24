import { trigger } from '@pagerduty/pdjs';
import { EventParameters, EventPayloadV2 } from '@pagerduty/pdjs/build/src/events';
import { getLogger } from '../providers/logger';
import { NotificationType } from '../notifications/digest-v2/digest-notifier';
import { logNotification } from './notification-logger';
import { isFulfilled } from '../util/promises';

const logger = getLogger('PagerDutyClientWrapper');

// https://developer.pagerduty.com/api-reference/b3A6Mjc0ODI2Nw-send-an-event-to-pager-duty
type PDSuccessResponse = {
  status: 'success'; // Returns "success" if successful, or a short error message in case of a failure.

  dedup_key: string; //The key used to correlate triggers, acknowledges, and resolves for the same alert.

  message: 'Event processed'; // A description of the problem, or "Event processed" if successful.
};

const isPDSuccessResponse = (responsePayload: unknown): responsePayload is PDSuccessResponse => {
  if (!responsePayload) return false;
  const maybeSuccessResponse = responsePayload as PDSuccessResponse;
  return maybeSuccessResponse.status === 'success';
};

const sendPayload = async (payload: EventPayloadV2, orgId: string, retry = true): Promise<void> => {
  const params: EventParameters = {
    data: payload,
    retryCount: 2, // TODO: determine what this should be
  };
  const { data: pdResponse, ok, status } = await trigger(params);

  // message successfully received by PD
  if (ok && isPDSuccessResponse(pdResponse)) {
    return;
  }

  // something went wrong
  if (retry) {
    logger.warn(
      'Failed to send PagerDuty message for org %s. Retrying. Response was %s - %s.',
      orgId,
      status,
      JSON.stringify(pdResponse),
    );
    return sendPayload(payload, orgId, false);
  }

  throw Error(
    `Failed to send PagerDuty message for org ${orgId}. NOT retrying. Response was ${status} - ${JSON.stringify(
      pdResponse,
    )}.`,
  );
};

export const sendPagerDutyMessages = async (
  messageId: string,
  payloads: EventPayloadV2[],
  orgId: string,
): Promise<void> => {
  logger.info('Sending %s PagerDuty notifications for org %s', payloads.length, orgId);
  const partialRoutingKeyForLogging = payloads[0].routing_key?.substring(0, 6);
  try {
    const tasks = payloads.map((p) => () => sendPayload(p, orgId));
    const results = await Promise.allSettled(tasks.map((t) => t()));
    const successfulResults = results.filter(isFulfilled);

    const payloadsForLogging: Partial<EventPayloadV2>[] = payloads.map((payload) => {
      const payloadCopy: Partial<EventPayloadV2> = { ...payload };
      payloadCopy.routing_key = partialRoutingKeyForLogging; // routing keys are sensitive, logging first 6 characters
      return payloadCopy;
    });
    await logNotification(messageId, NotificationType.PAGERDUTY, orgId, JSON.stringify(payloadsForLogging, null, 2));
    if (successfulResults.length === tasks.length) {
      logger.info(
        'Successfully sent %s PagerDuty notifications for org %s starting with %s',
        payloads.length,
        orgId,
        partialRoutingKeyForLogging,
      );
    } else {
      throw Error(
        `Failed to send ${tasks.length - successfulResults.length} of ${
          tasks.length
        } PagerDuty messages for org ${orgId} key starting with ${partialRoutingKeyForLogging}`,
      );
    }
  } catch (err) {
    logger.error(
      err,
      'Failed to send PagerDuty notifications for org %s key starting with %s',
      orgId,
      partialRoutingKeyForLogging,
    );
    throw err;
  }
};
