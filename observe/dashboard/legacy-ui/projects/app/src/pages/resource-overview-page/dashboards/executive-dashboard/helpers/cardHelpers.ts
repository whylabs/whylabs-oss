import { Colors } from '@whylabs/observatory-lib';
import { Card, ColorInfo, DynamicColor, ThresholdColorInfo } from 'generated/dashboard-schema';
import { Concrete } from 'types/utilityTypes';
import { isExactlyNullOrUndefined } from 'utils';

export const DEFAULT_COLORINFO: Concrete<ColorInfo> = {
  color: Colors.brandSecondary900,
  backgroundColor: Colors.whiteBackground,
  hasBorder: false,
};

export function isValidThreshold(thresholdInfo: ThresholdColorInfo): boolean {
  return !isExactlyNullOrUndefined(thresholdInfo.threshold) && !isExactlyNullOrUndefined(thresholdInfo.colorInfo);
}

export function getColumnFromGridArea(sharedColumn: boolean, gridArea: number | undefined): number | undefined {
  if (gridArea === 1) {
    return 1;
  }
  if (gridArea === 2) {
    return sharedColumn ? 3 : 2;
  }
  if (gridArea === 3) {
    return 4;
  }

  return undefined;
}

export function selectThreshold(dynamicColor: DynamicColor, value: number): ThresholdColorInfo | null {
  const isDecreasing = !!dynamicColor.decreasing;
  let thresholdFound = false;
  const { thresholdInfo } = dynamicColor;
  let selectedThresholdInfo: ThresholdColorInfo | null = null;

  thresholdInfo?.forEach((ti) => {
    if (thresholdFound || !isValidThreshold(ti)) {
      return;
    }
    thresholdFound = isDecreasing ? value > ti.threshold! : value < ti.threshold!;

    if (thresholdFound) {
      selectedThresholdInfo = ti;
    }
  });

  // Handle cases where we run off the end by using the last color in sequence.
  if (!thresholdFound && thresholdInfo && thresholdInfo.length > 0) {
    selectedThresholdInfo = thresholdInfo[thresholdInfo.length - 1];
  }

  return selectedThresholdInfo;
}

export function determineSingleDynamicColor(
  dynamicColors: DynamicColor[],
  id: string,
  value: number | null,
  defaultValue: string,
): string {
  const dynamicColor = dynamicColors.find((dc) => dc.id === id);
  if (isExactlyNullOrUndefined(value) || isExactlyNullOrUndefined(dynamicColor)) {
    return defaultValue;
  }
  const thresholdColors = selectThreshold(dynamicColor, value);
  return thresholdColors?.colorInfo.color ?? defaultValue;
}

export function determineColors(
  cardInfo: Card,
  dynamicColors: DynamicColor[],
  value: number | null,
): Concrete<ColorInfo> {
  const baseColor = cardInfo.config?.colorInfo?.color ?? DEFAULT_COLORINFO.color;
  const baseBackground = cardInfo.config?.colorInfo?.backgroundColor ?? DEFAULT_COLORINFO.backgroundColor;
  const baseBorder = cardInfo.config?.colorInfo?.hasBorder ?? DEFAULT_COLORINFO.hasBorder;
  const baseColorInfo = {
    color: baseColor,
    backgroundColor: baseBackground,
    hasBorder: baseBorder,
  };
  const dynamicColor = dynamicColors.find((dc) => dc.id === cardInfo.config?.dynamicColorId);
  if (isExactlyNullOrUndefined(value) || isExactlyNullOrUndefined(dynamicColor)) {
    return baseColorInfo;
  }
  let { color: usedColor, backgroundColor: usedBackground, hasBorder: usedBorder } = baseColorInfo;
  const thresholdColors = selectThreshold(dynamicColor, value);
  usedColor = thresholdColors?.colorInfo?.color ?? usedColor;
  usedBackground = thresholdColors?.colorInfo?.backgroundColor ?? usedBackground;
  usedBorder = thresholdColors?.colorInfo?.hasBorder ?? usedBorder;

  return {
    color: usedColor,
    backgroundColor: usedBackground,
    hasBorder: usedBorder,
  };
}
