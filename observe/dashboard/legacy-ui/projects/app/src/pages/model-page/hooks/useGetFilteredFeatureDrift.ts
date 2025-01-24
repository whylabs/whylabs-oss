import { useEffect } from 'react';
import {
  GetMultiFeatureDriftAnalysisQuery,
  SegmentTag,
  useGetMultiFeatureDriftAnalysisLazyQuery,
} from 'generated/graphql';
import { ApolloError } from '@apollo/client';

interface GetFilteredFeatureDriftResult {
  data: GetMultiFeatureDriftAnalysisQuery | undefined;
  loading: boolean;
  error: ApolloError | undefined;
}

export default function useGetFilteredFeatureDrift(args: {
  datasetId: string;
  from: number;
  to: number;
  features: { name: string }[] | undefined;
  tags?: SegmentTag[];
  skip: boolean;
}): GetFilteredFeatureDriftResult {
  const { datasetId, from, to, features, tags, skip } = args;

  const [getDrift, { data, loading, error }] = useGetMultiFeatureDriftAnalysisLazyQuery();

  useEffect(() => {
    if (skip) return;
    const featureIds = features?.map((f) => f.name) ?? [];
    const variables = {
      datasetId,
      from,
      to,
      featureIds,
      tags: tags ?? [],
    };
    if (featureIds.length > 0) {
      getDrift({ variables });
    }
  }, [getDrift, features, datasetId, from, to, tags, skip]);

  return { data, loading, error } as const;
}
