import {
  ListOrgResourcesCommonDataWithLineageQuery,
  ModelType,
  TimePeriod,
  useListOrgResourcesCommonDataWithLineageQuery,
} from 'generated/graphql';

import { SelectorRowText, GenericFlexColumnSelectItemData } from 'components/design-system';
import { useMemo } from 'react';
import { mapTimePeriodToGranularityString } from 'utils/timePeriodUtils';
import { getUTCDateRangeString, getFunctionsForTimePeriod } from 'utils/batchProfileUtils';
import { isNumber } from 'utils/typeGuards';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { atom, useRecoilState } from 'recoil';
import { ONE_HOUR_IN_MILLIS } from 'ui/constants';

interface CacheType {
  timestamp?: number;
  data?: ListOrgResourcesCommonDataWithLineageQuery;
}

export const allResourcesBasicInfoAtom = atom<CacheType>({
  key: 'allResourcesBasicInfoAtom',
  default: {},
});

type UseResourceSelectorDataProps = {
  displayLabelAs: 'name' | 'id' | 'nameAndId';
  filterByType?: ModelType;
  disabledResourceIds?: string[];
  disableWithNoMetricData?: boolean;
};

type UseResourcesSelectorDataReturnType = {
  isLoading: boolean;
  resourcesList: GenericFlexColumnSelectItemData[];
};

export const generateGroupName = (batchFrequency: TimePeriod): string => {
  const readableBatchFrequency = mapTimePeriodToGranularityString.get(batchFrequency) ?? 'Other';
  return `${readableBatchFrequency} BATCH FREQUENCY`.toUpperCase();
};
/*
 *  A hook to generate the data to be used in WhyLabsSelect with GenericFlexColumnItem ItemComponent
 */
export const useResourcesSelectorData = ({
  displayLabelAs,
  filterByType,
  disabledResourceIds,
  disableWithNoMetricData,
}: UseResourceSelectorDataProps): UseResourcesSelectorDataReturnType => {
  const [cached, setCache] = useRecoilState(allResourcesBasicInfoAtom);
  const skip =
    !!cached.data && cached.timestamp !== undefined && new Date().getTime() - cached.timestamp < ONE_HOUR_IN_MILLIS;

  const { data, loading } = useListOrgResourcesCommonDataWithLineageQuery({ skip });

  if (!skip && data !== cached.data) {
    setCache({ timestamp: new Date().getTime(), data });
  }

  const resourcesList: GenericFlexColumnSelectItemData[] = useMemo(() => {
    if (!cached?.data?.models?.length) return [];
    const sortedResources = [...cached.data?.models].sort((a, b) => a.name.localeCompare(b.name));

    // this map will help to keep the correct group ordering in the select combobox
    const resourcesGranularityMap = new Map<TimePeriod, GenericFlexColumnSelectItemData[]>([
      [TimePeriod.Pt1H, []],
      [TimePeriod.P1D, []],
      [TimePeriod.P1W, []],
      [TimePeriod.P1M, []],
    ]);

    sortedResources.forEach(({ dataLineage, id, name, batchFrequency, modelType, datasetMetrics }) => {
      if (filterByType && filterByType !== modelType) return;
      const readableBatchFrequency = mapTimePeriodToGranularityString.get(batchFrequency) ?? 'Other';
      const { oldestProfileTimestamp, latestProfileTimestamp } = dataLineage ?? {};
      const { setEndOfProfile } = getFunctionsForTimePeriod.get(batchFrequency) ?? {};
      const endOfLatestProfile =
        isNumber(latestProfileTimestamp) && setEndOfProfile
          ? setEndOfProfile(latestProfileTimestamp).getTime()
          : latestProfileTimestamp;
      const lineage = (() => {
        if (!isNumber(endOfLatestProfile) || !isNumber(oldestProfileTimestamp)) return 'No profiles found';
        return getUTCDateRangeString(oldestProfileTimestamp, endOfLatestProfile, batchFrequency);
      })();

      const label = (() => {
        if (displayLabelAs === 'name') return name;
        if (displayLabelAs === 'id') return id;
        return `${name} (${id})`;
      })();

      const item: GenericFlexColumnSelectItemData = {
        label,
        value: id,
        group: generateGroupName(batchFrequency),
        disabled: disabledResourceIds?.includes(id) || (disableWithNoMetricData && !datasetMetrics?.length),
        disabledTooltip: 'Disabled resource',
        rows: [
          {
            textElementConstructor: (children) => <SelectorRowText type="label">{children}</SelectorRowText>,
            children: `${name} (${id})`,
            tooltip: `${name} (${id})`,
          },
          {
            textElementConstructor: (children) => (
              <SelectorRowText type="secondary">Batch frequency: {children}</SelectorRowText>
            ),
            children: upperCaseFirstLetterOnly(readableBatchFrequency),
          },
          {
            textElementConstructor: (children) => (
              <SelectorRowText type="secondary">Profile lineage: {children}</SelectorRowText>
            ),
            children: lineage,
            tooltip: lineage,
          },
        ],
        usedOnFilter: [id, name, readableBatchFrequency, lineage],
      };
      const currentGroupItems = resourcesGranularityMap.get(batchFrequency) ?? [];
      resourcesGranularityMap.set(batchFrequency, currentGroupItems.concat([item]));
    });
    return [...resourcesGranularityMap.values()].flatMap((groupItems) => groupItems);
  }, [cached.data?.models, filterByType, disabledResourceIds, disableWithNoMetricData, displayLabelAs]);

  return {
    isLoading: loading,
    resourcesList,
  };
};
