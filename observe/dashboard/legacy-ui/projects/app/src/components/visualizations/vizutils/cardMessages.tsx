interface CardMessages {
  readonly uniques: string;
  readonly missingValues: string;
  readonly schema: string;
  readonly distribution: string;
  readonly unknownDistribution: string;
  readonly output: string;
  readonly statistical: string;
}

const MIN_DATA_THRESOLD = 1;
const CONDITION_COUNT_NAME = 'Ω';
const WHYLABS_CONDITION_COUNT_NAME = 'whylabs.condition';
const noDataMessages: CardMessages = {
  uniques: 'Insufficient data in time period to show unique value counts.',
  missingValues: 'Insufficient missing value data in time period.',
  schema: 'Insufficient data type information in time period.',
  distribution: 'Insufficient data available for time period.',
  unknownDistribution: 'Drift and distribution charts are not supported for unknown data type.',
  output: 'Insufficient data available for time period.',
  statistical: 'Insufficient data available for time period.',
};

const notSupportedMessages: CardMessages = {
  uniques: 'Unique value counts are not supported for this feature.',
  missingValues: 'Missing value counts are not supported for this feature.',
  schema: 'Data type information is unavailable for this feature.',
  distribution: 'Drift and distribution charts are not supported for this feature.',
  unknownDistribution: 'Drift and distribution charts are not supported for this feature.',
  output: 'Outupt value counts are not supported for this feature.',
  statistical: 'Statistical values are not supported for this feature.',
};

export function getNoDataMessage(
  dataCount: number,
  k: keyof CardMessages,
  override = false,
  columnName = '',
): React.ReactNode | null {
  if (override || dataCount < MIN_DATA_THRESOLD) {
    const hasConditionCount =
      columnName.startsWith(CONDITION_COUNT_NAME) || columnName.includes(WHYLABS_CONDITION_COUNT_NAME);
    return hasConditionCount ? notSupportedMessages[k] : noDataMessages[k];
  }
  return null;
}

export function getNoFeatureMessage(featureName: string | undefined, projectName: string | undefined): string {
  let message = `No feature found`;
  if (featureName) {
    message += ` named "${featureName}"`;
    if (projectName) {
      message += ` in the project "${projectName}"`;
    }
  }
  return message;
}
