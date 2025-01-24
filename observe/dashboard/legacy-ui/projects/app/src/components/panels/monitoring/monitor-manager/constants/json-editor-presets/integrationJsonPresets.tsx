import { Colors } from '@whylabs/observatory-lib';
import customJsonBrownIcon from 'ui/Icon-Custom_Json_Preset_brown.svg';
import { CustomJsonPresetItem } from '../presetUtils';

export const INTEGRATION_CUSTOM_JSON_PRESETS: CustomJsonPresetItem[] = [
  {
    color: Colors.brown,
    title: () => 'Data availability',
    categoryTitle: () => 'Late upload',
    description: () => <span>Checks if data hasn&apos;t been uploaded</span>,
    icon: customJsonBrownIcon,
    presetId: 'late-upload-analyzer',
  },
  {
    color: Colors.brown,
    title: () => 'Data availability',
    categoryTitle: () => 'Missing profile',
    description: () => <span>Checks if there&apos;s a gap in your data</span>,
    icon: customJsonBrownIcon,
    presetId: 'missing-profile-analyzer',
  },
];
