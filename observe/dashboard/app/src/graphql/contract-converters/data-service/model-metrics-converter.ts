import { ClassificationSummaryRow } from '@whylabs/data-service-node-client';

import { ModelMetrics } from '../../../graphql/generated/graphql';
import { safeParseNumber } from '../../../util/numbers';

export const modelMetricsToGql = ({
  confusion,
  roc,
  precision,
  calibration,
}: ClassificationSummaryRow): ModelMetrics => {
  return {
    __typename: 'ModelMetrics',
    calibration: {
      values: calibration.map((pair) => pair.map((v) => safeParseNumber(v))),
    },
    confusion: {
      labels: confusion.labels,
      counts: confusion.counts,
      targetField: confusion.target_field,
      predictionsField: confusion.predictions_field,
      scoreField: confusion.score_field,
    },
    fprTpr: { values: roc },
    recallPrecision: { values: precision },
  };
};
