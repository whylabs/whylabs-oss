// Number filter conditions
export const EQUAL_CONDITION = '=';
export const GREATER_THAN_CONDITION = '>';
export const GREATER_THAN_OR_EQUAL_CONDITION = '>=';
export const LESS_THAN_CONDITION = '<';
export const LESS_THAN_OR_EQUAL_CONDITION = '<=';

export const ALL_NUMBER_CONDITIONS = [
  EQUAL_CONDITION,
  GREATER_THAN_CONDITION,
  GREATER_THAN_OR_EQUAL_CONDITION,
  LESS_THAN_CONDITION,
  LESS_THAN_OR_EQUAL_CONDITION,
] as const;

export type NumberFilterCondition = (typeof ALL_NUMBER_CONDITIONS)[number];

// List filter conditions
export const INCLUDES_CONDITION = 'includes';
export const EXCLUDES_CONDITION = 'excludes';

export const stringIsNumberFilterCondition = (str: string | null | undefined): str is NumberFilterCondition =>
  typeof str === 'string' && ALL_NUMBER_CONDITIONS.includes(str as NumberFilterCondition);

export const createNumberFilter = ({
  condition,
  key,
  value,
}: {
  condition: NumberFilterCondition;
  key: string;
  value: number;
}): Record<string, number> => {
  const filter: Record<string, number> = {};

  if (condition === EQUAL_CONDITION) {
    filter[`min${key}`] = value;
    filter[`max${key}`] = value;
  } else if (condition === LESS_THAN_CONDITION) {
    // The server uses less than or equal to, so we subtract 1
    filter[`max${key}`] = value - 1;
  } else if (condition === LESS_THAN_OR_EQUAL_CONDITION) {
    filter[`max${key}`] = value;
  } else if (condition === GREATER_THAN_CONDITION) {
    // The server uses greater than or equal to, so we add 1
    filter[`min${key}`] = value + 1;
  } else if (condition === GREATER_THAN_OR_EQUAL_CONDITION) {
    filter[`min${key}`] = value;
  }

  return filter;
};
