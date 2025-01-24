import { severityToString, severityToFriendlyDescriptor } from '../../../notifications/monitor/common';

describe('common functions', () => {
  describe('severityToFriendlyDescriptor', () => {
    it('should support high severity', async () => {
      expect(severityToFriendlyDescriptor(1)).toEqual('a high severity issue');
    });

    it('should support medium severity', async () => {
      expect(severityToFriendlyDescriptor(2, 4)).toEqual('4 medium severity issues');
    });

    it('should support low severity', async () => {
      expect(severityToFriendlyDescriptor(3, 1)).toEqual('a low severity issue');
    });

    it('should support severities outside of 1-3', async () => {
      expect(severityToFriendlyDescriptor(4)).toEqual('a severity 4 issue');
    });

    it('should support multiple anomalies with severity outside of 1-3', async () => {
      expect(severityToFriendlyDescriptor(4, 3)).toEqual('3 severity 4 issues');
    });
  });
  describe('severityNumberToString', () => {
    it('should support high severity', async () => {
      expect(severityToString(1)).toEqual('high');
    });

    it('should support medium severity', async () => {
      expect(severityToString(2)).toEqual('medium');
    });

    it('should support low severity', async () => {
      expect(severityToString(3)).toEqual('low');
    });

    it('should support severities outside of 1-3', async () => {
      expect(severityToString(4)).toEqual(`severity 4`);
    });
  });
});
