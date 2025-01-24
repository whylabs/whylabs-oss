import { BatchMetadata } from 'generated/graphql';

type ConfusionData = BatchMetadata['metrics']['confusion'];
const CARD_PADDING = 256;
const CARD_MIN_WIDTH = 663; // comes from the current size of the square tab cards
export function getConfusionWidth(confusion: ConfusionData): number {
  if (!confusion) {
    return 0;
  }
  const computedWidth = CARD_PADDING + confusion.labels.length * 36;
  return Math.max(computedWidth, CARD_MIN_WIDTH);
}
