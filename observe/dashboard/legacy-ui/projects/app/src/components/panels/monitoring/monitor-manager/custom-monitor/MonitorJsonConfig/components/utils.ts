import { ModelInfoForCodeHelpersFragment } from 'generated/graphql';
import { SegmentsSelector } from './code-helpers/segments-selector/SegmentsSelector';
import { NoSegmentsToShow, showNoSegments } from './code-helpers/segments-selector/NoSegmentsToShow';

export type ListOption = 'presets' | 'helpers';
export type SideListSectionProps = { activePreset?: string; applyPreset: (id: string) => void };
export const segmentedControlOptions: { value: ListOption; label: string }[] = [
  { value: 'presets', label: 'Monitor presets' },
  { value: 'helpers', label: 'Code helpers' },
];
export type CodeHelper = {
  name: string;
  id: string;
  component: React.FC;
  emptyState?: React.FC;
  showEmptyState?: (props: ModelInfoForCodeHelpersFragment) => boolean;
};
export const CODE_HELPERS: readonly CodeHelper[] = [
  {
    name: 'Segment targeting',
    id: 'segment-target.helper',
    component: SegmentsSelector,
    emptyState: NoSegmentsToShow,
    showEmptyState: showNoSegments,
  },
] as const;
