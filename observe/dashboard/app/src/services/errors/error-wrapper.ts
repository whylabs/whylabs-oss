import { AxiosError } from 'axios';

import { GraphQLContext } from '../../graphql/context';
import { DashbirdErrorCode } from '../../graphql/generated/graphql';
import { getErrorType } from '../../util/logging';
import { QueryTooGranular } from './data-service-errors';
import {
  MonitorConfigValidationError,
  MonitorSchemaValidationError,
  SongbirdServiceError,
} from './songbird-service-errors';

const getGranularityFromErrorMessage = (message: string): string | undefined => {
  if (message.includes('(hourly)')) return 'hourly';
  if (message.includes('(daily)')) return 'daily';
  if (message.includes('(weekly)')) return 'weekly';
  if (message.includes('(monthly)')) return 'monthly';
  return undefined;
};

/*
 * Maps songbird and data service errors that need to be handled consistently across multiple endpoints.
 * For one-off error cases, it's better to handle the error directly where it's thrown.
 * Make mappers as specific as possible to avoid catching and wrapping errors that should be handled differently.
 */
export const mapSongbirdValidationError = (err: AxiosError): Error => {
  const { message } = err.response?.data ?? {};
  const errText = message ?? err.response?.statusText ?? 'Unknown error';
  switch (getErrorType(err)) {
    case 'SchemaValidation':
      return new MonitorSchemaValidationError(errText);
    case 'MonitorConfigValidation':
      return new MonitorConfigValidationError(errText);
    case 'IllegalArgument':
      return new SongbirdServiceError(errText, DashbirdErrorCode.IllegalArgument);
    case 'ArgumentValue':
      return new SongbirdServiceError(errText, DashbirdErrorCode.ArgumentValue);
    default:
      break;
  }
  if (errText.includes('Query too granular')) {
    const granularity = getGranularityFromErrorMessage(errText);
    return new QueryTooGranular(undefined, granularity);
  }
  return err;
};

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

export const formatGraphQLContext = (ctx: GraphQLContext | undefined): string => {
  return ctx
    ? `auth0 user ${ctx.resolveAuth0UserId()}, org ${ctx.resolveUserOrgID()}, whylabs user ${ctx.resolveWhyLabsUserId()}`
    : 'undefined';
};
