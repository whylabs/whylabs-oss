import { THRESHOLD_QUERY_NAME } from '~/utils/searchParamsConstants';

import { useSearchAndHashParams } from './useSearchAndHashParams';

type Threshold = {
  isActive: boolean;
  max: number;
  min: number;
};

export function useThreshold() {
  const [searchParams, setSearchParams] = useSearchAndHashParams();

  const threshold = getThreshold();

  function getThreshold() {
    const thresholdString = searchParams.get(THRESHOLD_QUERY_NAME) || null;
    if (!thresholdString) return { isActive: false, max: 0, min: 0 };

    const [min, max, isActive] = thresholdString.split('|');
    return {
      isActive: isActive === 'true',
      max: parseFloat(max),
      min: parseFloat(min),
    };
  }

  function isWithinThreshold(value: number) {
    if (!threshold.isActive) return true;
    return value >= threshold.min && value <= threshold.max;
  }

  function onChangeThresholdMax(newValue: number | '') {
    onUpdateThreshold({ max: newValue || 0 });
  }

  function onChangeThresholdMin(newValue: number | '') {
    onUpdateThreshold({ min: newValue || 0 });
  }

  function toggleThresholdIsActive() {
    onUpdateThreshold({ isActive: !threshold.isActive });
  }

  function onUpdateThreshold(newValue: Partial<Threshold>) {
    setSearchParams((nextSearchParams) => {
      const newThreshold = { ...threshold, ...newValue };

      if (newThreshold.min > newThreshold.max) {
        newThreshold.max = newThreshold.min;
      }

      const newValueString = `${newThreshold.min}|${newThreshold.max}|${String(newThreshold.isActive)}`;
      nextSearchParams.set(THRESHOLD_QUERY_NAME, newValueString);
      return nextSearchParams;
    });
  }

  function resetThreshold() {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.delete(THRESHOLD_QUERY_NAME);
      return nextSearchParams;
    });
  }

  return {
    isWithinThreshold,
    onChangeThresholdMax,
    onChangeThresholdMin,
    resetThreshold,
    threshold,
    toggleThresholdIsActive,
  };
}
