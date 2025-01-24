import { expect } from 'chai';
import sinon from 'sinon';

import { Analyzer } from '../../../../schemas/generated/monitor-schema';
import * as EntitySchemaApiWrapper from '../../songbird/api-wrappers/entity-schema';
import * as MonitorConfigApiWrapper from '../../songbird/api-wrappers/monitor-config';
import { listColumnActiveMonitors, listMonitorTargetColumns } from '../monitor-targets';
import { analyzerConfig, columnsSchema, mockedMonitorWithEntitySchema, mockedSchema, monitorConfig } from './mocks';

describe('testing monitor-targets', function () {
  describe('testing listMonitorTargetColumns', function () {
    let mockedAnalyzer = analyzerConfig as Analyzer;

    beforeEach(function () {
      sinon.restore();
      sinon.replace(
        MonitorConfigApiWrapper,
        'getMonitor',
        () => new Promise((res) => res(monitorConfig as unknown as string)),
      );
      sinon.replace(EntitySchemaApiWrapper, 'getSchemaForResource', () => new Promise((res) => res(mockedSchema)));
      mockedAnalyzer = structuredClone(analyzerConfig) as Analyzer;
    });

    const mockAnalyer = () => {
      sinon.replace(
        MonitorConfigApiWrapper,
        'getAnalyzer',
        () => new Promise((res) => res(mockedAnalyzer as unknown as string)),
      );
    };

    it('should match all columns when include is *', async function () {
      mockedAnalyzer.targetMatrix = {
        type: 'column',
        include: ['*'],
      };
      mockAnalyer();
      const features = await listMonitorTargetColumns('org-test', 'model-test', monitorConfig.id);
      expect(features).to.length(columnsSchema.length);
    });

    it('should match all columns when matrix type is dataset', async function () {
      mockedAnalyzer.targetMatrix = {
        type: 'dataset',
      };
      mockAnalyer();
      const features = await listMonitorTargetColumns('org-test', 'model-test', monitorConfig.id);
      expect(features).to.length(columnsSchema.length);
    });

    it('should match all discrete columns', async function () {
      mockedAnalyzer.targetMatrix = {
        type: 'column',
        include: ['group:discrete'],
      };
      mockAnalyer();
      const features = await listMonitorTargetColumns('org-test', 'model-test', monitorConfig.id);
      expect(features).to.deep.equals(columnsSchema.flatMap((c) => (c.discreteness === 'discrete' ? c.column : [])));
      expect(features).to.length(3);
    });

    it('should match all continuous columns', async function () {
      mockedAnalyzer.targetMatrix = {
        type: 'column',
        include: ['group:continuous'],
      };
      mockAnalyer();
      const features = await listMonitorTargetColumns('org-test', 'model-test', monitorConfig.id);
      expect(features).to.deep.equals(columnsSchema.flatMap((c) => (c.discreteness === 'continuous' ? c.column : [])));
      expect(features).to.length(7);
    });

    it('should match all string columns + output', async function () {
      mockedAnalyzer.targetMatrix = {
        type: 'column',
        include: ['group:str', 'group:output'],
      };
      mockAnalyer();
      const features = await listMonitorTargetColumns('org-test', 'model-test', monitorConfig.id);
      expect(features).to.deep.equals(
        columnsSchema.flatMap((c) => (c.dataType === 'string' || c.classifier === 'output' ? c.column : [])),
      );
      expect(features).to.length(3);
    });

    it('should match all output columns', async function () {
      mockedAnalyzer.targetMatrix = {
        type: 'column',
        include: ['group:output'],
      };
      mockAnalyer();
      const features = await listMonitorTargetColumns('org-test', 'model-test', monitorConfig.id);
      expect(features).to.deep.equals(columnsSchema.flatMap((c) => (c.classifier === 'output' ? c.column : [])));
      expect(features).to.length(1);
    });

    it('should match all discrete + issue_d, excluding dataType string', async function () {
      mockedAnalyzer.targetMatrix = {
        type: 'column',
        include: ['group:discrete', 'issue_d'],
        exclude: ['group:str'],
      };
      mockAnalyer();
      const features = await listMonitorTargetColumns('org-test', 'model-test', monitorConfig.id);
      expect(features).to.deep.equals(
        columnsSchema.flatMap((c) =>
          (c.discreteness === 'discrete' || c.column === 'issue_d') && c.dataType !== 'string' ? c.column : [],
        ),
      );
      expect(features).to.length(2);
    });

    it('should match all integer, fractional and boolean, excluding  issue_d', async function () {
      mockedAnalyzer.targetMatrix = {
        type: 'column',
        include: ['group:int', 'group:frac', 'group:bool'],
        exclude: ['issue_d'],
      };
      mockAnalyer();
      const features = await listMonitorTargetColumns('org-test', 'model-test', monitorConfig.id);
      expect(features).to.deep.equals(
        columnsSchema.flatMap((c) =>
          ['integer', 'fractional', 'boolean'].includes(c.dataType ?? '') && c.column !== 'issue_d' ? c.column : [],
        ),
      );
      expect(features).to.length(7);
    });
  });

  describe('testing listColumnActiveMonitors for overall segment', function () {
    beforeEach(function () {
      sinon.restore();
      sinon.replace(
        MonitorConfigApiWrapper,
        'getMonitorConfigV3',
        () => new Promise((res) => res(mockedMonitorWithEntitySchema)),
      );
    });

    it('should list empty monitors for issue_d column', async function () {
      const monitors = await listColumnActiveMonitors('org-test', 'model-test', 'issue_d', []);
      expect(monitors).to.deep.equals([
        'test-monitor-input',
        'test-monitor-dataset',
        'test-monitor-dataset-overall-segmented',
        'test-monitor-dataset-segment-excluded',
      ]);
    });

    it('should list monitors for debt_settlement_flag (input discrete) column', async function () {
      const monitors = await listColumnActiveMonitors('org-test', 'model-test', 'debt_settlement_flag');
      expect(monitors).to.deep.equals([
        'test-monitor-discrete-exclude-issue_d',
        'test-monitor-all-exclude-issue_d',
        'test-monitor-string',
        'test-monitor-input',
        'test-monitor-dataset',
        'test-monitor-dataset-overall-segmented',
        'test-monitor-dataset-segment-excluded',
      ]);
    });

    it('should list monitors for test (output) (continuous) column', async function () {
      const monitors = await listColumnActiveMonitors('org-test', 'model-test', 'test (output)');
      expect(monitors).to.deep.equals([
        'test-monitor-continuous-exclude-issue_d',
        'test-monitor-output',
        'test-monitor-all-exclude-issue_d',
        'test-monitor-dataset',
        'test-monitor-dataset-overall-segmented',
        'test-monitor-dataset-segment-excluded',
      ]);
    });
  });

  describe('testing listColumnActiveMonitors with segments', function () {
    beforeEach(function () {
      sinon.restore();
      sinon.replace(
        MonitorConfigApiWrapper,
        'getMonitorConfigV3',
        () => new Promise((res) => res(mockedMonitorWithEntitySchema)),
      );
    });

    it('should list empty monitors for issue_d with unmonitored segment', async function () {
      const monitors = await listColumnActiveMonitors('org-test', 'model-test', 'issue_d', [
        { key: 'verification_status', value: 'Verified' },
      ]);
      expect(monitors).to.deep.equals([]);
    });

    it('should list wild card monitor for issue_d with merged segment', async function () {
      const monitors = await listColumnActiveMonitors('org-test', 'model-test', 'issue_d', [
        { key: 'purpose', value: 'car' },
      ]);
      expect(monitors).to.deep.equals(['test-monitor-dataset-purpose-segment-wildcard-excluded-credit-card']);
    });

    it('should list empty monitors for issue_d with excluded segment', async function () {
      const monitors = await listColumnActiveMonitors('org-test', 'model-test', 'issue_d', [
        { key: 'purpose', value: 'credit_card' },
      ]);
      expect(monitors).to.deep.equals([]);
    });

    it('should list monitors for issue_d with two segments', async function () {
      const monitors = await listColumnActiveMonitors('org-test', 'model-test', 'issue_d', [
        { key: 'purpose', value: 'car' },
        { key: 'verification_status', value: 'verification_status' },
      ]);
      expect(monitors).to.deep.equals(['test-monitor-dataset-segmented']);
    });
  });
});
