import express from 'express';
import { pollForMessages } from './services/messages/queue';
import { getLogger } from './providers/logger';
import { sqs } from './providers/aws';
import { config, port } from './config';
import { processMonitorNotification, processTestNotification } from './notifications/monitor/notifier';
import { notifyUserMembership } from './notifications/memberships/membership-notifier';
import routes from './routes';
import { ServerStatus, setStatus } from './routes/health';
import http from 'http';

const logger = getLogger('Main');

const setupShutdown = (server: http.Server): void => {
  const shutdown = (): void => {
    logger.warn('Received kill command, exiting');
    setStatus(ServerStatus.Stopping);
    process.exitCode = 0;
    server.close((err) => {
      if (err) {
        logger.error(err, 'Encountered a problem shutting down Express.');
        process.exitCode = 1;
      } else {
        logger.info('Successfully shut down Express.');
        process.exitCode = 0;
      }
    });
  };

  const handleUncaughtException = (err: Record<string, unknown>): void => {
    logger.fatal(err, 'Encountered UNCAUGHT exception, exiting process!');

    // Note: MUST kill the service here, it is NOT safe to attempt recovery
    // https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUncaughtException);
  process.on('exit', () => {
    logger.info('Exiting');
  });
};

const setupUserMembershipNotificationMode = async (continuous = true) => {
  const { userMembershipNotificationQueueName } = config.sqs;
  if (!userMembershipNotificationQueueName)
    throw new Error('User membership queue name not specified in config or env vars!');
  try {
    const queueUrl = (await sqs.getQueueUrl({ QueueName: userMembershipNotificationQueueName })).QueueUrl;
    if (!queueUrl) throw new Error(`Unable to get url for queue ${userMembershipNotificationQueueName}`);
    await pollForMessages(notifyUserMembership, sqs, continuous, queueUrl);
  } catch (err) {
    logger.error(err, 'Unable to setup polling for membership notifications.');
    throw err;
  }
};

const setupTestNotificationMode = async (continuous = true) => {
  const { testNotificationQueueName } = config.sqs;
  if (!testNotificationQueueName) throw new Error('Test queue name not specified in config or env vars!');
  try {
    const queueUrl = (await sqs.getQueueUrl({ QueueName: testNotificationQueueName })).QueueUrl;
    if (!queueUrl) throw new Error(`Unable to get url for queue ${testNotificationQueueName}`);

    await pollForMessages(processTestNotification, sqs, continuous, queueUrl);
  } catch (err) {
    logger.error(err, 'Unable to setup polling for test notifications.');
    throw err;
  }
};

const setupMonitorNotificationMode = async (continuous = true) => {
  const { monitorNotificationQueueName } = config.sqs;
  if (!monitorNotificationQueueName)
    throw new Error('Monitor notification queue name not specified in config or env vars!');
  try {
    const monitorQueueUrl = (await sqs.getQueueUrl({ QueueName: monitorNotificationQueueName })).QueueUrl;
    if (!monitorQueueUrl) throw new Error(`Unable to get the url for queue ${monitorNotificationQueueName}`);
    await pollForMessages(processMonitorNotification, sqs, continuous, monitorQueueUrl);
  } catch (err) {
    logger.error(err, 'Unable to setup polling for monitor notifications.');
    throw err;
  }
};

const getSetupTasks = (continuous = true): (() => Promise<void>)[] => {
  return [
    () => setupMonitorNotificationMode(continuous),
    () => setupUserMembershipNotificationMode(continuous),
    () => setupTestNotificationMode(continuous),
  ];
};

const initHttpService = (port: number) => {
  const app = express();
  routes(app);
  return app.listen(port, () => logger.info('Service is up on port %s, pid %s', port, process.pid));
};

const initService = async (): Promise<void> => {
  try {
    const { environment, latestCommit } = config;
    logger.info('Initializing service with config for %s environment, commit %s', environment, latestCommit);
    setStatus(ServerStatus.Starting);
    const server = initHttpService(Number(port));
    setupShutdown(server); // graceful exits
    // run once and check for errors
    const startupTasks: (() => Promise<void>)[] = getSetupTasks();
    const results = await Promise.allSettled(startupTasks.map((task) => task()));
    const successfulResults = results.filter((r) => r.status === 'fulfilled');
    const numOfUnsuccessfulResults = startupTasks.length - successfulResults.length;
    if (numOfUnsuccessfulResults != 0) {
      const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason);
      setStatus(ServerStatus.Error);
      logger.error(
        `Failed to start ${numOfUnsuccessfulResults} out of ${startupTasks.length} event pollers: ${errors.join(';')}`,
      );
      return;
    } else {
      logger.info(`Successfully started ${startupTasks.length} event pollers.`);
      setStatus(ServerStatus.Ready);
      logger.info(`Siren is alive!`);
    }
    // actually start the polling tasks
    await Promise.allSettled(
      getSetupTasks(true).map((task) =>
        task().catch((err) => {
          setStatus(ServerStatus.Error); // set to error on any polling task that fails
          logger.error(`A startup task failed: ${err.message}`);
          throw err;
        }),
      ),
    );
  } catch (err) {
    if (config.environment === 'local') {
      logger.error(
        err,
        "Failed to start at least one polling mode. This should not happen while deployed! Ignoring because we're running locally",
      );
      return;
    }
    logger.fatal(err, 'Encountered unrecoverable error, killing the app.');
    throw err;
  }
};

initService().catch((err) => {
  logger.fatal(err, 'Failed to start Siren, exiting process!');
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});
