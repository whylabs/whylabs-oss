import { DashbirdErrorCode } from '../../types/api';
import { ServiceError } from './service-errors';

export class DataServiceError extends ServiceError {
  constructor(message: string, code: DashbirdErrorCode) {
    super(message, code);
  }
}

export class QueryTooGranular extends DataServiceError {
  constructor(text?: string, granularity?: string) {
    const message = (() => {
      if (text) return text;
      return `The queried time range is too wide${
        granularity ? ` for ${granularity} granularity` : ''
      }. Please select a smaller time range.`;
    })();
    super(message, DashbirdErrorCode.QueryTooGranular);
  }
}

export class InvalidTimeRangeError extends DataServiceError {
  constructor(msg = 'The selected time range is invalid.') {
    super(msg, DashbirdErrorCode.InvalidTimeRange);
  }
}
