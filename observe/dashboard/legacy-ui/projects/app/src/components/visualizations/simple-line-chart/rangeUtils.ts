import { scaleLinear } from '@visx/scale';
import { ScaleLinear } from 'd3-scale';
import { Y_RANGE_BUFFER_RATIO } from 'ui/constants';

const DEFAULT_MIN_RANGE = 0.025;
export const DEFAULT_Y_MIN = 0;
export const DEFAULT_Y_MAX = 1;

interface YRangeProps {
  fixedYRange?: [number, number];
  graphTop: number;
  graphBottom: number;
  valueRange: [number, number];
  minRange?: number;
  yBufferRatio?: number;
}

function rangeIsValid(range: [number, number], canBeIdentical = false): boolean {
  return canBeIdentical ? range[0] <= range[1] : range[0] < range[1];
}

export function generateYRange({
  fixedYRange,
  graphTop,
  graphBottom,
  valueRange,
  minRange,
  yBufferRatio,
}: YRangeProps): ScaleLinear<number, number> {
  const usedMinRange = Math.max(minRange ?? 0, DEFAULT_MIN_RANGE);
  const usedYBufferRatio = yBufferRatio ?? Y_RANGE_BUFFER_RATIO; // Deliberately allowing 0 here.
  if (fixedYRange && rangeIsValid(fixedYRange, false)) {
    return scaleLinear<number>({
      range: [graphTop, graphBottom],
      round: true,
      domain: fixedYRange,
    }).nice();
  }
  if (!rangeIsValid(valueRange, true)) {
    return scaleLinear<number>({
      range: [graphTop, graphBottom],
      round: true,
      domain: [DEFAULT_Y_MIN, DEFAULT_Y_MAX],
    }).nice();
  }
  const [min, max] = valueRange;

  // If the max is lower than 0, then multiplying by a number less than 1 moves it "up"
  const maxMultiple = max < 0 ? 1 - usedYBufferRatio : 1 + usedYBufferRatio;
  const graphMaxY = max * maxMultiple;
  // Similarly, we want to move the min "down", which requires a number greater than 1 for negative numbers.
  const minMultiple = min < 0 ? 1 + usedYBufferRatio : 1 - usedYBufferRatio;
  const graphMinY = min * minMultiple;
  const totalRange = graphMaxY - graphMinY;
  if (totalRange < usedMinRange) {
    const rangeCenter = (graphMaxY + graphMinY) / 2;
    const halfRange = usedMinRange / 2;
    return scaleLinear<number>({
      range: [graphTop, graphBottom],
      round: true,
      domain: [rangeCenter - halfRange, rangeCenter + halfRange],
    }).nice();
  }

  return scaleLinear<number>({
    range: [graphTop, graphBottom],
    round: true,
    domain: [graphMinY, graphMaxY],
  }).nice();
}
