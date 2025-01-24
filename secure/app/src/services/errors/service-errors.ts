import { DashbirdErrorCode } from '../../types/api';

// common base type for these wrapped errors
export class ServiceError extends Error {
  code: DashbirdErrorCode;

  constructor(message: string, code: DashbirdErrorCode) {
    super(message);
    this.code = code;
  }
}
