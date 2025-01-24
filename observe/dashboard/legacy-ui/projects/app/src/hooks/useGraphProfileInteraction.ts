import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { useCallback } from 'react';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { NavHandlerSearchParams, useNavLinkHandler } from './usePageLinkHandler';
import { dateConstructorToReadableISOString } from '../components/super-date-picker/utils';

interface GraphProfileInteractionParams {
  modelId: string;
  segment?: ParsedSegment;
  featureId?: string;
  clickItemTimestamp: number;
  previousTimestamps: number[];
  customDateRange?: SimpleDateRange;
}

export function useGraphProfileInteraction({
  modelId,
  segment,
  featureId,
  clickItemTimestamp,
  previousTimestamps,
  customDateRange,
}: GraphProfileInteractionParams): () => void {
  const { handleNavigation } = useNavLinkHandler();
  const navToProfiles = useCallback(() => {
    const searchParams: NavHandlerSearchParams = [
      {
        name: 'profile',
        value: [clickItemTimestamp.toFixed(0), ...previousTimestamps.map((pts) => pts.toFixed(0))],
      },
    ];
    if (featureId) {
      searchParams.push({
        name: 'feature-highlight',
        value: featureId,
      });
    }
    const customStartDate = dateConstructorToReadableISOString(customDateRange?.from ?? null);
    const customEndDate = dateConstructorToReadableISOString(customDateRange?.to ?? null);
    if (customStartDate && customEndDate) {
      searchParams.push(
        {
          name: 'startDate',
          value: customStartDate,
        },
        {
          name: 'endDate',
          value: customEndDate,
        },
      );
    }
    handleNavigation({
      modelId,
      page: 'profiles',
      segmentTags: segment,
      setParams: searchParams,
    });
  }, [
    clickItemTimestamp,
    previousTimestamps,
    featureId,
    customDateRange?.from,
    customDateRange?.to,
    handleNavigation,
    modelId,
    segment,
  ]);

  return navToProfiles;
}
