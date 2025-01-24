import { adjustPickerDateRangeToGraphAxis } from '~/components/chart/chart-utils';
import { constructDateRangeWithTimestamp } from '~/components/super-date-picker/utils';
import { encodeComposedFilter } from '~/hooks/composed-filter/composed-filter-utils';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { SimpleDateRange } from '~/types/dateTypes';
import { LoaderData } from '~/types/LoaderData';
import { trpc } from '~/utils/trpc';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import invariant from 'tiny-invariant';

import { useLlmTraceDateRangeParams } from '../hooks/useLlmTraceDateRangeParams';
import { getPolicyIssuesFilter } from '../utils/llm-trace-composed-filter-utils';

export const loader = (({ params }) => {
  const { orgId, resourceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');

  return { orgId, resourceId };
}) satisfies LoaderFunction;

export const useLlmTraceSummaryViewModel = () => {
  const { orgId, resourceId } = useLoaderData() as LoaderData<typeof loader>;
  const { handleNavigation } = useNavLinkHandler();
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const {
    isLoading: isLoadingDateRange,
    fromTimestamp,
    toTimestamp,
    timePeriod,
  } = useLlmTraceDateRangeParams({
    orgId,
    resourceId,
  });

  const isQueryEnabled = !isLoadingDateRange;
  const { data, isLoading } = trpc.meta.llmTraceSummary.list.useQuery(
    {
      orgId,
      resourceId,
      fromTimestamp,
      toTimestamp,
    },
    { enabled: isQueryEnabled },
  );
  const graphUsedDateRange: SimpleDateRange = (() => {
    const { min, max } = adjustPickerDateRangeToGraphAxis({ from: fromTimestamp, to: toTimestamp }, timePeriod);
    return { from: min, to: max };
  })();

  const navigateToTracesTab = (timestamp: number, filter?: string) => {
    const { startDate, endDate } = constructDateRangeWithTimestamp({ timePeriod, timestamp });
    if (!startDate || !endDate) return;
    const usedFilter = filter ?? encodeComposedFilter([]);
    enqueueSnackbar({ title: 'The date range was updated to show the related traces', variant: 'info' });
    handleNavigation({
      page: 'llm-secure',
      llmSecure: { path: 'traces' },
      setParams: [
        { name: 'filter', value: usedFilter ?? '' },
        { name: 'startDate', value: startDate },
        { name: 'endDate', value: endDate },
      ],
    });
  };

  const onClickToFilterPolicyIssueTraces = (
    timestamp: number,
    condition: Parameters<typeof getPolicyIssuesFilter>[0],
    value: string,
  ) => {
    const filter = getPolicyIssuesFilter(condition, value);
    if (!filter) return;
    navigateToTracesTab(timestamp, filter);
  };

  return {
    data,
    fromTimestamp,
    toTimestamp,
    isLoading: isQueryEnabled && isLoading,
    onClickToFilterPolicyIssueTraces,
    onClickToFilterRelatedTraces: navigateToTracesTab,
    timePeriod,
    graphUsedDateRange,
  };
};
