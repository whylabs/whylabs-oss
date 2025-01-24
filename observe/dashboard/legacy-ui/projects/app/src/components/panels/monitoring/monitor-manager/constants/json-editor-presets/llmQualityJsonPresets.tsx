import { Colors } from '@whylabs/observatory-lib';
import customJsonBlueIcon from 'ui/Icon-Custom_Json_Preset.svg';
import { CustomJsonPresetItem } from '../presetUtils';

export const LLM_QUALITY_CUSTOM_JSON_PRESETS: CustomJsonPresetItem[] = [
  {
    color: Colors.chartAqua,
    title: () => 'Low relevance',
    categoryTitle: () => 'Response monitor (stddev)',
    description: () => (
      <span>
        Detect <strong>low relevance</strong> in responses
      </span>
    ),
    icon: customJsonBlueIcon,
    presetId: 'llm-response-low-relevance-trailing-window-analyzer',
    rowNumber: 1,
  },
];
