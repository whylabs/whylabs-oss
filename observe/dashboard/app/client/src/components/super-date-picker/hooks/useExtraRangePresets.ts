import { CUSTOM_RANGE, LINEAGE_RANGE, handleLineagePresetString } from '~/components/super-date-picker/utils';
import { RangePreset } from '~/hooks/useDynamicTrailingRangePresets';
import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import { getUTCDateRangeString, rangeTranslatorByTimePeriod } from '~/utils/dateRangeUtils';
import { trpc } from '~/utils/trpc';
import { isNumber } from '~/utils/typeGuards';
import { SegmentTag } from '~server/graphql/generated/graphql';

export const ExtraPresetOptions = [LINEAGE_RANGE, CUSTOM_RANGE] as const;
type ExtraPresets = (typeof ExtraPresetOptions)[number];
type ExtraRangePresetsType = {
  presets: { [name in ExtraPresets]: RangePreset };
};
export const useExtraRangePresets = (
  orgId?: string,
  resourceId?: string,
  segment?: SegmentTag[],
): ExtraRangePresetsType => {
  const { batchFrequency } = useResourceBatchFrequency({ orgId: orgId ?? '', resourceId: resourceId ?? '' });
  const { data: dataLineage, isLoading: dataAvailabilityQueryLoading } = trpc.meta.resources.dataLineage.useQuery(
    {
      id: resourceId ?? '',
      orgId: orgId ?? '',
      segment: segment ?? [],
    },
    { enabled: !!resourceId && !!orgId },
  );

  const dataAvailabilityLoading = !!resourceId && !!orgId && dataAvailabilityQueryLoading && !dataLineage;
  const { oldestProfileTimestamp, latestProfileTimestamp } = dataLineage ?? {};

  const custom: RangePreset = {
    description: 'Custom',
    value: CUSTOM_RANGE,
    type: 'customRange',
    rangeCalculator: () => null,
  };

  const hasLineage = isNumber(oldestProfileTimestamp) && isNumber(latestProfileTimestamp);
  const getLineageRange = (): [Date, Date] | null => {
    if (!batchFrequency || !dataLineage) return null;
    const { endFn } = rangeTranslatorByTimePeriod.get(batchFrequency) ?? {};
    if (hasLineage) {
      const endOfBucket = endFn ? endFn(latestProfileTimestamp) : latestProfileTimestamp;
      return [new Date(oldestProfileTimestamp), new Date(endOfBucket)];
    }
    return null;
  };
  const lineageBottomText = (() => {
    if (dataAvailabilityLoading) return 'Loading...';
    if (hasLineage) {
      return handleLineagePresetString(
        getUTCDateRangeString(oldestProfileTimestamp, latestProfileTimestamp, batchFrequency),
      );
    }
    return 'No profiles found';
  })();

  const lineage: RangePreset = {
    description: 'Profile lineage',
    value: LINEAGE_RANGE,
    type: 'extraPreset',
    loading: dataAvailabilityLoading,
    disabled: !hasLineage,
    disabledTooltip: '',
    rangeCalculator: getLineageRange,
    bottomText: lineageBottomText,
  };

  return {
    presets: {
      lineage,
      custom,
    },
  };
};
