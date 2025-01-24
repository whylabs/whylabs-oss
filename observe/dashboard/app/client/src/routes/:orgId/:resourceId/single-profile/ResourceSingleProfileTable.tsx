import { EventTableObject, EventsTable } from '~/components/events/EventsTable';
import { useMemo } from 'react';

import { useResourceSingleProfileViewModel } from './ResourceSingleProfileViewModel';

type ResourceSingleProfileTableProps = {
  metricName: string;
};

export const ResourceSingleProfileTable = ({ metricName }: ResourceSingleProfileTableProps) => {
  const { chart, selectedIds, selectedResourceId } = useResourceSingleProfileViewModel();

  const tableData = useMemo(() => {
    const list: EventTableObject[] = [];
    selectedIds.forEach((key) => {
      const item = chart.series.find((i) => i.retrievalToken === key);
      if (!item) return;

      list.push({
        lastUploadTimestamp: item.lastUploadTimestamp,
        profileTimestamp: item.x,
        metricValue: item.y,
        segment: item.segment,
        traceId: item.traceId,
      });
    });

    return list;
  }, [chart.series, selectedIds]);

  return (
    <EventsTable
      data={tableData}
      hasNextPage={false}
      isLoading={chart.isLoading}
      metricName={metricName}
      resourceId={selectedResourceId}
    />
  );
};
