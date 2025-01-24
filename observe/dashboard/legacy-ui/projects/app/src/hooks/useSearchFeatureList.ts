import { useState } from 'react';
import { useDeepCompareEffect } from 'use-deep-compare';
import { OFFSET_TAG } from 'types/navTags';
import { FEATURE_HIGHLIGHT_TAG } from './useSearchHighlight';
import { useSearchHandler } from './usePageLinkHandler';

type UseSearchFeatureListReturnType = {
  featureList: string[];
  setFeature: (featureNameList: string[]) => void;
};

export function useSearchFeatureList(): UseSearchFeatureListReturnType {
  const { getArrayValue, setArrayValue, deleteKey } = useSearchHandler();

  const foundFeatures = getArrayValue(FEATURE_HIGHLIGHT_TAG);
  const [featureList, setFeatureList] = useState<string[]>(foundFeatures);

  // Because this is an array, not using deep compare here
  // will result in a render loop (new array object every time).
  useDeepCompareEffect(() => {
    setFeatureList(foundFeatures);
  }, [foundFeatures]);

  function setFeature(featureNameList: string[], currentUrl?: string) {
    // Must use deleteKey here because we need to navigte both values at the same time
    deleteKey(OFFSET_TAG);
    setArrayValue(FEATURE_HIGHLIGHT_TAG, featureNameList);
  }

  return { featureList, setFeature };
}
