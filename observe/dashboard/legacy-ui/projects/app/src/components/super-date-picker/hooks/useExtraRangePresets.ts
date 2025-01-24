import { RangePreset } from 'hooks/useDynamicTrailingRangePresets';
import { isNumber } from 'utils/typeGuards';
import { CUSTOM_RANGE, handleLineagePresetString, LINEAGE_RANGE } from 'components/super-date-picker/utils';
import { getUTCDateRangeString, getFunctionsForTimePeriod } from 'utils/batchProfileUtils';
import { SegmentTag, useGetSegmentProfileLineageQuery } from 'generated/graphql';
import { useCallback, useMemo } from 'react';
import { getUsableRangeAndTooltip } from '../../profiles-range-link/rangeLimitHelper';

export const ExtraPresetOptions = [LINEAGE_RANGE, CUSTOM_RANGE] as const;

type ExtraPresets = typeof ExtraPresetOptions[number];
type ExtraRangePresetsType = {
  presets: { [name in ExtraPresets]: RangePreset };
};
export const useExtraRangePresets = (resourceId?: string, segment: SegmentTag[] = []): ExtraRangePresetsType => {
  const { data, loading: dataAvailabilityQueryLoading } = useGetSegmentProfileLineageQuery({
    variables: { modelId: resourceId ?? '', tags: segment },
    skip: !resourceId,
  });
  const { dataLineage } = data?.model?.segment ?? {};
  const { batchFrequency } = data?.model ?? {};

  const dataAvailabilityLoading = !!resourceId && dataAvailabilityQueryLoading && !dataLineage;
  const { oldestProfileTimestamp, latestProfileTimestamp } = dataLineage ?? {};

  const custom: RangePreset = {
    description: 'Custom',
    value: CUSTOM_RANGE,
    type: 'customRange',
    rangeCalculator: () => null,
  };

  const hasLineage = isNumber(oldestProfileTimestamp) && isNumber(latestProfileTimestamp);

  const getLineageRange = useCallback((): [Date, Date] | null => {
    if (!batchFrequency || !dataLineage) return null;
    const { setEndOfProfile } = getFunctionsForTimePeriod.get(batchFrequency) ?? {};
    if (isNumber(oldestProfileTimestamp) && isNumber(latestProfileTimestamp)) {
      const endOfBucket = setEndOfProfile ? setEndOfProfile(latestProfileTimestamp) : latestProfileTimestamp;
      return [new Date(oldestProfileTimestamp), new Date(endOfBucket)];
    }
    return null;
  }, [batchFrequency, dataLineage, latestProfileTimestamp, oldestProfileTimestamp]);

  const truncatedLineage = useMemo(() => {
    const lineage = getLineageRange();
    const lineageInTimestamp = (lineage ? [lineage[0].getTime(), lineage[1].getTime()] : null) as
      | [number, number]
      | null;
    const { tooltip, range } = getUsableRangeAndTooltip(batchFrequency, lineageInTimestamp, null, true, true);
    const rangeCalculator = (): [Date, Date] | null => {
      if (!range) return null;
      const [from, to] = range;
      return [new Date(from), new Date(to)];
    };
    return {
      tooltip,
      rangeCalculator,
    };
  }, [batchFrequency, getLineageRange]);

  const lineageBottomText = (() => {
    if (dataAvailabilityLoading) return 'Loading...';
    if (isNumber(oldestProfileTimestamp) && isNumber(latestProfileTimestamp)) {
      return handleLineagePresetString(
        getUTCDateRangeString(oldestProfileTimestamp, latestProfileTimestamp, batchFrequency),
      ).concat(`\n ${truncatedLineage.tooltip}`);
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
    rangeCalculator: truncatedLineage.rangeCalculator,
    bottomText: lineageBottomText,
  };

  return {
    presets: {
      lineage,
      custom,
    },
  };
};
