import { ModelPerformanceFragment, SegmentPerformanceFragment } from 'generated/graphql';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ClassificationViewProps {
  data?: ModelPerformanceFragment | SegmentPerformanceFragment | null; // data for a given dataset or segment
}

type BatchDataType = ModelPerformanceFragment['batches'][0] | SegmentPerformanceFragment['batches'][0];

interface ClassificationGraphIndices {
  confusionIndex: number;
  calibrationIndex: number;
  precisionIndex: number;
  rocAucIndex: number;
}

const INVALID_INDEX = -1;

const INVALID_CLASSIFICATION_DATA: ClassificationGraphIndices = {
  confusionIndex: INVALID_INDEX,
  calibrationIndex: INVALID_INDEX,
  precisionIndex: INVALID_INDEX,
  rocAucIndex: INVALID_INDEX,
};

export function useClassificationViewHelper({ data }: ClassificationViewProps): {
  lastBatchData: BatchDataType | null;
  calibrationData: BatchDataType | null;
  confusionData: BatchDataType | null;
  precisionData: BatchDataType | null;
  rocAucData: BatchDataType | null;
  updateByKey: (key: keyof ClassificationGraphIndices, increase: boolean) => void;
  hasNextByKey: (key: keyof ClassificationGraphIndices) => boolean;
  hasPreviousByKey: (key: keyof ClassificationGraphIndices) => boolean;
} {
  const [graphIndexState, setGraphIndexState] = useState<ClassificationGraphIndices>(INVALID_CLASSIFICATION_DATA);
  const [lastIndex, setLastIndex] = useState<number>(INVALID_INDEX);

  const hasBeenInitialized = useRef<boolean>(false);

  const batches: BatchDataType[] = useMemo(() => {
    return data?.batches ?? [];
  }, [data]);

  useEffect(() => {
    // Note that it is fine to set this value to -1, as that indicates a lack of data.
    const latestIndex = batches.length - 1;
    setLastIndex(latestIndex);
    if (!hasBeenInitialized.current && batches.length > 0) {
      hasBeenInitialized.current = true;
      setGraphIndexState({
        confusionIndex: latestIndex,
        calibrationIndex: latestIndex,
        precisionIndex: latestIndex,
        rocAucIndex: latestIndex,
      });
    }
  }, [batches.length]);

  const lastBatchData: BatchDataType | null = useMemo(() => {
    return lastIndex >= 0 ? batches[lastIndex] : null;
  }, [lastIndex, batches]);

  const calibrationData: BatchDataType | null = useMemo(() => {
    return graphIndexState.calibrationIndex >= 0 ? batches[graphIndexState.calibrationIndex] : null;
  }, [graphIndexState.calibrationIndex, batches]);

  const confusionData: BatchDataType | null = useMemo(() => {
    return graphIndexState.confusionIndex >= 0 ? batches[graphIndexState.confusionIndex] : null;
  }, [graphIndexState.confusionIndex, batches]);

  const precisionData: BatchDataType | null = useMemo(() => {
    return graphIndexState.precisionIndex >= 0 ? batches[graphIndexState.precisionIndex] : null;
  }, [graphIndexState.precisionIndex, batches]);

  const rocAucData: BatchDataType | null = useMemo(() => {
    return graphIndexState.rocAucIndex >= 0 ? batches[graphIndexState.rocAucIndex] : null;
  }, [graphIndexState.rocAucIndex, batches]);

  const updateByKey = useCallback(
    (key: keyof ClassificationGraphIndices, increase: boolean) => {
      setGraphIndexState((prev) => {
        return { ...prev, [key]: increase ? prev[key] + 1 : prev[key] - 1 };
      });
    },
    [setGraphIndexState],
  );

  const hasNextByKey = useCallback(
    (key: keyof ClassificationGraphIndices) => {
      return graphIndexState[key] < lastIndex;
    },
    [graphIndexState, lastIndex],
  );

  const hasPreviousByKey = useCallback(
    (key: keyof ClassificationGraphIndices) => {
      return graphIndexState[key] > 0;
    },
    [graphIndexState],
  );

  return {
    lastBatchData,
    calibrationData,
    confusionData,
    precisionData,
    rocAucData,
    updateByKey,
    hasNextByKey,
    hasPreviousByKey,
  } as const;
}
