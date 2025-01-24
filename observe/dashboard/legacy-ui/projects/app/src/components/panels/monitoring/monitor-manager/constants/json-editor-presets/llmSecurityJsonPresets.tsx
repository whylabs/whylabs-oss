import { Colors } from '@whylabs/observatory-lib';
import customJsonOrangeIcon from 'ui/Icon-Custom_Json_Preset_orange.svg';
import { CustomJsonPresetItem } from '../presetUtils';

export const LLM_SECURITY_CUSTOM_JSON_PRESETS: CustomJsonPresetItem[] = [
  {
    color: Colors.orange,
    title: () => 'Data leakage',
    categoryTitle: () => 'Prompt monitor',
    description: () => (
      <span>
        Detects any <strong>data leakage</strong> pattern matches in prompts
      </span>
    ),
    icon: customJsonOrangeIcon,
    presetId: 'llm-prompt-data-leakage-fixed-analyzer',
    rowNumber: 1,
  },
  {
    color: Colors.orange,
    title: () => 'Data leakage',
    categoryTitle: () => 'Response monitor',
    description: () => (
      <span>
        Detects any <strong>data leakage</strong> pattern matches in responses
      </span>
    ),
    icon: customJsonOrangeIcon,
    presetId: 'llm-response-data-leakage-fixed-analyzer',
    rowNumber: 1,
  },
  {
    color: Colors.orange,
    title: () => 'Injection',
    categoryTitle: () => 'Prompt monitor (stddev)',
    description: () => (
      <span>
        Compared to a <strong>trailing window</strong> baseline
      </span>
    ),
    icon: customJsonOrangeIcon,
    presetId: 'llm-prompt-injection-stddev-trailing-window-analyzer',
    rowNumber: 1,
  },
  {
    color: Colors.orange,
    title: () => 'Refusal',
    categoryTitle: () => 'Response monitor (stddev)',
    description: () => (
      <span>
        Compared to a <strong>trailing window</strong> baseline
      </span>
    ),
    icon: customJsonOrangeIcon,
    presetId: 'llm-response-refusal-stddev-trailing-window-analyzer',
    rowNumber: 1,
  },
];
