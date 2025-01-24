import { FeatureType } from 'generated/graphql';

export function featureTypeDisplay(type?: FeatureType): string {
  switch (type) {
    case 'UNKNOWN':
      return 'Unknown';
    case 'NULL':
      return 'Null';
    case 'FRACTION':
      return 'Fraction';
    case 'INTEGER':
      return 'Integer';
    case 'BOOLEAN':
      return 'Boolean';
    case 'TEXT':
      return 'Text';
    default:
      return 'Unknown';
  }
}
