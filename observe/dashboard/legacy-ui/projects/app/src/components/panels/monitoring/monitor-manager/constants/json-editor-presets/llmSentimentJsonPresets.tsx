import { Colors } from '@whylabs/observatory-lib';
import customJsonPurpleIcon from 'ui/Icon-Custom_Json_Preset_purple.svg';
import { CustomJsonPresetItem } from '../presetUtils';

export const LLM_SENTIMENT_CUSTOM_JSON_PRESETS: CustomJsonPresetItem[] = [
  {
    color: Colors.purple,
    title: () => 'Negativity',
    categoryTitle: () => 'Prompt monitor (stddev)',
    description: () => (
      <span>
        Compared to a <strong>trailing window</strong> baseline
      </span>
    ),
    icon: customJsonPurpleIcon,
    presetId: 'llm-prompt-negativity-stddev-trailing-window-analyzer',
    rowNumber: 1,
  },
  {
    color: Colors.purple,
    title: () => 'Negativity',
    categoryTitle: () => 'Response monitor (stddev)',
    description: () => (
      <span>
        Compared to a <strong>trailing window</strong> baseline
      </span>
    ),
    icon: customJsonPurpleIcon,
    presetId: 'llm-response-negativity-stddev-trailing-window-analyzer',
    rowNumber: 1,
  },
  {
    color: Colors.purple,
    title: () => 'Toxicity',
    categoryTitle: () => 'Response monitor (stddev)',
    description: () => (
      <span>
        Compared to a <strong>trailing window</strong> baseline
      </span>
    ),
    icon: customJsonPurpleIcon,
    presetId: 'llm-response-toxicity-stddev-trailing-window-analyzer',
    rowNumber: 1,
  },
];
