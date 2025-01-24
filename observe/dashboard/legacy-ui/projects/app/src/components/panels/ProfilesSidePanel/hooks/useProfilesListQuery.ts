import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { useGetSegmentProfilesQuery } from 'generated/graphql';
import { useContext, useMemo, useState } from 'react';
import { ProfilePageState, ProfilesPageContext } from 'pages/model-page/context/ProfilesPageContext';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { ProfilesList } from '../utils';

interface ProfilesListQueryHookProps {
  segment: ParsedSegment;
  dateRange: SimpleDateRange;
  modelId: string;
  skip: boolean;
}

export interface ProfilesListQueryHookReturnType {
  data?: ProfilesList;
  loading: boolean;
}
export const useProfilesListQuery = ({
  modelId,
  segment,
  dateRange,
  skip,
}: ProfilesListQueryHookProps): ProfilesListQueryHookReturnType => {
  const [contextState, dispatchSidePanel] = useContext(ProfilesPageContext);
  const { data: profilesList, loading: profilesListLoading } = useGetSegmentProfilesQuery({
    variables: {
      modelId,
      tags: segment.tags,
      ...dateRange,
    },
    skip,
  });
  const [prevData, setPrevData] = useState<ProfilesList>();
  const usedProfilesData: ProfilesList = useMemo(() => {
    const modelData = profilesList?.model;
    return {
      batches: modelData?.segment?.batches ?? [],
      referenceProfiles: modelData?.segment?.referenceProfiles ?? [],
    };
  }, [profilesList?.model]);

  const updateLoadingState = contextState.loadingProfilesInRange !== profilesListLoading;
  const updateProfilesList = usedProfilesData && prevData !== usedProfilesData;
  if (updateLoadingState || updateProfilesList) {
    let updatedObject: Partial<ProfilePageState> = { loadingProfilesInRange: profilesListLoading };
    if (updateProfilesList) {
      updatedObject = {
        ...updatedObject,
        staticProfiles: usedProfilesData?.referenceProfiles,
        profileQueryData: usedProfilesData?.batches,
      };
      setPrevData(usedProfilesData);
    }
    dispatchSidePanel(updatedObject);
  }

  return {
    data: usedProfilesData,
    loading: profilesListLoading,
  };
};
