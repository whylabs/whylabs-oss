interface CommonBins {
  commonBins: number[];
  binSize: number;
  binCount: number;
}

const MIN_BIN_SIZE = 1e-42;
const MAX_BIN_SIZE = 1e42;

export const createCommonBinsAsync = (
  min: number | undefined,
  max: number | undefined,
  binCount = 30,
): Promise<CommonBins> =>
  new Promise<CommonBins>((resolve, reject) => {
    if (min === undefined || max === undefined) return reject(Error('Minimum or maximum value does not exist'));
    if (min === max) return reject(Error('Minimum and maximum values are the same'));
    if (min > max) return reject(Error('Minimum can not be greater than maximum value'));
    const binSize = (max - min) / binCount;
    if (Math.abs(binSize) < MIN_BIN_SIZE) reject(Error('Bin size value is below minimum threshold'));
    if (Math.abs(binSize) > MAX_BIN_SIZE) reject(Error('Bin size value is above maximum threshold'));

    const elements = [...Array(binCount)];
    const commonBins = elements.map((_, i) => {
      const multiplier = i + 1;

      return min + binSize * multiplier;
    });

    return resolve({
      commonBins: [min, ...commonBins], // Includes min value
      binSize,
      binCount,
    });
  });
