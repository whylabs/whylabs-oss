import { processDigestNotificationMetadata } from '../../../notifications/monitor/digest';
import { digestV3TestMessage } from '../../data/test-messages';
import assert from 'assert';
import { DigestMetadata } from '../../../notifications/monitor/types';
import { MonitorModeType } from '../../../notifications/monitor/common';
import { config } from '../../../config';

describe('digest mode metadata content', () => {
  it(
    'should contain all basic fields',
    async () => {
      const metadata: DigestMetadata = await processDigestNotificationMetadata(digestV3TestMessage);
      // basic stucture
      assert(metadata.featureAnomalies?.length === 5, `actual=${metadata.featureAnomalies?.length}`);
      assert(metadata.segmentAnomalies?.length === 1);
      assert(metadata.anomalySample?.length === 14);

      // attributes
      assert(metadata.totalAnomalies === 14);
      assert(metadata.timeRange === '2022-05-03T00:00:00.000Z/2022-05-16T00:00:00.000Z');
      assert(metadata.end > metadata.start, 'end time should be greater than start time');
      assert(metadata.end === 1652659200000);
      assert(metadata.start === 1651536000000);
      assert(metadata.id === '9844765c-35b4-42ce-9e7c-9b23a92c4d9c');
      assert(metadata.runId === 'ec88d889-0f6b-4df0-bf6f-1158a4f28dd1');
      assert(metadata.monitorMode === MonitorModeType.Digest);
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
          'https://observatory.development.whylabsdev.com/resources/model-1/monitor-manager/anomalies-feed?startDate=2022-05-03&endDate=2022-05-16&targetOrgId=org-gWtdtQ',
        `actual=${metadata.modelAlertsUrl}`,
      );
      assert(
        metadata.modelDashboardUrl ===
          'https://observatory.development.whylabsdev.com/resources/model-1?startDate=2022-05-03&endDate=2022-05-16&targetOrgId=org-gWtdtQ',
        `actual=${metadata.modelDashboardUrl}`,
      );
      assert(metadata.featureAnomalies[0].numAnomalies === 2, `actual=${metadata.featureAnomalies[0].numAnomalies}`);
      assert(metadata.featureAnomalies[0].column === 'feature-1', `actual=${metadata.featureAnomalies[0].column}`);
      assert(
        metadata.featureAnomalies[0].analyzerType === 'drift',
        `actual=${metadata.featureAnomalies[0].analyzerType}`,
      );
      assert(
        metadata.featureAnomalies[0].earliestAnomalyDatasetTimestamp === 1651536000000,
        `actual=${metadata.featureAnomalies[0].earliestAnomalyDatasetTimestamp}`,
      );
      assert(
        metadata.featureAnomalies[0].oldestAnomalyDatasetTimestamp === 1652659200000,
        `actual=${metadata.featureAnomalies[0].oldestAnomalyDatasetTimestamp}`,
      );
      assert(!metadata.segmentAnomalies[0].url, `actual=${metadata.segmentAnomalies[0].url}`);
      assert(metadata.segmentAnomalies[0].segment === '', `actual=${metadata.segmentAnomalies[0].segment}`);
      assert(metadata.segmentAnomalies[0].numAnomalies === 14, `actual=${metadata.segmentAnomalies[0].numAnomalies}`);
      assert(
        metadata.segmentAnomalies[0].columns.length === 1,
        `actual=${metadata.segmentAnomalies[0].columns.length}`,
      );
      assert(
        metadata.segmentAnomalies[0].columns[0] === 'hours-per-week',
        `actual=${metadata.segmentAnomalies[0].columns[0]}`,
      );
      assert(
        metadata.segmentAnomalies[0].oldestAnomalyDatasetTimestamp === 1652659200000,
        `actual=${metadata.segmentAnomalies[0].oldestAnomalyDatasetTimestamp}`,
      );
      assert(
        metadata.segmentAnomalies[0].earliestAnomalyDatasetTimestamp === 1651536000000,
        `actual=${metadata.segmentAnomalies[0].earliestAnomalyDatasetTimestamp}`,
      );
    },
    10 * 1000,
  );

  it(
    'should generate presigned url for images in anomaly sample and expiry date',
    async () => {
      const metadata: DigestMetadata = await processDigestNotificationMetadata(digestV3TestMessage);

      assert(
        metadata.anomalySample[0].img_url?.startsWith(
          'https://development-deltalake-20210520193724829400000001.s3.us-west-2.amazonaws.com/images/analysis/',
        ),
      );
      assert(!metadata.anomalySample[0].img_expiry_datetime || metadata.anomalySample[0].img_expiry_datetime != null);
      const regexTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      assert(metadata.anomalySample[0].img_expiry_datetime?.toISOString()?.match(regexTimestamp)?.length === 1);
    },
    5 * 1000,
  );

  it(
    'digest mode - check urls generated',
    async () => {
      const metadata = await processDigestNotificationMetadata(digestV3TestMessage);
      const expectedModelAlertUrl = `https://observatory.development.whylabsdev.com/resources/model-1/monitor-manager/anomalies-feed?startDate=2022-05-03&endDate=2022-05-16&targetOrgId=org-gWtdtQ`;
      const expectedModelDashboardUrl = `https://observatory.development.whylabsdev.com/resources/${config.test.datasetId}?startDate=2022-05-03&endDate=2022-05-16&targetOrgId=org-gWtdtQ`;
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
});
