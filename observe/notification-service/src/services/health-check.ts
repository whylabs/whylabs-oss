import { getLogger } from '../providers/logger';
import { runWithTimeout } from '../util/promises';
import { CANARY_TEST_ORG } from '../constants';
import { getOrganization } from './data/songbird/songbird-wrapper';

const logger = getLogger('HealthCheck');

// ensure process crashes on unhandled rejection
process.on('unhandledRejection', (up) => {
  throw up;
});

const ensureHealthy = async (): Promise<void> => {
  // TODO flesh this out with more checks that we can run frequently

  // tests Songbird connection
  const org = await getOrganization(CANARY_TEST_ORG);
  if (!org) {
    throw Error('Failed to fetch test org!');
  }
};

(async (): Promise<void> => {
  logger.info('Running health check');

  // max time (in milliseconds) to wait for the health check to finish
  const timeout = 15 * 1000;
  try {
    await runWithTimeout(ensureHealthy(), timeout);
    logger.info('Health check successful');
    // eslint-disable-next-line no-process-exit
    process.exit();
  } catch (err) {
    logger.error(err, 'Health check failed');
    throw err;
  }
})();
