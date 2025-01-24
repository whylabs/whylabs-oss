import { SimpleDateRange } from 'utils/dateRangeUtils';
import { generateStatisticalValueQueryVariables } from '../createQueryVariables';

const SAMPLE_DATE_RANGE: SimpleDateRange = {
  from: new Date('2024-01-02T00:00:00.000Z').getTime(),
  to: new Date('2024-01-09T23:59:59.999Z').getTime(),
};

/**
 * This test ensures that all statistical values queries use data with the anomaliesOnly field
 * set to FALSE. This test will fail if you change the output of the function -- that is its only purpose.
 *
 * This test may never be changed without putting an equivalent one in place to satisfy protection against
 * the incident tracked at https://app.clickup.com/t/8677e3guq , unless the statistical values graphs no longer
 * exist.
 */
describe('Verifies that we never unintentionally change the anomalies only field', () => {
  it('will never return a value with anomaliesOnly set to true', () => {
    const adhocVariables = generateStatisticalValueQueryVariables({
      datasetId: 'foo',
      featureId: 'bar',
      adhocRunId: 'adhoc',
      tags: [],
      dateRange: SAMPLE_DATE_RANGE,
    });
    const segmentedVariables = generateStatisticalValueQueryVariables({
      datasetId: 'foo',
      featureId: 'bar',
      tags: [{ key: 'hello', value: 'world' }],
      dateRange: SAMPLE_DATE_RANGE,
    });
    const nonSegmentedVariables = generateStatisticalValueQueryVariables({
      datasetId: 'foo',
      featureId: 'bar',
      tags: [],
      dateRange: SAMPLE_DATE_RANGE,
    });
    expect(adhocVariables.anomaliesOnly).toBeFalsy();
    expect(segmentedVariables.anomaliesOnly).toBeFalsy();
    expect(nonSegmentedVariables.anomaliesOnly).toBeFalsy();
  });
});
