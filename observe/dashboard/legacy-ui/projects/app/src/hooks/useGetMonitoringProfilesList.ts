import {
  GetModelReferenceProfilesForMonitorConfigQuery,
  useGetModelReferenceProfilesForMonitorConfigQuery,
} from 'generated/graphql';

interface GetMonitoringProfilesList {
  referenceProfiles: GetModelReferenceProfilesForMonitorConfigQuery | undefined;
  error: boolean;
  loading: boolean;
}

export default function useGetMonitoringProfilesList(modelId: string): GetMonitoringProfilesList {
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
