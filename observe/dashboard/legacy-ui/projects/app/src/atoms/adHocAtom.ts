import { atom, useRecoilState, useResetRecoilState } from 'recoil';

import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { PageType } from 'pages/page-types/pageType';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { segmentTagsToString } from 'utils/segments';
import isEqual from 'lodash/isEqual';
import { CardType } from 'components/cards/why-card/types';

interface AdHocAtom {
  model: string | undefined;
  features: string[];
  segment: ParsedSegment | undefined;
  pageType: PageType | undefined;
  runId: string | undefined;
  cardType?: CardType;
  loading?: boolean | undefined;
  error?: boolean | undefined;
}

const DEFAULT_AD_HOC_DATA = {
  model: undefined,
  features: [],
  segment: undefined,
  runId: undefined,
  pageType: undefined,
};

export const adHocAtom = atom<AdHocAtom>({
  key: 'AdHocAtom',
  default: DEFAULT_AD_HOC_DATA,
});

export const matchingAdHocData = (
  adHocData: AdHocAtom,
  modelId?: string,
  featureId?: string,
  segment?: ParsedSegment,
  pageType?: PageType,
  includeLoading = false,
): boolean => {
  // this will have to be refactored once we allow preview in performance or other non-column scope view
  if (modelId === undefined || featureId === undefined) {
    return false;
  }
  if (adHocData.loading === true && includeLoading === false) {
    return false;
  }
  return (
    adHocData.model === modelId &&
    adHocData.features.includes(featureId) &&
    segmentTagsToString(adHocData.segment?.tags) === segmentTagsToString(segment?.tags) &&
    pageType === adHocData.pageType
  );
};

export const useAdHoc = (
  modelId?: string,
  columnId?: string,
  segment?: ParsedSegment,
  pageType?: PageType,
): [string | undefined, () => void] => {
  // This returns an adhoc ID if featureId and optional segmentId belongs to an existing ad hoc run.
  // Otherwise, returns undefined
  const pt = usePageTypeWithParams();

  const usedModelId = modelId || pt.modelId;
  const usedPageType = pageType || pt.pageType;
  const usedSegments = segment || pt.segment;
  const usedColumnId = columnId || pt.featureId || pt.outputName;

  const [adHocRecoilData] = useRecoilState(adHocAtom);
  const resetAdHoc = useResetRecoilState(adHocAtom);
  const adhocRunId = matchingAdHocData(adHocRecoilData, usedModelId, usedColumnId, usedSegments, usedPageType)
    ? adHocRecoilData.runId
    : undefined;
  return [adhocRunId, resetAdHoc];
};

export const useAdHocExists = (modelId?: string, pageType?: string, segments?: ParsedSegment): boolean => {
  const pt = usePageTypeWithParams();
  const [adHocRecoilData] = useRecoilState(adHocAtom);
  // Returns true if an ad hoc run exists for the modelId and pageType and segments
  const usedModelId = modelId || pt.modelId;
  const usedPageType = pageType || pt.pageType;
  const usedSegments = segments || pt.segment;

  const isSameModel = adHocRecoilData.model === usedModelId;
  const isSamePage = adHocRecoilData.pageType === usedPageType;
  const isSameSegment = isEqual(adHocRecoilData.segment ?? [], usedSegments);

  return isSameModel && isSamePage && isSameSegment;
};

export function disabledBecauseAdHocText(componentName: string): string {
  return `Close monitor preview to access ${componentName}.`;
}
