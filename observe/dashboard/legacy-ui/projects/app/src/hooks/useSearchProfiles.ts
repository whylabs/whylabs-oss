import { useLocation, useNavigate } from 'react-router-dom';
import { getProfilesFromSearchQuery, NumberOrString } from 'utils/queryUtils';
import { removeKeys } from 'utils/queryCleaner';
import { useCallback, useMemo } from 'react';
import { INDIVIDUAL_SEPARATOR, PROFILE_TAG } from 'types/navTags';
import { handleSetParams } from './usePageLinkHandler';

export interface SearchProfiles {
  readonly profiles: NumberOrString[];
  readonly rawProfiles: NumberOrString[];
  readonly individualProfiles: string[];
  setProfiles(timestamps: NumberOrString[]): void;
}

const translateProfileParam = (profileParam: NumberOrString) => {
  const isNumber = Number(profileParam);
  if (isNumber) return isNumber;
  const batchOrRefId = profileParam.toString().split(INDIVIDUAL_SEPARATOR)[0];
  const isBatch = Number(batchOrRefId);
  if (isBatch) return isBatch;
  return batchOrRefId;
};

export function useSearchProfiles(): SearchProfiles {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [profiles, individualProfiles, rawProfiles] = useMemo(() => {
    const raw = getProfilesFromSearchQuery(search) ?? [];
    const translatedProfiles: NumberOrString[] = [];
    const retrievalTokens: string[] = [];

    raw.forEach((p) => {
      translatedProfiles.push(translateProfileParam(p));

      retrievalTokens.push(p.toString().split(INDIVIDUAL_SEPARATOR)[1]);
    });

    return [translatedProfiles, retrievalTokens, raw];
  }, [search]);

  const getUpdatedSearchString = useCallback((otherParams: string, profileIds: NumberOrString[]) => {
    return handleSetParams(
      [{ name: PROFILE_TAG, value: profileIds.map((profile) => profile.toString()) }],
      otherParams,
    );
  }, []);

  const setProfiles = useCallback(
    (profileIds: NumberOrString[]) => {
      let newSearchString = removeKeys([PROFILE_TAG], search);
      if (profileIds.length) {
        newSearchString = getUpdatedSearchString(newSearchString, profileIds);
      }

      navigate({ search: newSearchString }, { replace: true });
    },
    [getUpdatedSearchString, navigate, search],
  );

  return { rawProfiles, profiles, setProfiles, individualProfiles };
}
