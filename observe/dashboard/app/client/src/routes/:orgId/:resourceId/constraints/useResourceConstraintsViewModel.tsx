import { Colors } from '~/assets/Colors';
import { ChartOnClickPosition, ChartPointOptions, ChartTimeSeries } from '~/components/chart/types/chart-types';
import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import useSearchText from '~/hooks/useSearchText';
import { useSegments } from '~/hooks/useSegments';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { LoaderData } from '~/types/LoaderData';
import { OFFSET_QUERY_NAME, SELECTED_CONSTRAINT_QUERY_NAME, SELECTED_QUERY_NAME } from '~/utils/searchParamsConstants';
import { RouterOutputs, trpc } from '~/utils/trpc';
import { useCallback, useMemo } from 'react';
import { LoaderFunction, useLoaderData, useSearchParams } from 'react-router-dom';

export type Constraints = RouterOutputs['dashboard']['constraints']['list']['segmentConstraints'];
export type Constraint = Constraints[0];

export const loader = (({ params }) => {
  const { orgId, resourceId } = params;
  if (!orgId) throw new Error('orgId must exist in this route');
  if (!resourceId) throw new Error('resourceId must exist in this route');

  return { orgId, resourceId };
}) satisfies LoaderFunction;

export function useResourceConstraintsViewModel() {
  const { orgId, resourceId } = useLoaderData() as LoaderData<typeof loader>;
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchText, setSearchText } = useSearchText();
  const { batchFrequency, loading } = useResourceBatchFrequency({ orgId, resourceId });
  const {
    dateRange: { from: startTimestamp, to: endTimestamp },
    loading: loadingDateRange,
  } = useSuperGlobalDateRange({ timePeriod: batchFrequency, loading });

  const selectedIds = searchParams.getAll(SELECTED_QUERY_NAME) ?? [];
  const { parsed: segment } = useSegments();
  const { data, isLoading } = trpc.dashboard.constraints.list.useQuery(
    {
      orgId,
      resourceId,
      fromTimestamp: startTimestamp ?? 0,
      toTimestamp: endTimestamp ?? 0,
      segment,
    },
    {
      enabled: !loadingDateRange,
    },
  );

  const constraintsList = useMemo(
    () =>
      [...(data?.segmentConstraints ?? [])]?.sort(
        (a, b) => b.anomaliesCount - a.anomaliesCount || a.id.localeCompare(b.id),
      ),
    [data?.segmentConstraints],
  );

  const selectedConstraint = getSelectedConstraint();

  const shouldDisplayConstraint = useCallback(
    (c: Constraint) => {
      if (!searchText) return true;
      return c.displayName.toLowerCase().includes(searchText.toLowerCase());
    },
    [searchText],
  );

  const filteredConstraints = useMemo(() => {
    const failedConstraints: Constraints = [];
    const healthyConstraints: Constraints = [];
    constraintsList.forEach((c) => {
      if (shouldDisplayConstraint(c)) {
        if (c.anomaliesCount && c.anomaliesCount > 0) {
          failedConstraints.push(c);
        } else {
          healthyConstraints.push(c);
        }
      }
    });
    return { failedConstraints, healthyConstraints };
  }, [constraintsList, shouldDisplayConstraint]);

  const isConstraintQueryEnabled = !!selectedConstraint && !loadingDateRange;
  const { data: constraintFailures, isLoading: constraintFailuresLoading } =
    trpc.analysis.analyzerResults.getAnomaliesCount.useQuery(
      {
        analyzerIds: selectedConstraint ? [selectedConstraint.id] : [],
        orgId,
        resourceId,
        fromTimestamp: startTimestamp ?? 0,
        toTimestamp: endTimestamp ?? 0,
        segment,
      },
      {
        enabled: isConstraintQueryEnabled,
      },
    );

  const onClickSeries = useCallback(
    () => (_: ChartOnClickPosition, options: ChartPointOptions) => {
      setSearchParams((nextSearchParams) => {
        nextSearchParams.delete(SELECTED_QUERY_NAME);
        if (options.x) {
          nextSearchParams.append(SELECTED_QUERY_NAME, options.x.toString());
        }

        return nextSearchParams;
      });
    },
    [setSearchParams],
  );

  const chartData = useMemo(() => {
    const series: ChartTimeSeries[] = [
      {
        type: 'column',
        color: Colors.chartPrimary,
        data: constraintFailures?.map(({ anomalyCount, timestamp }) => [timestamp, anomalyCount]) ?? [],
        id: 'failed-count',
        name: 'Failed count',
        onClick: onClickSeries,
      },
    ];

    return {
      fromTimestamp: startTimestamp ?? 0,
      series,
      toTimestamp: endTimestamp ?? 0,
    };
  }, [constraintFailures, endTimestamp, onClickSeries, startTimestamp]);

  function getSelectedConstraint() {
    if (!constraintsList.length) return null;

    const id = searchParams.get(SELECTED_CONSTRAINT_QUERY_NAME);
    const selected = constraintsList.find((c) => c.id === id);

    // If the selected is a failed constraint, return it
    if (selected?.anomaliesCount) return selected;

    // Try to select the first one if it's a failed constraint
    if (constraintsList[0]?.anomaliesCount) return constraintsList[0];

    return null;
  }

  function onSelectConstraint(constraint: Constraint) {
    return () => {
      setSearchParams((nextSearchParams) => {
        nextSearchParams.set(OFFSET_QUERY_NAME, '0');
        nextSearchParams.delete(SELECTED_QUERY_NAME);

        nextSearchParams.set(SELECTED_CONSTRAINT_QUERY_NAME, constraint.id);
        return nextSearchParams;
      });
    };
  }

  return {
    chart: {
      ...chartData,
      isLoading: isConstraintQueryEnabled && constraintFailuresLoading,
    },
    constraints: {
      failed: filteredConstraints.failedConstraints,
      isLoading,
      healthy: filteredConstraints.healthyConstraints,
      selected: selectedConstraint,
      allConstraints: constraintsList,
      totalResourceCount: data?.totalResourceConstraints,
    },
    onSelectConstraint,
    resourceId,
    orgId,
    searchText,
    selectedProfiles: selectedIds,
    setSearchText,
    segmentTags: segment,
  };
}
