import { DatedData } from 'types/graphTypes';
import { scaleLinear, scaleTime } from '@visx/scale';
import { ScaleLinear, ScaleTime } from 'd3-scale';
import { ONE_MONTH_IN_MILLIS } from 'ui/constants';
import { getMinAndMaxValueFromArray } from 'utils/numberUtils';
import { isExactlyNullOrUndefined } from 'utils';
import { TimePeriod } from 'generated/graphql';
import { getBatchStep } from 'utils/timeUtils';
import { generateMonthlyDates } from './dataUtils';

export function generateDatedXScale(
  data: (DatedData | null)[],
  rangeMax: number,
  rangeMin = 0,
  paddingInMillis = 0,
  bounds: [number | null, number | null] = [null, null],
): ScaleTime<number, number> {
  const dataDomain = [
    Math.min(...data.filter((d) => !!d).map((d) => d!.dateInMillis)) - paddingInMillis,
    Math.max(...data.filter((d) => !!d).map((d) => d!.dateInMillis)) + paddingInMillis,
  ];
  /* eslint-disable prefer-destructuring */
  if (bounds[0] !== null && bounds[1] !== null) {
    if (bounds[0] < dataDomain[0]) {
      dataDomain[0] = bounds[0];
    }
    if (bounds[1] > dataDomain[1]) {
      dataDomain[1] = bounds[1];
    }
  }
  return scaleTime<number>({
    range: [rangeMin, rangeMax],
    domain: dataDomain,
  });
}

export function generateYScaleFromFixedValues(
  graphBottom: number,
  graphTop: number,
  graphMinY: number,
  graphMaxY: number,
): ScaleLinear<number, number> {
  return scaleLinear<number>({
    range: [graphBottom, graphTop],
    round: true,
    domain: [graphMinY, graphMaxY],
  }).nice();
}

const DEFAULT_RANGE_MIN = 0.05;

export function generateYBoundsFromData(
  data: number[],
  axisBufferRatio: number,
  epsilonDivider = 1000,
): readonly number[] {
  const [minY, maxY] = getMinAndMaxValueFromArray(data);
  const epsilon = Math.abs((maxY + minY) / 2) / epsilonDivider;
  const diameter = Math.abs(maxY - minY);
  const buffer = diameter * axisBufferRatio;
  if (diameter > 0) {
    // Bails out on really small ranges that aren't centered around zero
    if (diameter < DEFAULT_RANGE_MIN) {
      const average = (maxY + minY) / 2;
      return [average - DEFAULT_RANGE_MIN / 2, average + DEFAULT_RANGE_MIN / 2];
    }
    const graphMaxY = Math.max(maxY + buffer, minY + epsilon);
    const graphMinY = Math.min(minY - buffer, maxY - epsilon);
    return [graphMinY, graphMaxY] as const;
  }
  // Handles the case where all the data is the same, so diameter is zero
  // It doesn't matter that we're using minY and maxY for the bottom and top,
  // since both values are the same.
  const flatBuffer = Math.max(Math.abs(maxY * 0.1), 1);
  const graphMaxY = maxY + flatBuffer;
  const graphMinY = minY - flatBuffer;
  return [graphMinY, graphMaxY] as const;
}

const DEFAULT_VERTICAL_TICKS = 5;
export function generateYTicks(yDomain: number[], numTicks = DEFAULT_VERTICAL_TICKS): number[] {
  const ticks: number[] = [];
  if (yDomain.length < 2) {
    return [0, 0.25, 0.5, 0.75, 1.0];
  }
  let yMin = yDomain[0];
  const yMax = yDomain[yDomain.length - 1];
  if (numTicks === 2) {
    ticks.push(...[yMin, yMax]);
    return ticks;
  }
  const divisor = numTicks - 1 > 1 ? numTicks - 1 : DEFAULT_VERTICAL_TICKS;
  const step = Math.abs((yMax - yMin) / divisor);
  // Just in case we get weird domains
  yMin = Math.min(yMin, yMax);
  for (let i = 0; i < numTicks; i += 1) {
    let next = yMin + i * step;
    if (next > 10) {
      next = Math.round(next);
    }
    ticks.push(Number((yMin + i * step).toFixed(3)));
  }
  return ticks;
}

export const MAX_X_TICKS = 18;

export function generateMonthlyTicks(
  xScale: ScaleTime<number, number>,
  ticksInMillis: number[] | undefined,
): number[] | undefined {
  const domain = xScale.domain();
  let trueStart = 0;
  let trueEnd = 0;
  if (domain.length === 2 && ticksInMillis) {
    trueStart = domain[0].getTime();
    trueEnd = domain[1].getTime();
  } else {
    return undefined;
  }
  const datedDataArray: DatedData[] =
    ticksInMillis
      ?.filter((t) => !isExactlyNullOrUndefined(t))
      .map((t) => ({
        dateInMillis: t,
      })) ?? [];
  const monthlyTicks = generateMonthlyDates(datedDataArray, [], [trueStart, trueEnd], false);

  const numFullIntervals = Math.floor((trueEnd - trueStart) / ONE_MONTH_IN_MILLIS) || 1;
  const intervalsPerTick = Math.ceil(numFullIntervals / MAX_X_TICKS);

  if (monthlyTicks.length > MAX_X_TICKS && intervalsPerTick > 1) {
    return monthlyTicks.filter((_value, idx) => idx % intervalsPerTick === 1 || idx === monthlyTicks.length - 1);
  }

  return monthlyTicks;
}

export function getApproximateTickCount(width: number, batchFrequency: TimePeriod, hardCap: number): number {
  const tickWidth = batchFrequency === TimePeriod.Pt1H ? 80 : 40;
  const maxTicks = Math.min(Math.floor(width / tickWidth), hardCap);
  return Math.max(maxTicks, 2); // Ensure we never divide by zero
}

export function generateXTicks(
  xScale: ScaleTime<number, number>,
  ticksInMillis: number[] | undefined,
  width: number,
  batchFrequency: TimePeriod = TimePeriod.P1D,
  filterSkipInterval = 0,
  offsetDecimal = 0,
  avoidRenderLastTick = false,
): number[] | undefined {
  const intervalMillis = getBatchStep(batchFrequency);
  const domain = xScale.domain();
  let trueStart = 0;
  let trueEnd = 0;
  if (domain.length === 2) {
    trueStart = domain[0].getTime();
    trueEnd = domain[1].getTime();
  } else if (ticksInMillis) {
    [trueStart] = ticksInMillis;
    trueEnd = ticksInMillis[ticksInMillis.length - 1];
  }

  const maxTicks = getApproximateTickCount(width, batchFrequency, MAX_X_TICKS);
  if (ticksInMillis?.length === 1 && trueEnd - trueStart <= 1) {
    return ticksInMillis;
  }
  const safeInterval = Math.floor((trueEnd - trueStart) / maxTicks);
  const numFullIntervals = Math.floor((trueEnd - trueStart) / intervalMillis) || 1;
  const intervalsPerTick = Math.ceil(numFullIntervals / maxTicks);
  const selectedTicks: number[] = [];
  const offsetMillis = offsetDecimal * intervalMillis;
  const isEvenTicksCount = (ticksInMillis?.length ?? 0) % 2 === 0;

  if (safeInterval > 0 && intervalsPerTick * intervalMillis > 0) {
    const chosenSkipInitialValue = isEvenTicksCount ? 1 : 0;
    let filterSkipCount = avoidRenderLastTick ? chosenSkipInitialValue : 0;
    let nextTime = trueStart + offsetMillis;
    while (nextTime <= trueEnd) {
      if (filterSkipCount >= filterSkipInterval) {
        selectedTicks.push(nextTime);
        filterSkipCount = 0;
      } else {
        filterSkipCount += 1;
      }
      nextTime += intervalsPerTick * intervalMillis;
    }
  }

  return selectedTicks;
}

interface YRangeGeneratorParameters {
  dataRange: [number, number];
  suggestedRange?: [number, number];
  yBufferRatio: number;
  minYRange: number;
  errorCallback?: (errorMessage: string) => void;
}

const DEFAULT_ERROR_CALLBACK = (errorMessage: string) => {
  console.error(errorMessage);
};

export function generateGraphYRangeWithParameters({
  dataRange,
  suggestedRange,
  yBufferRatio,
  minYRange,
  errorCallback = DEFAULT_ERROR_CALLBACK,
}: YRangeGeneratorParameters): [number, number] {
  if (minYRange <= 0 || dataRange[1] < dataRange[0] || (suggestedRange && suggestedRange[1] < suggestedRange[0])) {
    errorCallback('Attempting to graph a range with invalid parameters');
    return [0, 1];
  }
  const dataSpread = dataRange[1] - dataRange[0];
  const dataMax = dataSpread > minYRange ? dataRange[1] : dataRange[0] + minYRange;

  const validYBuffer = yBufferRatio >= 0 && yBufferRatio < 1 ? yBufferRatio : 0;
  const maxBufferMultiplier = dataMax > 0 ? 1 + validYBuffer : 1 - validYBuffer;
  const minBufferMultiplier = dataRange[0] > 0 ? 1 - validYBuffer : 1 + validYBuffer;
  const relativeMaxWithBuffer = dataMax * maxBufferMultiplier;
  const relativeMinWithBuffer = dataRange[0] * minBufferMultiplier;
  // We update the values here in case everything is negative.
  const relativeMax = Math.max(relativeMaxWithBuffer, relativeMinWithBuffer);
  const relativeMin = Math.min(relativeMinWithBuffer, relativeMaxWithBuffer);

  if (!suggestedRange) {
    return [relativeMin, relativeMax];
  }
  // We use the suggested range as a hard cap on the max value unless the data itself exceeds it.
  // For instance, this could be used to cap a graph of percentages at 100% unless the data itself has values above 100%.
  // This logic also chooses the tightest valid range that fits both the data and the suggetion.
  const boundedMax = dataRange[1] <= suggestedRange[1] ? Math.min(suggestedRange[1], relativeMax) : relativeMax;
  const boundedMin = dataRange[0] >= suggestedRange[0] ? Math.max(suggestedRange[0], relativeMin) : relativeMin;
  return [boundedMin, boundedMax];
}
