/* eslint-disable max-lines */
import { promises as fs } from 'fs';

import { getMonitorConfigV3 } from '../../services/data/songbird/api-wrappers/monitor-config';
import { ACTUAL_DIR, checkCase } from '../helpers/checks';
import { filterAnalyzerResults, filterFeature } from '../helpers/filtersort';
import {
  POSTGRES_END_TS,
  POSTGRES_MIGRATION_TEST_ORG,
  POSTGRES_MIGRATION_TEST_USER,
  POSTGRES_START_TS,
  QueryCheckerWithResult,
  TestServer,
  expect,
  setupApolloServer,
  setupTestUser,
} from '../integration-common';
import {
  AdHocMonitorDocument,
  GetMissingAnalysisDocument,
  GetUniquenessEventsForFeatureMv3Document,
} from './generated/graphql';

describe('Migration test adhoc', function () {
  let checkQuery: QueryCheckerWithResult = () => {
    throw Error('Query engine not started yet, cannot execute query.');
  };
  let testServer: TestServer | null = null;
  before(async function () {
    const testIdentity = await setupTestUser(POSTGRES_MIGRATION_TEST_USER, POSTGRES_MIGRATION_TEST_ORG);
    await fs.stat(ACTUAL_DIR).catch(async (err) => {
      if (err.code === 'ENOENT') {
        await fs.mkdir(ACTUAL_DIR);
      }
    });
    testServer = await setupApolloServer();
    checkQuery = async (query, variables, assertions?, identity = testIdentity) => {
      if (testServer) {
        return testServer.checkQueryResult(query, variables, assertions, identity);
      }
      throw Error('Test server is not setup so cannot check results');
    };
  });

  describe('tests for model-11 adhoc', function () {
    // Adhoc is only available for a limited time so we have to do a run and check it dynamically
    it('should match expected for adhoc', async function () {
      const from = POSTGRES_START_TS;
      const to = POSTGRES_END_TS;
      let data: { runId: string | undefined; numEvents: number } | undefined;
      const currentConfig = await getMonitorConfigV3(POSTGRES_MIGRATION_TEST_ORG, 'model-11', false, false);
      // validation is expecting no entity schema or weights
      expect(currentConfig).to.not.be.null;
      await checkQuery(
        AdHocMonitorDocument,
        {
          model: 'model-11',
          features: ['int-doublingnull'],
          segments: undefined,
          monitorConfig: JSON.stringify(currentConfig),
          from,
          to,
        },
        (res) => {
          data = res.data?.adHocMonitor?.run;
          expect(res.errors, res.errors?.map((e) => e.message).join(', ')).to.be.undefined;
          expect(data).to.not.be.undefined;
          expect(data?.runId).to.not.be.undefined;
          expect(data?.runId?.length).to.be.gte(10);
        },
      );

      await checkQuery(
        GetMissingAnalysisDocument,
        {
          datasetId: 'model-11',
          featureId: 'int-doublingnull',
          anomaliesOnly: false,
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          adhocRunId: data?.runId,
          tags: [],
        },
        async (res) => {
          await checkCase(res, 'GetMissingAnalysis_adhoc_model11', filterAnalyzerResults);
        },
      );

      await checkQuery(
        GetUniquenessEventsForFeatureMv3Document,
        {
          model: 'model-11',
          feature: 'int-doublingnull',
          from,
          to,
          adhocRunId: data?.runId,
        },
        async (res) => checkCase(res, 'GetUniquenessEventsForFeatureMv3_adhoc_model11', filterFeature),
      );
    });
  });

  after(async function () {
    if (testServer) {
      await testServer.serverCleanup();
      testServer = null;
    }
  });
});
