import { GenericFlexColumnSelectItemData, SelectorRowText } from '~/components/design-system';
import { getUTCDateRangeString } from '~/utils/dateRangeUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { trpc } from '~/utils/trpc';
import { ModelType } from '~server/graphql/generated/graphql';
import { mapStringToGranularity, mapStringToTimePeriod } from '~server/util/time-period-utils';
import { useMemo } from 'react';

import { useOrgId } from '../useOrgId';

type UseResourceSelectorDataProps = {
  displayLabelAs: 'name' | 'id' | 'nameAndId';
  filterByType?: ModelType;
  disabledResourceIds?: string[];
};

export const useResourcesSelectorData = ({
  displayLabelAs,
  filterByType,
  disabledResourceIds,
}: UseResourceSelectorDataProps) => {
  const orgId = useOrgId();

  const { data: resources, isLoading } = trpc.meta.resources.list.useQuery({
    filterByType,
    orgId,
    orderByTimePeriod: true,
    withAvailability: true,
  });
  const resourcesList: GenericFlexColumnSelectItemData[] = useMemo(() => {
    if (!resources) return [];

    return resources.map(({ dataAvailability, id, name, timePeriod }) => {
      const readableBatchFrequency = mapStringToGranularity.get(timePeriod)?.toString() ?? 'Other';
      const batchFrequency = mapStringToTimePeriod.get(timePeriod);
      const { latestTimestamp, oldestTimestamp } = dataAvailability ?? {};
      const noProfilesFound = !latestTimestamp || !oldestTimestamp;
      const lineage = (() => {
        if (noProfilesFound) return 'No profiles found';
        return getUTCDateRangeString(oldestTimestamp, latestTimestamp, batchFrequency);
      })();

      const label = (() => {
        if (displayLabelAs === 'name') return name;
        if (displayLabelAs === 'id') return id;
        return `${name} (${id})`;
      })();

      const item: GenericFlexColumnSelectItemData = {
        label,
        value: id,
        group: `${readableBatchFrequency} BATCH FREQUENCY`.toUpperCase(),
        disabled: disabledResourceIds?.includes(id),
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
            tooltip: noProfilesFound ? '' : lineage,
          },
        ],
        usedOnFilter: [id, name, readableBatchFrequency, lineage],
      };
      return item;
    });
  }, [disabledResourceIds, displayLabelAs, resources]);

  return {
    isLoading,
    resourcesList,
    data: resources,
  };
};
