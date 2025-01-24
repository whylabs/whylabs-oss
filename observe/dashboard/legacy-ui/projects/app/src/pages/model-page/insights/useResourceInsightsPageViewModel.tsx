import { useMemo } from 'react';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { InsightType } from 'components/controls/table/profiles-table/insights';
import { useSearchParams } from 'react-router-dom';
import { INSIGHTS_SELECTED_PROFILE, INSIGHTS_FILTER_BY_TAG } from 'types/navTags';
import { SortedInsight, useSortedInsights } from './useInsights';
import { InsightCardProfile } from './components/InsightProfileCards';
import { InsightTag } from './components/ListInsightTypeBadges';

type InsightTagWithList = InsightTag & {
  list: SortedInsight[];
};

type InsightProfile = Omit<InsightCardProfile, 'tags'> & {
  tags: InsightTagWithList[];
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useResourceInsightsPageViewModel = () => {
  const { modelId, profiles: profileIds, segment } = usePageTypeWithParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedProfiles = searchParams.getAll(INSIGHTS_SELECTED_PROFILE);
  const filterByTagsKeys = searchParams.getAll(INSIGHTS_FILTER_BY_TAG);

  const keyIsInsightType = (key: string): key is InsightType => Object.values(InsightType).includes(key as InsightType);

  const filterByTags: InsightTag[] = filterByTagsKeys
    .filter((k): k is InsightType => keyIsInsightType(k))
    .map((type) => ({
      type,
      count: 1,
    }));

  const { loading, error, allInsights, profileData } = useSortedInsights(profileIds, modelId, segment.tags);

  const profilesForCards = useMemo(() => {
    const listForCards: InsightProfile[] = [];

    profileData.forEach(({ alias, id }, index) => {
      listForCards.push({
        alias,
        id,
        index,
        isSelected: selectedProfiles.includes(id),
        insightsCount: 0,
        tags: [],
      });
    });

    allInsights?.forEach((i) => {
      const profile = listForCards.find((p) => p.alias === i.alias);
      if (profile) {
        profile.insightsCount += 1;

        const { type } = i.insight;
        const tag = profile.tags.find((t) => t.type === type);
        if (tag) {
          tag.count += 1;
          tag.list.push(i);
        } else {
          profile.tags.push({ count: 1, type, list: [i] });
          profile.tags.sort((a, b) => a.type.localeCompare(b.type));
        }
      }
    });

    return listForCards;
  }, [allInsights, profileData, selectedProfiles]);

  const onSelectTag = (tag: InsightType) => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.delete(INSIGHTS_FILTER_BY_TAG);
      let newList = [...filterByTagsKeys, tag];

      if (filterByTagsKeys.find((id) => id === tag)) {
        newList = filterByTagsKeys.filter((id) => id !== tag);
      }

      newList.forEach((id) => {
        nextSearchParams.append(INSIGHTS_FILTER_BY_TAG, id);
      });

      return nextSearchParams;
    });
  };

  const onSelectProfile = (profileId: string) => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.delete(INSIGHTS_SELECTED_PROFILE);
      let newList = [...selectedProfiles, profileId];

      if (selectedProfiles.find((id) => id === profileId)) {
        newList = selectedProfiles.filter((id) => id !== profileId);
      }

      newList.forEach((id) => {
        nextSearchParams.append(INSIGHTS_SELECTED_PROFILE, id);
      });

      return nextSearchParams;
    });
  };

  const hasFilteredProfiles = !!selectedProfiles.length;
  const filteredProfiles = hasFilteredProfiles
    ? profilesForCards.filter((p) => selectedProfiles.includes(p.id))
    : profilesForCards;

  return {
    error,
    filterByTags,
    filteredProfiles,
    loading,
    onSelectProfile,
    onSelectTag,
    profilesForCards,
    selectedProfiles,
  };
};
