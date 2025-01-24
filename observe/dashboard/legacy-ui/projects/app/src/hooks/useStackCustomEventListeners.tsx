import { useCallback, useEffect, useMemo } from 'react';
import {
  NEW_GLOBAL_END_RANGE,
  NEW_GLOBAL_RANGE_PRESET,
  NEW_GLOBAL_START_RANGE,
  NEW_STACK_BACK_TO_KEY,
} from 'types/navTags';
import { useRecoilState } from 'recoil';
import { SupportedRoute, useNavLinkHandler } from './usePageLinkHandler';
import { SuperDatePickerAtom } from '../atoms/globalPickerAtom';
import { GLOBAL_PICKER_ID } from '../constants/hardcoded';
import {
  getDefaultPresetWindowSize,
  getPresetGranularity,
  RELATIVE_PRESET_TOKEN,
} from './useDynamicTrailingRangePresets';
import { TimePeriod } from '../generated/graphql';

export enum MainStackEvents {
  SetSearchParams = 'set_search_params',
  StackNavigation = 'navigation',
  URLReplace = 'url_replace',
  LoadingComplete = 'loading_complete',
  RefThresholdChange = 'ref_threshold_change',
  DashboardDeletion = 'dashboard_deletion',
  DashboardNameChange = 'dashboard_name_change',
} // Should be in sync with mono-repo

type CustomEventListener = {
  type: MainStackEvents;
  listener: (event: Event) => void;
};

const pageMapper = new Map<string, SupportedRoute>([
  ['columns', 'columns'],
  ['summary', 'summary'],
]);

const handleMonoRepoNavigationObject = (modelId: string, page: SupportedRoute, data: unknown) => {
  if (page === 'columns') {
    const objectData = typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const featureName = objectData?.featureName;
    const usedFeatureName = typeof featureName === 'string' ? featureName : undefined;
    return { modelId, page, featureName: usedFeatureName };
  }
  return { modelId, page };
};

export const useStackCustomEventListeners = (): void => {
  const { handleNavigation } = useNavLinkHandler();
  const [superPickerState] = useRecoilState(SuperDatePickerAtom);
  const globalDatePickerTimePeriod = superPickerState[GLOBAL_PICKER_ID]?.timePeriod;

  const handleURLReplacement = useCallback(
    (e: CustomEvent) => {
      const newUrl = e.detail;
      if (typeof newUrl === 'string' && newUrl.includes('http')) {
        const searchParams = new URLSearchParams(window.location.search);
        const hasCustomRange = searchParams.get(NEW_GLOBAL_START_RANGE) && searchParams.get(NEW_GLOBAL_END_RANGE);
        const hasPresetRange = searchParams.get(NEW_GLOBAL_RANGE_PRESET);
        const fallbackWindowSize = getDefaultPresetWindowSize(globalDatePickerTimePeriod)?.toString();
        const defaultPresetGranularityToken = getPresetGranularity(globalDatePickerTimePeriod ?? TimePeriod.P1D);
        if (!hasCustomRange && !hasPresetRange) {
          // when using the fallback range preset
          searchParams.set(
            NEW_GLOBAL_RANGE_PRESET,
            `${defaultPresetGranularityToken}${RELATIVE_PRESET_TOKEN}${fallbackWindowSize}`,
          );
        }
        const concatToken = newUrl.indexOf('?') === -1 ? '?' : '&';
        const [backToUrl] = window.location.href.split('?');
        const searchString = searchParams.toString();
        window.location.href = `${newUrl}${concatToken}${NEW_STACK_BACK_TO_KEY}=${backToUrl}${
          searchString ? `?${searchString}` : ''
        }`;
      }
    },
    [globalDatePickerTimePeriod],
  );

  const handleNavigationEvent = useCallback(
    (e: CustomEvent) => {
      const { modelId, page, data } = e.detail;
      if (typeof modelId === 'string' && typeof page === 'string') {
        const usedPage: SupportedRoute = pageMapper.get(page) ?? 'notFound';
        const params = handleMonoRepoNavigationObject(modelId, usedPage, data);
        handleNavigation(params);
      } else {
        console.log(`failed to navigate from monorepo resource: ${modelId}, page: ${page} and params: ${data}`);
      }
    },
    [handleNavigation],
  );
  const listeners: CustomEventListener[] = useMemo(
    () => [
      {
        type: MainStackEvents.StackNavigation,
        listener: (event: Event) => handleNavigationEvent(event as CustomEvent),
      },
      {
        type: MainStackEvents.URLReplace,
        listener: (event: Event) => handleURLReplacement(event as CustomEvent),
      },
    ],
    [handleNavigationEvent, handleURLReplacement],
  );

  useEffect(() => {
    listeners.forEach(({ type, listener }) => window.document.addEventListener(type, listener));

    return () => {
      listeners.forEach(({ type, listener }) => window.document.removeEventListener(type, listener));
    };
  }, [handleNavigationEvent, listeners]);
};
