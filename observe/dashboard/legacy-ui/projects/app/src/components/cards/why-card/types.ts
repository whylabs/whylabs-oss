import { JSONValue } from 'types/genericTypes';

type SingleValuesCardType = 'singleValues';
type TotalCountCardType = 'totalCount';
export type DatatypeMonitoringCardType = 'schema';
export type FeatureMonitoringCardType = 'missingValues' | 'uniqueValues';
export type MonitoringCardType = FeatureMonitoringCardType | DatatypeMonitoringCardType;
export type MV3CardType = 'drift';
export type UtilityCardType = 'multiple' | 'loading' | 'output';
export type LLMCardType = 'security' | 'performance';
export type CardType =
  | MonitoringCardType
  | UtilityCardType
  | SingleValuesCardType
  | MV3CardType
  | TotalCountCardType
  | LLMCardType;

const cardTypesMapper = new Map<string, CardType>([
  ['drift', 'drift'],
  ['uniqueValues', 'uniqueValues'],
  ['missingValues', 'missingValues'],
  ['singleValues', 'singleValues'],
  ['output', 'output'],
  ['totalCount', 'totalCount'],
  ['schema', 'schema'],
  ['security', 'security'],
  ['performance', 'performance'],
]);
export const isCardType = (cardType: JSONValue): cardType is CardType => {
  if (typeof cardType === 'string') {
    return !!cardTypesMapper.get(cardType);
  }
  return false;
};
