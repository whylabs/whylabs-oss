import { UnifiedHistogramWithMetadata } from 'components/visualizations/OverlaidHistograms/types';
import { ChipTableData, HistogramRow } from './tableTypes';
import { ProfilesHistogramTable } from './ProfilesHistogramTable';
import { countValidColumns } from './tableTools';

interface ProfilesHistogramTableControllerProps {
  unifiedHistograms: UnifiedHistogramWithMetadata[] | undefined;
}

export function ProfilesHistogramTableController({
  unifiedHistograms,
}: ProfilesHistogramTableControllerProps): JSX.Element | null {
  const tempChipTableData: ChipTableData = {
    columns: [],
    rows: {},
  };
  unifiedHistograms?.forEach((histogram) => {
    if (!histogram?.data) return;
    tempChipTableData.columns.push(`Profile ${histogram.profileNum}`);
    histogram.data.bins.forEach((bin, i) => {
      if (i >= histogram.data!.counts.length) return;
      const indexKey = i.toString();
      if (!(indexKey in tempChipTableData.rows)) {
        tempChipTableData.rows[indexKey] = { value: bin };
      }
      tempChipTableData.rows[indexKey][`profile-${histogram.profileNum}`] = histogram.data!.counts[i];
    });
  });

  if (!unifiedHistograms?.[0]?.data || (unifiedHistograms?.[0]?.data?.bins?.length ?? 0) < 2) {
    return null;
  }

  const binLowerEdges = unifiedHistograms?.[0]?.data?.bins.slice(0, -1);
  const binUpperEdges = unifiedHistograms?.[0]?.data?.bins.slice(1);

  const profileColumns = unifiedHistograms?.map((histogram) => ({
    name: `Profile ${histogram.profileNum}`,
    color: histogram.color,
  }));

  const profileCounts = unifiedHistograms?.map((histogram) => histogram.data?.counts);
  const profileLength = profileCounts.length;

  const rows: HistogramRow[] = binLowerEdges.map((lowerEdge, i) => {
    return {
      bin: i,
      lowerEdge,
      upperEdge: binUpperEdges[i],
      profileCounts: [
        profileLength > 0 ? profileCounts[0]?.[i] ?? null : null,
        profileLength > 1 ? profileCounts[1]?.[i] ?? null : null,
        profileLength > 2 ? profileCounts[2]?.[i] ?? null : null,
      ],
    };
  });

  const validColumnCount = countValidColumns(rows);

  return <ProfilesHistogramTable profileColumns={profileColumns} rows={rows} hasValidRows={validColumnCount > 0} />;
}
