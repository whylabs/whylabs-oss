import { EventsTable } from '~/components/events/EventsTable';
import { usePagingInfo } from '~/hooks/usePagingInfo';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { trpc } from '~/utils/trpc';
import { GranularityInclusion } from '~server/graphql/generated/graphql';
import { useMemo } from 'react';

import { useResourceConstraintsViewModel } from './useResourceConstraintsViewModel';

export const ResourceConstraintsTable = () => {
  const { chart, resourceId, orgId, constraints, selectedProfiles, segmentTags } = useResourceConstraintsViewModel();
  const selectedProfile = selectedProfiles[0];
  const { pagingInfo } = usePagingInfo();

  const isQueryEnabled = !!selectedProfile && !!constraints.selected;
  const { data: individualFailures, isLoading: individualFailuresLoading } =
    trpc.analysis.analyzerResults.getPaginatedAnalysis.useQuery(
      {
        ...pagingInfo,
        fromTimestamp: Number(selectedProfile),
        resourceId,
        orgId,
        onlyAnomalies: true,
        segment: segmentTags,
        analyzerIds: constraints.selected ? [constraints.selected.id] : [],
        granularityInclusion: GranularityInclusion.IndividualOnly,
      },
      { enabled: isQueryEnabled },
    );

  const totalLoading = chart.isLoading || !!(selectedProfile && isQueryEnabled && individualFailuresLoading);

  const tableData = useMemo(() => {
    if (individualFailuresLoading || !individualFailures?.data.length) return [];

    return individualFailures.data.map((an) => ({
      traceId: an.traceIds?.[0] ?? null,
      profileTimestamp: an.datasetTimestamp ?? null,
      metricValue: an.metricValue,
      segment: an.segment || '',
    }));
  }, [individualFailures, individualFailuresLoading]);

  return (
    <EventsTable
      data={isQueryEnabled ? tableData : []}
      hasNextPage={!!individualFailures?.hasNextPage}
      isLoading={totalLoading}
      metricName={constraints.selected?.metricName ? upperCaseFirstLetterOnly(constraints.selected.metricName) : null}
      resourceId={resourceId}
    />
  );
};
