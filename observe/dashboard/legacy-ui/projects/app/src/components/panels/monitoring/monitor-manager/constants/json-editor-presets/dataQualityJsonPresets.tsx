import { Colors } from '@whylabs/observatory-lib';
import missingValueIcon from 'ui/Icon-Missing_Values.svg';
import uniqueValueIcon from 'ui/Icon-Unique_Value.svg';
import customJsonBlueIcon from 'ui/Icon-Custom_Json_Preset.svg';
import { CustomJsonPresetItem } from '../presetUtils';

export const DQ_CUSTOM_JSON_PRESETS: CustomJsonPresetItem[] = [
  {
    color: Colors.chartAqua,
    title: () => 'Missing values',
    categoryTitle: () => 'Percentage change',
    description: () => (
      <span>
        Compared to a <strong>trailing window</strong> baseline
      </span>
    ),
    icon: missingValueIcon,
    presetId: 'count-null-ratio-pct-trailing-window-analyzer',
    rowNumber: 2,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Missing values',
    categoryTitle: () => 'Percentage change',
    description: () => (
      <span>
        Compared to a <strong>static profile</strong> baseline
      </span>
    ),
    icon: missingValueIcon,
    presetId: 'count-null-ratio-pct-static-profile-analyzer',
    hideOnCustomJsonFlag: true,
    rowNumber: 2,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Missing values',
    categoryTitle: () => 'Outlier detection (stddev)',
    description: () => (
      <span>
        Compared to a <strong>fixed time range</strong> baseline
      </span>
    ),
    icon: missingValueIcon,
    presetId: 'count-null-ratio-stddev-fixed-time-range-analyzer',
    rowNumber: 2,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Unique values',
    categoryTitle: () => 'Percentage change',
    description: () => (
      <span>
        Compared to a <strong>trailing window</strong> baseline
      </span>
    ),
    icon: uniqueValueIcon,
    presetId: 'unique-est-pct-trailing-window-analyzer',
    rowNumber: 3,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Unique values',
    categoryTitle: () => 'Percentage change',
    description: () => (
      <span>
        Compared to a <strong>static profile</strong> baseline
      </span>
    ),
    icon: uniqueValueIcon,
    presetId: 'unique-est-pct-static-profile-analyzer',
    hideOnCustomJsonFlag: true,
    rowNumber: 3,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Unique values',
    categoryTitle: () => 'Outlier detection (stddev)',
    description: () => (
      <span>
        Compared to a <strong>fixed time range</strong> baseline
      </span>
    ),
    icon: uniqueValueIcon,
    presetId: 'unique-est-stddev-fixed-time-range-analyzer',
    rowNumber: 3,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Minimum value',
    categoryTitle: () => 'Positive numbers',
    description: () => <span>Checks for non-discrete positive numbers only</span>,
    icon: customJsonBlueIcon,
    presetId: 'statistics-positive-non-discrete-fixed-analyzer',
    rowNumber: 4,
  },
];
