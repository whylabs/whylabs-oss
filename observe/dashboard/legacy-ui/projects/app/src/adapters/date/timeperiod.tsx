import { TimePeriod } from 'generated/graphql';

type BatchType = 'Hourly' | 'Daily' | 'Unknown' | 'Weekly' | 'Monthly';

export function convertAbbreviationToBatchType(abbreviation?: TimePeriod): BatchType {
  if (abbreviation === 'P1D') {
    return 'Daily';
  }
  if (abbreviation === 'PT1H') {
    return 'Hourly';
  }
  if (abbreviation === 'P1W') {
    return 'Weekly';
  }
  if (abbreviation === 'P1M') {
    return 'Monthly';
  }
  return 'Unknown';
}
