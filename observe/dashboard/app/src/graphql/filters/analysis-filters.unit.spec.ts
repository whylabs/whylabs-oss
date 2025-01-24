import { expect } from 'chai';

import { AnalysisResult, SegmentTag } from '../generated/graphql';
import { filterAnalysisResults } from './analysis-filters';

const sampleTags: SegmentTag[] = [
  {
    key: 'purpose',
    value: 'car',
  },
  {
    key: 'verification_status',
    value: 'Not Verified',
  },
];

const getTestAnalysis = (tags = sampleTags): AnalysisResult => ({
  orgId: 'foo',
  datasetId: 'bar',
  tags,
});

describe('Filtering anomalies works', function () {
  describe('test filterAnalysisResults', function () {
    it('should not filter out anomalies if no tags filter was specified', function () {
      const anomalies: readonly AnalysisResult[] = [getTestAnalysis(), getTestAnalysis()];
      const res = filterAnalysisResults(anomalies, { segmentTags: null });

      expect(res).to.deep.eq(anomalies);
    });

    it('should only include anomalies for the overall segment if empty tags filter was specified', function () {
      const [anomalyA, anomalyB] = [getTestAnalysis(), getTestAnalysis([])];
      const anomalies: readonly AnalysisResult[] = [anomalyA, anomalyB];
      const res = filterAnalysisResults(anomalies, { segmentTags: [] });

      expect(res).to.deep.eq([anomalyB]);
    });

    it('should only include anomalies that match the segment filter, if one was provided', function () {
      const [anomalyA, anomalyB] = [getTestAnalysis(), getTestAnalysis([])];
      const anomalies: readonly AnalysisResult[] = [anomalyA, anomalyB];
      const res = filterAnalysisResults(anomalies, { segmentTags: sampleTags });

      expect(res).to.deep.eq([anomalyA]);
    });

    it('should filter out anomalies that dont match the segment filter', function () {
      const [anomalyA, anomalyB] = [getTestAnalysis(), getTestAnalysis([])];
      const anomalies: readonly AnalysisResult[] = [anomalyA, anomalyB];
      const res = filterAnalysisResults(anomalies, {
        segmentTags: [
          {
            key: 'foo',
            value: 'bar',
          },
        ],
      });

      expect(res).to.deep.eq([]);
    });

    it("should filter out anomalies that dont match the segment filter even if it's a partial match", function () {
      const [anomalyA, anomalyB] = [getTestAnalysis(), getTestAnalysis([])];
      const anomalies: readonly AnalysisResult[] = [anomalyA, anomalyB];
      const res = filterAnalysisResults(anomalies, {
        segmentTags: sampleTags.slice(0, 1),
      });

      expect(res).to.deep.eq([]);
    });

    it("should filter out anomalies that dont exactly match the segment filter even if it's an exact match on length and partial match on tags", function () {
      const [anomalyA, anomalyB] = [getTestAnalysis(), getTestAnalysis([])];
      const anomalies: readonly AnalysisResult[] = [anomalyA, anomalyB];
      const res = filterAnalysisResults(anomalies, {
        segmentTags: new Array(2).fill(sampleTags[0]),
      });

      expect(res).to.deep.eq([]);
    });
  });
});
