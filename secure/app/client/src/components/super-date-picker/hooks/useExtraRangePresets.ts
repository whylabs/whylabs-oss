import { CUSTOM_RANGE, LINEAGE_RANGE } from '~/components/super-date-picker/utils';
import { RangePreset } from '~/hooks/useDynamicTrailingRangePresets';

export const ExtraPresetOptions = [LINEAGE_RANGE, CUSTOM_RANGE] as const;
type ExtraPresets = (typeof ExtraPresetOptions)[number];
type ExtraRangePresetsType = {
  presets: { [name in ExtraPresets]: RangePreset };
};
export const useExtraRangePresets = (resourceId?: string): ExtraRangePresetsType => {
  const dataAvailabilityLoading = !!resourceId;

  const custom: RangePreset = {
    description: 'Custom',
    value: CUSTOM_RANGE,
    type: 'customRange',
    rangeCalculator: () => null,
  };

  const getLineageRange = (): [Date, Date] | null => {
    return null;
  };
  const lineageBottomText = (() => {
    if (dataAvailabilityLoading) return 'Loading...';

    return 'No profiles found';
  })();

  const lineage: RangePreset = {
    description: 'Profile lineage',
    value: LINEAGE_RANGE,
    type: 'extraPreset',
    loading: dataAvailabilityLoading,
    disabled: true,
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
