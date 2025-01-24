import { BatchProfileFragment, ReferenceProfileFragment } from 'generated/graphql';

export type ProfilesList = {
  batches: BatchProfileFragment[];
  referenceProfiles?: ReferenceProfileFragment[] | null;
} | null;

/**
 * 33 - Collapsed Accordion
 * 1 -  Divider height
 * 12 - Divider margin
 */
const ONE_COLLAPSED_ACCORDION_HEIGHT = 33 + 1 + 12;
const ACCORDION_SUBTITLE_HEIGHT = 18;
export const getMaxAccordionContentHeight = (rootHeight: number, numberOfSections: number): number =>
  rootHeight - ONE_COLLAPSED_ACCORDION_HEIGHT * numberOfSections - ACCORDION_SUBTITLE_HEIGHT;
