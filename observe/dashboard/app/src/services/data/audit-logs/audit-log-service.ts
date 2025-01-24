import {
  CloudWatchLogsServiceException,
  InvalidSequenceTokenException,
  PutLogEventsRequest,
} from '@aws-sdk/client-cloudwatch-logs';

import { config } from '../../../config';
import { GraphQLContext } from '../../../graphql/context';
import { SegmentTag } from '../../../graphql/generated/graphql';
import { cloudWatch } from '../../../providers/aws';
import { getLogger } from '../../../providers/logger';
import { callOptionsFromGraphqlCxt } from '../../../util/async-helpers';
import { fnThrow } from '../../../util/misc';
import { getUserByEmail } from '../songbird/api-wrappers/users';

export enum Resource {
  MonitorConfig = 'MonitorConfig',
}

// NOTE: adding new types here may require changing the query to fetch audit logs further down, so that log statements of the new type do not accidentally surface where they shouldn't
export enum AuditLogType {
  UserAction = 'UserAction',
  InternalAdminAction = 'InternalAdminAction',
}

export interface UserActionContext {
  userId: string;
  auth0Id?: string;
  whylabsId?: string;
  organizationId: string;
  datasetId: string;
  segmentTags: SegmentTag[] | null;
  featureName: string | null;
  resource: Resource;
}

interface InternalAdminActionContext {
  auth0UserId: string | null;
  whyLabsUserId: string | null;
  email: string | null;
  description: string;
  actionSucceeded: boolean;
}

interface InternalAdminAuditStatement {
  adminActionContext: InternalAdminActionContext;
  type: AuditLogType.InternalAdminAction;
  time: number;
}

interface Diff {
  added?: Record<string, string>;
  deleted?: Record<string, string>;
  updated?: Record<string, string>;
}

interface UserActionAuditStatement {
  updateContext: UserActionContext;
  type: AuditLogType.UserAction;
  diff: Diff;
  time: number;
}

const { cloudWatchAuditLogGroup, cloudWatchAuditLogStream } = config.storage;
const logger = getLogger('AuditService');

if (!cloudWatchAuditLogGroup || !cloudWatchAuditLogStream) {
  logger.info('Audit logs are disabled');
}

const putEventsWithRetry = async (params: PutLogEventsRequest, maxRetries: number, retryCount = 0): Promise<void> => {
  if (!cloudWatchAuditLogGroup || !cloudWatchAuditLogStream) {
    return;
  }
  try {
    logger.info('Writing audit logs to group %s, stream %s', params.logGroupName, params.logStreamName);
    await cloudWatch.putLogEvents(params);
  } catch (err) {
    if (err instanceof InvalidSequenceTokenException) {
      if (retryCount < maxRetries) {
        // retry based on the expected token in the error response
        logger.warn('Failed to record resource modification because the expected sequence token was wrong, retrying');
        const expectedToken = /expected sequenceToken is: (.+)$/.exec(err.message)?.pop();

        await putEventsWithRetry({ ...params, sequenceToken: expectedToken }, maxRetries, ++retryCount);
      } else {
        logger.error(
          'Exceeded the number of retries trying to upload audit logs. Most likely could not set sequence token correctly.',
        );
        throw err;
      }
    } else {
      logger.error(`Failed to write to audit logs ${(err as CloudWatchLogsServiceException).message}`);
      throw err;
    }
  }
};

const putEventsInternal = async (auditLogStatement: UserActionAuditStatement | InternalAdminAuditStatement) => {
  if (!cloudWatchAuditLogGroup || !cloudWatchAuditLogStream) {
    return;
  }
  try {
    // get next upload token before submitting the logs
    const logStream = await cloudWatch.describeLogStreams({
      logGroupName: cloudWatchAuditLogGroup,
      logStreamNamePrefix: cloudWatchAuditLogStream,
    });
    const token = logStream.logStreams?.find((s) => s.logStreamName === cloudWatchAuditLogStream)?.uploadSequenceToken;

    const params: PutLogEventsRequest = {
      logGroupName: cloudWatchAuditLogGroup,
      logStreamName: cloudWatchAuditLogStream,
      logEvents: [{ timestamp: auditLogStatement.time, message: JSON.stringify(auditLogStatement) }],
      sequenceToken: token,
    };

    await putEventsWithRetry(params, 5);
  } catch (err) {
    // this function should not throw, because we generally do not wait for it to resolve and unhandled promise rejections are bad
    logger.error(err, 'Failed to persist audit log statement: %s', JSON.stringify(auditLogStatement));
  }
};

/**
 * Creates an audit log entry for the admin action.
 * Does not throw.
 * @param context Request context
 * @param actionSucceeded Whether the action succeeded or not
 * @param description Description of the action
 */
const logAdminAction = async (
  context: GraphQLContext,
  actionSucceeded: boolean,
  description: string,
): Promise<void> => {
  try {
    const { userContext, requestTime } = context;
    const { auth0User, membership, impersonation } = userContext;
    const whyLabsId = membership?.userId;

    type AdminUser = Pick<InternalAdminActionContext, 'auth0UserId' | 'whyLabsUserId' | 'email'>;

    // if impersonation is enabled, we want the real user here, not the one we're impersonating
    const user: AdminUser = impersonation?.enabled
      ? {
          auth0UserId: impersonation.originalUserId,
          whyLabsUserId:
            (
              await getUserByEmail(
                impersonation.originalUserEmail ??
                  fnThrow(
                    `Invalid email on original user in req context: ${JSON.stringify(impersonation.originalUserId)}`,
                  ),
                callOptionsFromGraphqlCxt(context),
              )
            )?.userId ?? fnThrow(`Could not find WhyLabs user matching Auth0 email ${impersonation.originalUserEmail}`),
          email: impersonation.originalUserEmail ?? null,
        }
      : { auth0UserId: auth0User?.sub ?? null, whyLabsUserId: whyLabsId ?? null, email: auth0User?.email ?? null };

    const auditLogStatement: InternalAdminAuditStatement = {
      adminActionContext: {
        ...user,
        actionSucceeded,
        description,
      },
      type: AuditLogType.InternalAdminAction,
      time: requestTime,
    };

    logger.warn('Executed admin action %o', auditLogStatement);

    await putEventsInternal(auditLogStatement);
  } catch (err) {
    logger.error(err, 'Failed to record admin action: %s. Action succeeded: %s', description, actionSucceeded);
  }
};

/**
 * Executes the provided admin operation and records its outcome in the audit log
 * @param context Request context
 * @param action Action to be executed
 * @param description Human-readable description of the action
 */
export const executeAndRecordAdminAction = async <T>(
  context: GraphQLContext,
  action: () => Promise<T>,
  description: string,
): Promise<T> => {
  let actionSucceeded = false;
  try {
    logger.warn(
      'Executing admin action: %s. User ID %s, Auth0 ID %s, email %s',
      description,
      context.userContext.membership?.userId,
      context.userContext.auth0User?.sub,
      context.userContext.auth0User?.email,
    );
    const result = await action();
    actionSucceeded = true;
    return result;
  } finally {
    // do not await, purely a side effect
    logAdminAction(context, actionSucceeded, description);
  }
};
