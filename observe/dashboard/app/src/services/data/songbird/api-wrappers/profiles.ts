import { ReferenceProfileItemResponse } from '@whylabs/songbird-node-client';

import { CallOptions, addToContext, axiosCallConfig } from '../../../../util/async-helpers';
import { songbirdClient } from '../songbird-client-factory';
import { logger, tryGetMetadata } from './utils';

export const listReferenceProfiles = async (
  orgId: string,
  datasetId: string,
  fromUploadTimestamp?: number, // these are upload timestamp filters, you probably dont want to use them
  toUploadTimestamp?: number,
  options?: CallOptions,
): Promise<ReferenceProfileItemResponse[]> => {
  logger.info('Fetching reference profiles for org %s, dataset %s', orgId, datasetId);
  try {
    const client = options?.context?.songbirdClient ?? songbirdClient;
    options = addToContext({ datasetId }, options);
    // should be able to pass undefined timestamps on songbird call but a bug currently means this gives long overflow
    const profiles = await tryGetMetadata(
      () =>
        client.profiles.listReferenceProfiles(
          orgId,
          datasetId,
          fromUploadTimestamp ?? 0,
          toUploadTimestamp ?? Date.now(),
          axiosCallConfig(options),
        ),
      true,
      options?.context,
    );
    return profiles ?? [];
  } catch (err) {
    // err has already been logged in tryGetMetadata
    // for now, swallow the error so overall graphql doesnt fail - we should instead make this nullable and
    // have ui accept partial data with errors
    return [];
  }
};
