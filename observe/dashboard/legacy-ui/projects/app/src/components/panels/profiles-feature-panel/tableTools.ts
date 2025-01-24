import { Colors } from '@whylabs/observatory-lib';
import { timeLong } from 'utils/dateUtils';
import { NumberOrString } from 'utils/queryUtils';
import { isExactlyNullOrUndefined } from 'utils/nullUtils';
import { clone } from 'ramda';
import { SortDirectionType } from 'hooks/useSort/types';
import { SortDirection } from 'generated/graphql';
import { ProfileTrioRow } from './tableTypes';

export const SORTABLE_COLUMN_MIN_WIDTH = 142;

export function isConvertableToNumber(value: string): boolean {
  return parseFloat(value).toString() === value;
}

export function generateChipValue(value: string): string {
  if (isConvertableToNumber(value)) {
    const toFormat = parseFloat(value);
    if (toFormat % 1 === 0) {
      return toFormat.toFixed(0);
    }
    return toFormat.toFixed(2);
  }
  return value;
}

type LabelAndColorDatum = { label: string; color: string };
type LabelAndColorData = LabelAndColorDatum[];
export function formatDataForTooltip(row: { [key: string]: string | number }): LabelAndColorData {
  const tempRow = { ...row };
  delete tempRow.value;

  Object.keys(tempRow).forEach((key) => {
    if (tempRow[key] === '-') delete tempRow[key];
  });

  return Object.keys(tempRow).map((key) => {
    const [profile, count] = key.split('-');

    return {
      label: `${profile} ${count}`,
      color: Colors.profilesColorPool[parseInt(count, 10) - 1],
    };
  });
}

export function readableProfileId(profileId: NumberOrString): string {
  if (typeof profileId === 'string') {
    return profileId;
  }
  return timeLong(profileId);
}

const CURRENT_COLUMN_INDEX_MAX = 2; // 0-indexed
export function countValidColumns(rows: ProfileTrioRow[], max = 3): number {
  return Array.from({ length: max }, (_, i) => i).reduce((acc, i) => {
    if (i > CURRENT_COLUMN_INDEX_MAX) {
      return acc;
    }
    // Look for the first row with a non-null value in the column
    const hasValidData = rows.some((row) => row.profileCounts[i] !== null);
    return hasValidData ? acc + 1 : acc;
  }, 0);
}

export type TableSortTarget = 'index' | 'profile1' | 'profile2' | 'profile3' | 'unknown';
type IndexFunction<T> = (row: T) => NumberOrString;

export function sortRows<T extends ProfileTrioRow>(
  rows: T[],
  getIndexedValue: IndexFunction<T>,
  target: TableSortTarget,
  sortDirection: SortDirectionType,
): T[] {
  if (target === 'unknown' || sortDirection === undefined) {
    return rows;
  }
  const sortedRows = clone(rows);
  sortedRows.sort((a, b) => {
    if (target === 'index') {
      const aValue = getIndexedValue(a);
      const bValue = getIndexedValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === SortDirection.Asc ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === SortDirection.Asc ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return 0;
    }
    const profileIndex = parseInt(target.replace('profile', ''), 10) - 1;
    if (
      isExactlyNullOrUndefined(a.profileCounts[profileIndex]) ||
      isExactlyNullOrUndefined(b.profileCounts[profileIndex])
    ) {
      return 0;
    }
    const dist = a.profileCounts[profileIndex]! - b.profileCounts[profileIndex]!;
    return sortDirection === SortDirection.Asc ? dist : -dist;
  });
  return sortedRows;
}
