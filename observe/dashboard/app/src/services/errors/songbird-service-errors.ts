import { DashbirdErrorCode } from '../../graphql/generated/graphql';
import { ServiceError } from './service-errors';

export class SongbirdServiceError extends ServiceError {
  constructor(message: string, code: DashbirdErrorCode) {
    super(message, code);
  }
}

export class MonitorConfigValidationError extends SongbirdServiceError {
  constructor(message: string) {
    super(message, DashbirdErrorCode.MonitorConfigValidationError);
  }
}

export class MonitorSchemaValidationError extends SongbirdServiceError {
  constructor(message?: string) {
    super(
      message ?? 'Something went wrong when updating the monitor. Please try again later.',
      DashbirdErrorCode.MonitorSchemaValidationError,
    );
  }
}
