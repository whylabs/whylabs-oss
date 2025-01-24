import { Colors } from '@whylabs/observatory-lib';
import { BoxPlotData, BoxPlotTableDataType } from './types';

type QuantilesAndColor = {
  bins: number[];
  counts: number[];
  color: string;
  profileIndex: number;
};

export function filterToValidQuantileData<T extends BoxPlotTableDataType>(tableData: T[]): QuantilesAndColor[] {
  return tableData.flatMap((profile, index) => {
    const { bins, counts } = profile?.numberSummary?.quantiles || {};
    if (profile?.numberSummary?.quantiles && bins && counts && bins.length === counts.length) {
      return [{ bins, counts, color: profile.profileColor, profileIndex: index }];
    }
    return [];
  });
}

export function generateBoxPlotData(
  bins: number[],
  counts: number[],
  color: string,
  index: number,
): BoxPlotData | null {
  let medianIndex = bins.indexOf(0.5);
  if (medianIndex < 0) {
    medianIndex = 4; // default
  }
  let firstQuartileIndex = bins.indexOf(0.25);
  if (firstQuartileIndex < 0) {
    firstQuartileIndex = 3;
  }
  let thirdQuartileIndex = bins.indexOf(0.75);
  if (thirdQuartileIndex < 0) {
    thirdQuartileIndex = 5;
  }

  if (counts.length < thirdQuartileIndex) {
    return null;
  }

  return {
    category: `Profile ${index + 1}`,
    min: counts[0],
    max: counts[counts.length - 1],
    median: counts[medianIndex],
    firstQuartile: counts[firstQuartileIndex],
    thirdQuartile: counts[thirdQuartileIndex],
    fill: Colors.transparent,
    stroke: color,
  };
}

export function convertTableTypeToBoxPlotData<T extends BoxPlotTableDataType>(tableData: T[]): BoxPlotData[] {
  const quantilesAndColors = filterToValidQuantileData(tableData);
  return quantilesAndColors.flatMap((quantileData) => {
    const boxData = generateBoxPlotData(
      quantileData.bins,
      quantileData.counts,
      quantileData.color,
      quantileData.profileIndex,
    );
    return boxData ? [boxData] : [];
  });
}
