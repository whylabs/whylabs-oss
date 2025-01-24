import { WhyLabsTooltipProps } from '../tooltip/WhyLabsTooltip';

export type GenericInputProps = {
  autoFocus?: boolean;
  // Whether the data for this component is still being loaded. Should be passed for a consistent experience
  loading?: boolean;
  disabled?: boolean;
  // If the component is disabled, whether to display a tooltip explaining why it's disabled
  disabledTooltip?: string;
  tooltipProps?: Omit<Partial<WhyLabsTooltipProps>, 'children' | 'label'>;
  id?: string;
  label: string | React.ReactNode;
  labelTooltip?: string;
  hideLabel?: boolean;
  darkBackground?: boolean;
};
