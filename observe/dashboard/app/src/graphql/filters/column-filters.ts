import { ColumnSchema } from '../../services/data/datasources/helpers/entity-schema';
import { FeatureSketchFilter, Maybe } from '../generated/graphql';
/**
 * These functions apply a FeatureSketchFilter to columns in the entity schema.
 */

type ColumnFilterFunction = (column: ColumnSchema) => boolean;

const byColumnName =
  (columnName?: Maybe<string>): ColumnFilterFunction =>
  (columnSchema) =>
    !columnName ? true : columnSchema.column === columnName;

const bySubstring =
  (substring?: Maybe<string>): ColumnFilterFunction =>
  (columnSchema) =>
    substring == null || columnSchema.column.includes(substring);

const bySubstrings =
  (substrings?: Maybe<string[]>): ColumnFilterFunction =>
  (columnSchema) =>
    substrings === null || substrings === undefined || substrings.some((ss) => columnSchema.column.includes(ss));

const byDiscreteness =
  (includeDiscrete: boolean, includeNonDiscrete: boolean): ColumnFilterFunction =>
  (columnSchema) => {
    // include everything if both filters are True, exclude everything if both are False
    if (includeDiscrete === includeNonDiscrete) return includeDiscrete && includeNonDiscrete;

    const columnIsDiscrete = columnSchema.discreteness === 'discrete';
    return (columnIsDiscrete && includeDiscrete) || (!columnIsDiscrete && includeNonDiscrete);
  };

const byColumnNames =
  (columnNames?: Maybe<string[]>): ColumnFilterFunction =>
  (columnSchema) => {
    if (columnNames && columnNames.length > 0) return columnNames.includes(columnSchema.column);

    return true;
  };

export const filterColumnSchemas = (columns: ColumnSchema[], filter: FeatureSketchFilter): ColumnSchema[] => {
  const { substring, substrings, includeDiscrete, includeNonDiscrete, featureName, featureNames } = filter ?? {};
  return columns
    .filter(bySubstrings(substrings))
    .filter(bySubstring(substring))
    .filter(byColumnNames(featureNames))
    .filter(byColumnName(featureName))
    .filter(byDiscreteness(includeDiscrete ?? true, includeNonDiscrete ?? true));
};
