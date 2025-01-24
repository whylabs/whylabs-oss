import {
  FREQUENT_STRINGS_MAP,
  FREQUENT_STRINGS_SAMPLE_MAP,
  createFrequentStringsAnomalyText,
  generateAbbreviatedStringList,
} from 'utils/createAlerts';

function generateProps(items: string[], maxLength: number, maxItems: number) {
  return { items, maxLength, maxItems };
}
describe('Abbreviated string array generation tests', () => {
  it('rejects bad item max input', () => {
    expect(generateAbbreviatedStringList(generateProps(['hello', 'world'], 10, -5))).toEqual('');
    expect(generateAbbreviatedStringList(generateProps(['hello', 'world'], 10, 0))).toEqual('');
  });

  it('does nothing to happy short strings', () => {
    const output = generateAbbreviatedStringList(generateProps(['one', 'two', 'three'], 10, 5));
    expect(output).toEqual('one, two, three');
  });

  it('cuts a list short when asked', () => {
    const output = generateAbbreviatedStringList(
      generateProps(['one', 'two', 'three', 'four', 'tell', 'me', 'that', 'you'], 10, 4),
    );
    expect(output).toEqual('one, two, three, four');
  });

  it('abbreviates as expected', () => {
    const output = generateAbbreviatedStringList(generateProps(['hello', 'darkness', 'my', 'old', 'friend'], 4, 5));
    expect(output).toEqual('hell\u2026, dark\u2026, my, old, frie\u2026');
  });
});

describe('Testing the frequent string comparison anomaly text generation', () => {
  it('Returns empty array for incorrect analyzer types', () => {
    const emptyOutput = createFrequentStringsAnomalyText({ tags: [] });
    const driftOutput = createFrequentStringsAnomalyText({ analyzerType: 'drift', tags: [] });

    expect(emptyOutput).toEqual([]);
    expect(driftOutput).toEqual([]);
  });

  it('Returns the expected format for eq operator anomalies', () => {
    const eqOutput = createFrequentStringsAnomalyText({
      tags: [],
      analyzerType: 'frequent_string_comparison',
      frequentStringComparison_operator: 'eq',
      frequentStringComparison_sample: ['hello', 'world'],
    });
    const expectedOutput = [FREQUENT_STRINGS_MAP.get('eq'), `${FREQUENT_STRINGS_SAMPLE_MAP.get('eq')} hello, world`];
    expect(eqOutput).toEqual(expectedOutput);
    expect(eqOutput[1]).toContain('Incorrect');
  });

  it('Returns the expected format for basline-includes-target anomalies', () => {
    const unexpectedValuesOutput = createFrequentStringsAnomalyText({
      tags: [],
      analyzerType: 'frequent_string_comparison',
      frequentStringComparison_operator: 'baseline_includes_all_target',
      frequentStringComparison_sample: ['hello', 'madam', 'i', 'am', 'adamadamadamadam'],
    });

    const expectedOutput = [
      FREQUENT_STRINGS_MAP.get('baseline_includes_all_target'),
      `${FREQUENT_STRINGS_SAMPLE_MAP.get('baseline_includes_all_target')} hello, madam, i, am, adamadamadam\u2026`,
    ];
    expect(unexpectedValuesOutput).toEqual(expectedOutput);
    expect(unexpectedValuesOutput[0]).toContain('Unexpected');
  });

  it('Returns the expected output for a target-includes-baseline anomaly', () => {
    const missingValuesOutput = createFrequentStringsAnomalyText({
      tags: [],
      analyzerType: 'frequent_string_comparison',
      frequentStringComparison_operator: 'target_includes_all_baseline',
      frequentStringComparison_sample: ['hello', 'darkness', 'my', 'old', 'friend'],
    });

    const expectedOutput = [
      FREQUENT_STRINGS_MAP.get('target_includes_all_baseline'),
      `${FREQUENT_STRINGS_SAMPLE_MAP.get('target_includes_all_baseline')} hello, darkness, my, old, friend`,
    ];
    expect(missingValuesOutput).toEqual(expectedOutput);
    expect(missingValuesOutput[0]).toContain('include all expected');
  });

  it('Only returns the first line if there are no example strings passed', () => {
    const missingValuesMissingOutput = createFrequentStringsAnomalyText({
      tags: [],
      analyzerType: 'frequent_string_comparison',
      frequentStringComparison_operator: 'target_includes_all_baseline',
    });
    const expectedOutput = [FREQUENT_STRINGS_MAP.get('target_includes_all_baseline')];
    expect(missingValuesMissingOutput).toEqual(expectedOutput);
  });
});
