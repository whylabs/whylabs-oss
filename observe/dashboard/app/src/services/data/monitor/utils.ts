import { columnDataTypeMap } from '../../../graphql/contract-converters/songbird/entity-schema-converters';
import { FeatureType, SegmentTag } from '../../../graphql/generated/graphql';
import { Analyzer, Segment } from '../../../schemas/generated/monitor-schema';
import { JSONValue } from '../../../types/generic-types';
import { ColumnSchema } from '../datasources/helpers/entity-schema';

export const MONITOR_TARGET_GROUP_OPTIONS = [
  'group:continuous',
  'group:discrete',
  'group:input',
  'group:output',
  'group:bool',
  'group:int',
  'group:frac',
  'group:str',
] as const;

export type MonitorTargetGroup = (typeof MONITOR_TARGET_GROUP_OPTIONS)[number];

export const checkColumnIsInSomeGroup = (columnSchema: ColumnSchema, groups: JSONValue[]): boolean => {
  let isPartOfGroup = groups.includes(columnSchema.column) || groups.includes('*');
  const usedColumnGroups = groups.filter(
    (item): item is MonitorTargetGroup => !!MONITOR_TARGET_GROUP_OPTIONS.find((g) => g === item),
  );
  for (const group of usedColumnGroups) {
    if (isPartOfGroup) break;
    isPartOfGroup = checkColumnIsPartOfGroup(columnSchema, group);
  }
  return isPartOfGroup;
};

export const checkColumnIsPartOfGroup = (columnSchema: ColumnSchema, group: MonitorTargetGroup): boolean => {
  const inferredDataType = columnDataTypeMap.get(columnSchema.dataType ?? '');
  switch (group) {
    case 'group:bool':
      return inferredDataType === FeatureType.Boolean;
    case 'group:frac':
      return inferredDataType === FeatureType.Fraction;
    case 'group:int':
      return inferredDataType === FeatureType.Integer;
    case 'group:str':
      return inferredDataType === FeatureType.Text;
    case 'group:input':
      return columnSchema.classifier === 'input';
    case 'group:output':
      return columnSchema.classifier === 'output';
    case 'group:continuous':
      return columnSchema.discreteness === 'continuous';
    case 'group:discrete':
      return columnSchema.discreteness === 'discrete';
    default:
      return false;
  }
};

export const filterColumnsByTargetMatrix = (
  resourceColumns: ColumnSchema[],
  includeArray: JSONValue[],
  excludeArray: JSONValue[],
): string[] => {
  return resourceColumns.flatMap((columnSchema) => {
    const isIncluded = checkColumnIsInSomeGroup(columnSchema, includeArray);
    const isExcluded = checkColumnIsInSomeGroup(columnSchema, excludeArray);
    const isTargetedFeature = isIncluded && !isExcluded;
    return isTargetedFeature ? columnSchema.column : [];
  });
};

export const filterAnalyzersByColumn = (columnSchema: ColumnSchema, analyzers: Analyzer[]): string[] => {
  return analyzers.flatMap(({ targetMatrix, id, disabled }) => {
    if (!id || disabled) return [];
    if (targetMatrix?.type === 'dataset') return id;
    if (targetMatrix?.type === 'column') {
      const isIncluded = checkColumnIsInSomeGroup(columnSchema, targetMatrix.include ?? []);
      const isExcluded = checkColumnIsInSomeGroup(columnSchema, targetMatrix.exclude ?? []);
      const isTargetedFeature = isIncluded && !isExcluded;
      return isTargetedFeature ? id : [];
    }
    return [];
  });
};

const WILDCARD = '*';

const checkIsSegmentTargeted = (targetMatrixSegment: Segment[], segments: SegmentTag[]): boolean => {
  let includedSegments = !targetMatrixSegment?.length && !segments?.length;
  for (const analyzerSegment of targetMatrixSegment) {
    if (includedSegments) break;
    const commonSegments = segments.reduce((acc, currentSegment) => {
      const hasSegment = analyzerSegment.tags.find(
        ({ key, value }) => key === currentSegment.key && (value === currentSegment.value || value === WILDCARD),
      );
      return hasSegment ? acc + 1 : acc;
    }, 0);
    includedSegments = commonSegments === segments.length && commonSegments === analyzerSegment.tags.length;
  }
  return includedSegments;
};

export const filterAnalyzerBySegments = (analyzers: Analyzer[], segments: SegmentTag[]): Analyzer[] => {
  return analyzers.filter((an) => {
    const { targetMatrix } = an;
    if (!targetMatrix) return false; // Todo: how should we threat composition monitors?
    const includedSegments = checkIsSegmentTargeted(targetMatrix.segments ?? [], segments);
    const excludedSegments = targetMatrix.excludeSegments?.length
      ? checkIsSegmentTargeted(targetMatrix.excludeSegments, segments)
      : false;
    return includedSegments && !excludedSegments;
  });
};
