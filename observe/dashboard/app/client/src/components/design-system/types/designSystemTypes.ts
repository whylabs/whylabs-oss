import React from 'react';

import { WhyLabsTooltipProps } from '../tooltip/WhyLabsTooltip';

export type GenericInputProps = {
  autoFocus?: boolean;
  darkBackground?: boolean;
  disabled?: boolean;
  // If the component is disabled, whether to display a tooltip explaining why it's disabled
  disabledTooltip?: string;
  hideLabel?: boolean;
  id?: string;
  label: string | React.ReactNode;
  labelTooltip?: string;
  // Whether the data for this component is still being loaded. Should be passed for a consistent experience
  loading?: boolean;
  tooltipProps?: Omit<Partial<WhyLabsTooltipProps>, 'children' | 'label'>;
};
