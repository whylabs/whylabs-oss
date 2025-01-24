import { Center } from '@mantine/core';

import { WhyLabsText } from '../design-system';
import { KnownIcons, generateIcon } from './IconFactory';

export interface SegmentedLabelProps {
  label: string;
  color?: string;
  iconName?: KnownIcons; // To add a new icon, add it to the KnownIcons type in IconFactory.tsx
  size?: number;
  textSize?: number;
}

export function generateSegmentedLabel({
  label,
  color,
  iconName,
  size = 12,
  textSize = 12,
}: SegmentedLabelProps): JSX.Element {
  const icon = iconName ? generateIcon({ name: iconName, size, color }) : null;
  return (
    <Center>
      {icon}
      <div style={{ marginLeft: icon ? 5 : 0 }}>
        <WhyLabsText size={textSize}>{label}</WhyLabsText>
      </div>
    </Center>
  );
}
