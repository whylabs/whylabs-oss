interface GraphDisplayOptions {
  secondaryGraphOpen: boolean;
}
export function getGraphWidthSizes(
  totalWidth: number,
  totalPadding: number,
  options?: GraphDisplayOptions,
): [number, number] {
  const fullSize = Math.max(totalWidth - totalPadding, 0);
  if (!options) {
    return [fullSize, 0];
  }
  const { secondaryGraphOpen } = options;
  if (secondaryGraphOpen) {
    const largeGraphSize = Math.round((2 * fullSize) / 3);
    return [largeGraphSize, fullSize - largeGraphSize];
  }
  return [fullSize, 0];
}
