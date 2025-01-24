import {
  everyAnomalyTestMessageWithImage,
  everyAnomalyTestMessageWithoutImage,
  everyAnomalyTestMessageComposite,
} from '../../data/test-messages';
import assert from 'assert';
import { EveryAnomalyMetadata } from '../../../notifications/monitor/types';
import { MonitorModeType } from '../../../notifications/monitor/common';
import { processEveryAnomalyNotificationMetadata } from '../../../notifications/monitor/every-anomaly';
import { config } from '../../../config';

describe('every anomaly mode metadata content', () => {
  it(
    'should contain all basic fields',
    async () => {
      const metadata: EveryAnomalyMetadata = await processEveryAnomalyNotificationMetadata(
        everyAnomalyTestMessageWithoutImage,
      );
      // basic stucture
      assert(metadata.id === 'e137963f-1dfc-325f-8a41-18ca0f402864', `actual=${metadata.id}`);
      assert(metadata.runId === 'd3d6a1ad-d09c-4779-9033-baa077ff5fc8', `actual=${metadata.runId}`);
      assert(metadata.monitorMode === MonitorModeType.EveryAnomaly);
      assert(metadata.org.id === config.test.orgId);
      assert(metadata.org.name === 'Siren Integration Test Org', `actual=${metadata.org.name}`);
      assert(metadata.org.subscriptionTier === 'PAID');
      assert(metadata.org.emailDomains === 'whylabs.ai');
      assert(
        metadata.org.observatoryUrl === 'https://observatory.development.whylabsdev.com',
        `actual=${metadata.org.observatoryUrl}`,
      );
      assert(metadata.datasetId === config.test.datasetId, `actual=${metadata.datasetId}`);
      assert(metadata.dataset?.name === config.test.datasetName, `actual=${metadata.dataset?.name}`);
      assert(metadata.monitor.id === config.test.monitorId, `actual=${metadata.monitor.id}`);
      assert(metadata.monitor.displayName === config.test.monitorDisplayName, `actual=${metadata.monitor.displayName}`);
      assert(metadata.severity.valueOf() === 3);
      assert(metadata.schemaVersion === '3.0');
      assert(
        metadata.modelAlertsUrl ===
          `https://observatory.development.whylabsdev.com/resources/${config.test.datasetId}/monitor-manager/anomalies-feed?startDate=2022-08-10&endDate=2022-08-10&targetOrgId=${config.test.orgId}`,
      );
      assert(
        metadata.modelDashboardUrl ===
          `https://observatory.development.whylabsdev.com/resources/${config.test.datasetId}?startDate=2022-08-10&endDate=2022-08-10&targetOrgId=${config.test.orgId}`,
      );
      assert(
        metadata.analyzerResult.analyzerId === 'missing-values-ratio-analyzer',
        `actual=${metadata.analyzerResult.analyzerId}`,
      );
      assert(
        metadata.analyzerResult.column ===
          'auth_amount_streak_length_by_browser_fingerprint_from_payment_browser_fingerprint_rehashed',
        `actual=${metadata.analyzerResult.column}`,
      );
      assert(metadata.analyzerResult.targetLevel === 'column', `actual=${metadata.analyzerResult.targetLevel}`);
      assert(
        metadata.analyzerResult.analysisId === '6095cab8-3c42-3f6f-8dbe-2c2da1f8601e',
        `actual=${metadata.analyzerResult.analysisId}`,
      );
      assert(metadata.analyzerResult.segment === '', `actual=${metadata.analyzerResult.segment}`);
      assert(metadata.analyzerResult.anomalyCount === 1, `actual=${metadata.analyzerResult.anomalyCount}`);
      assert(!metadata.analyzerResult.img_url, `actual=${metadata.analyzerResult.img_url}`);
      assert(!metadata.analyzerResult.img_expiry_datetime, `actual=${metadata.analyzerResult.img_expiry_datetime}`);
    },
    10 * 1000,
  );

  it(
    'should generate presigned url for images in anomaly sample and expiry date',
    async () => {
      const metadata: EveryAnomalyMetadata = await processEveryAnomalyNotificationMetadata(
        everyAnomalyTestMessageWithImage,
      );

      assert(
        metadata.analyzerResult.img_url?.startsWith(
          'https://development-deltalake-20210520193724829400000001.s3.us-west-2.amazonaws.com/images/analysis/',
        ),
      );
      assert(!metadata.analyzerResult.img_expiry_datetime || metadata.analyzerResult.img_expiry_datetime != null);
      const regexTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      assert(metadata.analyzerResult.img_expiry_datetime?.toISOString()?.match(regexTimestamp)?.length === 1);
    },
    15 * 1000,
  );

  it(
    'every anomaly mode - check urls generated',
    async () => {
      const metadata = await processEveryAnomalyNotificationMetadata(everyAnomalyTestMessageWithoutImage);
      const expectedModelAlertUrl = `https://observatory.development.whylabsdev.com/resources/${config.test.datasetId}/monitor-manager/anomalies-feed?startDate=2022-08-10&endDate=2022-08-10&targetOrgId=${config.test.orgId}`;
      const expectedModelDashboardUrl = `https://observatory.development.whylabsdev.com/resources/${config.test.datasetId}?startDate=2022-08-10&endDate=2022-08-10&targetOrgId=${config.test.orgId}`;
      assert(
        metadata.modelAlertsUrl === expectedModelAlertUrl,
        `actual=${metadata.modelAlertsUrl} expected=${expectedModelAlertUrl}`,
      );
      assert(
        metadata.modelDashboardUrl === expectedModelDashboardUrl,
        `actual=${metadata.modelDashboardUrl} expected=${expectedModelDashboardUrl}`,
      );
    },
    15 * 1000,
  );

  it(
    'should handle a composite result',
    async () => {
      const metadata: EveryAnomalyMetadata = await processEveryAnomalyNotificationMetadata(
        everyAnomalyTestMessageComposite,
      );
      assert(
        metadata.analyzerResult.analyzerResultType === 'DisjunctionCalculationResult',
        `actual=${metadata.analyzerResult.analyzerResultType}`,
      );
      assert(metadata.analyzerResult.childAnalyzerIds?.length === 2);
      assert(metadata.analyzerResult.childAnalysisIds?.length === 1);
      assert(metadata.analyzerResult.parent === 1);
    },
    5 * 1000,
  );
});
