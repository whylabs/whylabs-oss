import times from 'lodash/times';

const metricsPrefix = 'whylogs.metrics.';

export function isMetricName(name: string): boolean {
  return name.startsWith(metricsPrefix);
}

/**
 * Remove the internal prefix that we assign to metric outputs. This is a temporary
 * thing we do to performance metric names to allow us to put them along side other features
 * and have them automatically monitored. Eventually they'll get their own section in whylogs
 * and our schema and we won't have to do this.
 */
export function removeMetricsPrefix(name: string): string {
  // just use the last dot section
  if (isMetricName(name)) {
    const parts = name.split('.');
    return parts[parts.length - 1];
  }
  return name;
}

const NUMERICS = '0123456789';
const ALPHAS = 'abcdefghijklmnopqrstuvwxyz';
const JOINED = [...NUMERICS.split(''), ...ALPHAS.split('')];
const DEFAULT_RAND_LENGTH = 6;
/**
 * We use the JOINED array (above) as a set from which we select our mini-uuids.
 * The Math.random()-created value is used as an index.
 * @returns a randomly chosen character from the acceptable set
 */
function getCharacter(): string {
  return JOINED[Math.floor(Math.random() * JOINED.length)];
}

function getRandomizedCharGroup(length: number): string {
  const nameChars: string[] = [];
  times(length, () => {
    nameChars.push(getCharacter());
  });
  return nameChars.join('');
}

function getUniqueCharGroup(existingNames: string[] = [], startingLength: number): string {
  if (existingNames.length === 0) {
    return getRandomizedCharGroup(startingLength);
  }
  for (let i = 0; i < existingNames.length; i += 1) {
    const group = getRandomizedCharGroup(startingLength + i);
    if (existingNames.every((a) => !a.includes(group))) {
      return group;
    }
  }
  return getRandomizedCharGroup(startingLength + existingNames.length);
}

export function getRandomizedCharName(
  prefix: string,
  existingNames: string[] = [],
  length = DEFAULT_RAND_LENGTH,
): string {
  const uniqueSuffix = getUniqueCharGroup(existingNames, length);
  return `${prefix}-${uniqueSuffix}`;
}
