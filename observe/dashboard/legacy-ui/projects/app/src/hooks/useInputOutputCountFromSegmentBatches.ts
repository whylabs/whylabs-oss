import { getDaysTimestampList, getMonthsTimestampList, getWeeksTimestampList, timeShort } from 'utils/dateUtils';
import { TimePeriod } from 'generated/graphql';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

export type InputOutputObject = {
  y: number;
  date: number;
};

export type InputOutputMap = {
  items: {
    [key: string]: InputOutputObject;
  };
  total: number;
};

type SegmentBatches = {
  inputCount: number;
  outputCount: number;
  timestamp: number;
};

export type UseInputOutputCountFromSegmentBatchesProps = {
  batchFrequency: TimePeriod | undefined;
  segmentData: { batches?: SegmentBatches[] }[];
};

export function useInputOutputCountFromSegmentBatches({
  batchFrequency,
  segmentData,
}: UseInputOutputCountFromSegmentBatchesProps): {
  inputData: InputOutputMap[];
  outputData: InputOutputMap[];
} {
  const {
    dateRange: { from, to },
  } = useSuperGlobalDateRange();

  const inputData: InputOutputMap[] = [];
  const outputData: InputOutputMap[] = [];

  const datesList = getDatesList()(from, to);

  segmentData?.forEach(({ batches }) => {
    const inputBatches: InputOutputMap = {
      items: {},
      total: 0,
    };
    const outputBatches: InputOutputMap = {
      items: {},
      total: 0,
    };

    // fill in using batch data
    batches?.forEach(({ inputCount, outputCount, timestamp }) => {
      const dateString = displayDate(timestamp);
      inputBatches.items[dateString] = { y: inputCount, date: timestamp };
      outputBatches.items[dateString] = { y: outputCount, date: timestamp };

      inputBatches.total += inputCount;
      outputBatches.total += outputCount;
    });

    // fill in missing dates with 0
    datesList.forEach((date) => {
      const dayString = displayDate(date);

      const emptyObject = Object.freeze({ y: 0, date });

      if (!inputBatches.items[dayString]) {
        inputBatches.items[dayString] = emptyObject;
      }

      if (!outputBatches.items[dayString]) {
        outputBatches.items[dayString] = emptyObject;
      }
    });

    inputData.push(inputBatches);
    outputData.push(outputBatches);
  });

  return {
    inputData,
    outputData,
  };

  function getDatesList() {
    if (batchFrequency === TimePeriod.P1W) {
      return getWeeksTimestampList;
    }
    if (batchFrequency === TimePeriod.P1M) {
      return getMonthsTimestampList;
    }

    return getDaysTimestampList;
  }

  function displayDate(timestamp: number) {
    return timeShort(timestamp, batchFrequency);
  }
}
