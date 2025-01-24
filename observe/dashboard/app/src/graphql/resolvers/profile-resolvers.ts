import { IResolvers } from '@graphql-tools/utils';

import { notImplemented } from '../../util/misc';
import { FullGraphQLContext } from '../context';
import { FilteredFeatureSketches, Resolvers } from '../generated/graphql';
import { getFilteredSketchesForBatch } from './helpers/batch-metadata';

const resolvers: Resolvers<FullGraphQLContext> = {
  ReferenceProfile: {
    metrics: () => notImplemented('Querying metrics on reference profiles is not supported yet'),
    sketches: async (parent, args, context): Promise<FilteredFeatureSketches> => {
      const { offset, limit, histogramSplitPoints, filter, excludeEmpty } = args;
      return getFilteredSketchesForBatch({
        batchIdentifier: {
          type: 'reference',
          datasetId: parent.datasetId,
          tags: parent.tags ?? [],
          referenceProfileId: parent.id,
        },
        context,
        offset,
        limit,
        histogramSplitPoints,
        filter,
        excludeEmpty,
      });
    },
  },
  IndividualProfile: {
    sketches: async (parent, args, context): Promise<FilteredFeatureSketches> => {
      const { offset, limit, histogramSplitPoints, filter } = args;
      const { datasetId, retrievalToken } = parent;
      return getFilteredSketchesForBatch({
        batchIdentifier: {
          type: 'individual',
          datasetId,
          tags: parent.tags ?? [],
          retrievalToken,
        },
        context,
        offset,
        limit,
        histogramSplitPoints,
        filter,
      });
    },
  },
};

export default resolvers as IResolvers;
