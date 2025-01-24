import { Card, DynamicColor } from 'generated/dashboard-schema';

export function isCardType(ob: unknown): ob is Card {
  const possibleCard = ob as Card;
  if (
    possibleCard.queryId !== undefined &&
    possibleCard.title !== undefined &&
    typeof possibleCard.queryId === 'string'
  ) {
    return true;
  }
  return false;
}

export function asCardType(ob: unknown): Card | null {
  if (isCardType(ob)) {
    return ob as Card;
  }
  return null;
}

export function isDynamicColor(ob: unknown): ob is DynamicColor {
  const possibleDc = ob as DynamicColor;
  return typeof possibleDc.id === 'string' && possibleDc.thresholdInfo !== undefined;
}

export function asDynamicColor(ob: unknown): DynamicColor | null {
  if (isDynamicColor(ob)) {
    return ob as DynamicColor;
  }
  return null;
}
