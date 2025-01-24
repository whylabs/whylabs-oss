import { ValueAttributes } from 'generated/dashboard-schema';
import { isExactlyNullOrUndefined } from 'utils';
import { friendlyFormat } from 'utils/numberUtils';

export type CardLayoutType = 'chip' | 'vertical' | 'horizontal' | 'horizontalGraph';

export function getCardLayoutTypeFromDimensions(rowSpan: number, columnSpan: number): CardLayoutType {
  if (rowSpan < 1 || columnSpan < 1) {
    // This is a default invalid state
    return 'chip';
  }

  if (rowSpan === 1) {
    return columnSpan === 1 ? 'chip' : 'horizontal';
  }

  // To get here, rowspan must be greater than one
  if (columnSpan === 1) {
    return 'vertical';
  }
  // In the future, we could have states here for both horizontal and vertical graphs.
  // This difference is deliberately ignored for now.
  return 'horizontalGraph';
}

export function convertToDisplayString(
  value: number | null,
  precision: number,
  valueType: ValueAttributes['valueType'] | undefined,
): string | null {
  if (isExactlyNullOrUndefined(value)) {
    return null;
  }
  const usedValue = valueType === 'percentage' ? value * 100 : value;
  const suffix = valueType === 'percentage' ? '%' : '';
  return `${friendlyFormat(usedValue, precision)}${suffix}`;
}
