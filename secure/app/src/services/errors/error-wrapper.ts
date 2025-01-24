import { AxiosError } from 'axios';

import { QueryTooGranular } from './data-service-errors';

/*
 * Maps pervasive data service query errors that needs to be communicated to users.
 */
export const mapDataServiceQueryError = (err: AxiosError): Error => {
  const errText = err.response?.statusText;
  if (errText?.includes('Query too granular') || errText?.includes('Offset cannot exceed max number of pages')) {
    return new QueryTooGranular();
  }
  return err;
};
