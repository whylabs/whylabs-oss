import { SELECTED_REFERENCE_PROFILE_QUERY_NAME } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { useMemo } from 'react';

import { useSearchAndHashParams } from '../useSearchAndHashParams';

type UseReferenceProfileProps = {
  orgId: string;
  resourceId: string;
};

export const useReferenceProfile = ({ orgId, resourceId }: UseReferenceProfileProps) => {
  const [searchParams, setSearchParams] = useSearchAndHashParams();

  const isQueryEnabled = !!resourceId;
  const referenceProfilesQuery = trpc.meta.resources.listReferenceProfiles.useQuery(
    {
      orgId,
      resourceId,
    },
    { enabled: isQueryEnabled },
  );
  const data = useMemo(
    () =>
      referenceProfilesQuery.data?.map((rp) => ({
        value: rp.id,
        label: rp.alias,
      })) ?? [],
    [referenceProfilesQuery.data],
  );

  const selected = searchParams.get(SELECTED_REFERENCE_PROFILE_QUERY_NAME) ?? null;

  function onChange(newValue: string | null) {
    setSearchParams((nextSearchParams) => {
      if (newValue) {
        nextSearchParams.set(SELECTED_REFERENCE_PROFILE_QUERY_NAME, newValue);
      } else {
        nextSearchParams.delete(SELECTED_REFERENCE_PROFILE_QUERY_NAME);
      }
      return nextSearchParams;
    });
  }

  return {
    data,
    isLoading: isQueryEnabled && referenceProfilesQuery.isLoading,
    onChange,
    selected,
  };
};
