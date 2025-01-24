import { Colors } from '@whylabs/observatory-lib';
import { AssetCategory, TimePeriod } from 'generated/graphql';
import missingValueIcon from 'ui/Icon-Missing_Values.svg';
import uniqueValueIcon from 'ui/Icon-Unique_Value.svg';
import dataTypeIcon from 'ui/Icon-Data_Type.svg';
import comingsoonIcon from 'ui/comingsoon.svg';
import { MV2_ANALYZERS, MV2_ANALYZERS_30_TRAILING_WINDOW } from '../analyzers';
import { defaultTrailingWindowBaselineSize, MonitorItem } from '../presetUtils';

export const DATA_QUALITY_PRESETS: MonitorItem[] = [
  {
    color: Colors.chartAqua,
    title: () => 'Missing values',
    categoryTitle: (): string => {
      return 'Outlier detection (stddev)';
    },
    description: (_: AssetCategory, batchFrequency?: TimePeriod): JSX.Element => {
      const baseline = batchFrequency && defaultTrailingWindowBaselineSize.get(batchFrequency);
      return (
        <span>
          Compared to a trailing <strong>{baseline?.description || 'window'}</strong> baseline
        </span>
      );
    },
    icon: missingValueIcon,
    analyzer: MV2_ANALYZERS.MISSING_VALUE,
    disable: false,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Unique value',
    categoryTitle: () => 'Duplicate changes',
    description: (_: AssetCategory, batchFrequency?: TimePeriod): JSX.Element => {
      const baseline = batchFrequency && defaultTrailingWindowBaselineSize.get(batchFrequency);
      return (
        <span>
          Compared to a trailing <strong>{baseline?.description || 'window'}</strong> baseline
        </span>
      );
    },
    icon: uniqueValueIcon,
    analyzer: MV2_ANALYZERS.UNIQUE_VALUE,
    disable: false,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Data type',
    categoryTitle: () => 'Detect mixed schema',
    description: (_: AssetCategory, batchFrequency?: TimePeriod): JSX.Element => {
      const baseline = batchFrequency && defaultTrailingWindowBaselineSize.get(batchFrequency);
      return (
        <span>
          Compared to a trailing <strong>{baseline?.description || 'window'}</strong> baseline
        </span>
      );
    },
    icon: dataTypeIcon,
    analyzer: MV2_ANALYZERS.DATA_TYPE,
    disable: false,
    rowNumber: 1,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Percentage Change',
    categoryTitle: () => 'Of missing values',
    description: () => (
      <span>
        Compared to a <strong>static profile</strong> baseline
      </span>
    ),
    icon: comingsoonIcon,
    analyzer: MV2_ANALYZERS_30_TRAILING_WINDOW.MISSING_VALUE, // TODO: Change to right analyzer once it is enabled.
    disable: true,
    hideOnCustomJsonFlag: true,
  },
  {
    color: Colors.chartAqua,
    title: () => 'Unique values',
    categoryTitle: () => 'Cardinality change',
    description: () => (
      <span>
        Compared to a <strong>static profile</strong> baseline
      </span>
    ),
    icon: comingsoonIcon,
    analyzer: MV2_ANALYZERS_30_TRAILING_WINDOW.UNIQUE_VALUE, // TODO: Change to right analyzer once it is enabled.
    disable: true,
    hideOnCustomJsonFlag: true,
  },
];
