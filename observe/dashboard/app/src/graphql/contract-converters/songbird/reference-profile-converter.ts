import { SegmentTag } from '@whylabs/data-service-node-client';
import { ReferenceProfileItemResponse } from '@whylabs/songbird-node-client';

import { fnThrow } from '../../../util/misc';
import { ReferenceProfile } from '../../generated/graphql';

export const contractRefProfileToGQL = (
  referenceProfile: ReferenceProfileItemResponse,
  tags: SegmentTag[],
): ReferenceProfile => {
  const { id, alias, datasetTimestamp, uploadTimestamp, modelId } = referenceProfile;
  return {
    id: id ?? fnThrow('Missing reference profile id'),
    datasetId: modelId ?? fnThrow('Missing model id'),
    tags,
    alias: alias ?? fnThrow('Missing alias on reference profile'),
    datasetTimestamp,
    uploadTimestamp,
  };
};
