import { promises as fs } from 'fs';
import path from 'path';

import { ExecutionResult } from 'graphql/execution/execute';
import { difference, get } from 'lodash';

import { notNullish } from '../../util/misc';
import { expect } from '../integration-common';
import { allAnalyzerTypeFields, analyzerTypeFields } from './analysis-results';
import { BatchesWithId, Sketch, filterBatches } from './filtersort';

// Folder containing previously captured results from queries
const test_dir = path.resolve(`${__dirname}/../`);
export const EXPECTED_DIR = `${test_dir}/graphql/expected`;
// Tests write actual results into the following folder to help with debug on test fail
export const ACTUAL_DIR = `${test_dir}/graphql/actual`;

// I'm sure there's a better abstraction to be had around doing these checks and filtering so please feel free
// to improve!!

export const getExpected = async (caseName: string): Promise<object> => {
  const text = await fs.readFile(`${EXPECTED_DIR}/${caseName}.json`, 'utf8');
  return JSON.parse(text);
};

export const saveActual = async (caseName: string, actual: object): Promise<void> => {
  await fs.writeFile(`${ACTUAL_DIR}/${caseName}.json`, JSON.stringify(actual, null, 2));
};

export const checkNoError = (res: ExecutionResult): void => {
  expect(res.errors, `Got error ${JSON.stringify(res.errors)}`).to.be.undefined;
};

const SMALL_NUMBER = 1e-10;
/**
 * checkAgainstExpected clones the original result, applies the filtersort function to remove fields that should not be
 * compared, and then does a deep comparison against the expected result (also filtered).
 * @param res
 * @param caseName
 * @param filtersort
 */
export const checkAgainstExpected = (
  actual: ExecutionResult,
  expected: object,
  filtersort: (d: object) => object = (d) => d,
): void => {
  checkNoError(actual);
  const data: object = actual as object;
  expect(filtersort(data)).to.deep.eq(filtersort(expected));
};

/**
 * checkCase is an all-in-one that retrieves the expected results, saves the actual results and performs a
 * checkAgainstExpected. Use this only if you dont need to perform additional checks.
 * @param res
 * @param caseName
 * @param filtersort
 */
export const checkCase = async (
  res: ExecutionResult,
  caseName: string,
  filtersort: (d: object) => object = (d) => d,
): Promise<void> => {
  await saveActual(caseName, res);
  checkAgainstExpected(res, await getExpected(caseName), filtersort);
};

export const floatFieldsNumberSummary = ['mean', 'min', 'max', 'stddev'];
/**
 * Histogram and quantile counts aren't stable but should be within some bounds of each other.
 * @param actual
 * @param caseName
 * @param percent
 */
export const checkSketchApproxSame = (actual: Sketch | undefined, expected: Sketch, percent = 0.1): void => {
  // recast into a structure we can usefully compare
  const actualCounts = actual?.numberSummary?.histogram?.counts ?? [];
  const expectedCounts = expected.numberSummary?.histogram?.counts ?? [];
  expect(
    actualCounts.length,
    `Actual histogram for ${expected.featureName} has ${actualCounts.length} not ${expectedCounts.length} counts`,
  ).to.eq(expectedCounts.length);
  expected.numberSummary?.histogram?.counts.forEach((count: number, countIndex) => {
    const actualCount = actualCounts[countIndex];
    expect(
      actualCount,
      `Histogram count for ${expected.featureName} position ${countIndex} of ${actualCount} not similar to ${count} `,
    ).to.be.approximately(count, count * percent);
  });
  const actualQuantiles = actual?.numberSummary?.quantiles;
  const expectedQuantiles = expected.numberSummary?.quantiles;
  expect(
    actualQuantiles?.counts?.length,
    `Actual quantiles for ${expected.featureName} have ${actualQuantiles?.counts?.length} not ${expectedQuantiles?.counts?.length} counts`,
  ).to.eq(expectedQuantiles?.counts?.length);
  expect(
    actualQuantiles?.bins?.length,
    `Actual quantiles for ${expected.featureName} have ${actualQuantiles?.bins?.length} not ${expectedQuantiles?.bins?.length} bins`,
  ).to.eq(expectedQuantiles?.bins?.length);
  // expected?.numberSummary?.quantiles?.counts?.forEach((count: number, countIndex) => {
  //   TODO quantile count similarity is more difficult due to boundary changes
  //   const actualCount = actualCounts[countIndex];
  //   expect(
  //     actualCount,
  //     `Quantile count ${actualCount} not similar to ${count} in batch #${batchIndex} sketch #${sketchIndex} `,
  //   ).to.be.approximately(count, count * percent);
  // });
  if (get(expected?.numberSummary, 'count') !== 0) {
    floatFieldsNumberSummary.forEach((f) => {
      const val = get(expected?.numberSummary, f);
      const actualVal = get(actual?.numberSummary, f);
      if (notNullish(val)) {
        expect(actualVal, `${f} for ${expected.featureName} should approx equal ${val} but is null`).to.not.be.null;
        const diffAllowed = Math.max(val * percent, SMALL_NUMBER);
        expect(
          actualVal,
          `${f} for ${expected.featureName}should approx equal ${val} but is ${actualVal}`,
        ).to.be.approximately(val, diffAllowed);
      } else {
        if (val === null) {
          expect(actualVal, `${f} for ${expected.featureName} should be null but is ${actualVal}`).to.be.null;
        } else {
          expect(actualVal, `${f} for ${expected.featureName} should be undefined but is ${actualVal}`).to.be.undefined;
        }
      }
    });
  }
};

export const checkHistogramApproxSame = (actual: ExecutionResult, expected: BatchesWithId, percent = 0.1): void => {
  const sortedActual = filterBatches(actual as BatchesWithId, true);
  const sortedExpected = filterBatches(expected, true);
  sortedExpected.data?.model?.batches?.forEach((batch, batchIndex) => {
    const actualBatch = sortedActual.data?.model?.batches[batchIndex];
    batch.sketches.results.forEach((sketch: Sketch, sketchIndex) => {
      const actualSketch: Sketch | undefined = actualBatch?.sketches.results[sketchIndex];
      checkSketchApproxSame(actualSketch, sketch, percent);
    });
  });
  sortedExpected.data?.model?.referenceProfiles?.forEach((ref, refIndex) => {
    const actualRef = sortedActual.data?.model?.referenceProfiles[refIndex];
    ref.sketches.results.forEach((sketch: Sketch, sketchIndex) => {
      const actualSketch: Sketch | undefined = actualRef?.sketches.results[sketchIndex];
      checkSketchApproxSame(actualSketch, sketch, percent);
    });
  });
};

/**
 * In druid there were no nulls. Now we should be returning nulls for fields that aren't relevant in analysis results.
 * This checks them.
 * @param actual
 */
type PartialAnalysisResult = {
  [index: string]: unknown;
  analyzerType?: string | null;
  id?: string | null;
};
export const checkNullsInAnalysisResults = (results: PartialAnalysisResult[]): void => {
  results?.forEach((r: PartialAnalysisResult) => {
    const notRelevant = difference(allAnalyzerTypeFields, analyzerTypeFields[r.analyzerType ?? '']);
    notRelevant.forEach((f) => {
      // will be undefined if not in query
      if (r[f] === undefined) return;
      if (r[f] === null) return;
      expect(r[f], `Field ${f} should be null but is ${r[f]}`).to.be.oneOf([null, 0]);
      // Temporarily remove this test as postgres keeps flip-flopping
      // expect(r[f], `Field ${f} should be null but is ${r[f]}`).to.be.null;
    });
  });
};
