import { Colors } from '@whylabs/observatory-lib';

export function prepareCategoriesWithOtherData(
  shownCategories: [string, number][],
  otherCategories: [string, number][],
  usedOtherName: string,
): string[] {
  const otherCount = otherCategories.reduce((acc, curr) => {
    if (curr && curr.length > 1) {
      return acc + curr[1];
    }
    return acc;
  }, 0);
  const otherRank = shownCategories.findIndex((sc) => sc[1] < otherCount);
  const visibleCategories = [...shownCategories.map((sc) => sc[0])];
  if (otherCategories.length > 0) {
    if (otherRank > -1) {
      visibleCategories.splice(otherRank, 0, usedOtherName);
    } else {
      visibleCategories.push(usedOtherName);
    }
  }
  return visibleCategories;
}

export function generateColorRange(visibleCategories: string[], usedOtherName: string, otherColor: string): string[] {
  const colorArray = [...Colors.chartColorArray];
  const otherIndex = visibleCategories.indexOf(usedOtherName);
  if (otherIndex >= 0) {
    colorArray.splice(otherIndex, 0, otherColor);
  }
  return colorArray;
}
