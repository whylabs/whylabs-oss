import {
  GetModelReferenceProfilesForMonitorConfigQuery,
  useGetModelReferenceProfilesForMonitorConfigQuery,
} from 'generated/graphql';

interface GetReferenceProfilesList {
  referenceProfiles: GetModelReferenceProfilesForMonitorConfigQuery | undefined;
  error: boolean;
  loading: boolean;
}

export default function useGetReferenceProfilesList(modelId: string): GetReferenceProfilesList {
  const {
    data: referenceProfiles,
    error: referenceProfilesError,
    loading: referenceProfilesLoading,
  } = useGetModelReferenceProfilesForMonitorConfigQuery({
    variables: {
      modelId,
    },
  });

  return {
    referenceProfiles,
    error: !!referenceProfilesError,
    loading: !!referenceProfilesLoading,
  };
}
