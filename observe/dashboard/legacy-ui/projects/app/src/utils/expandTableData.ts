import { FeatureTableInfoFragment, GetMultiFeatureDriftAnalysisQuery } from 'generated/graphql';

export interface ExpandedData {
  driftValue: number | undefined | null;
  driftThreshold: number | undefined | null;
  algorithmMode: string | undefined | null;
  datasetTimestamp: number;
  isAnomaly: boolean;
}

interface ExpandedFeatureInfoFragment extends FeatureTableInfoFragment {
  driftInformation: ExpandedData[];
  weight?: {
    value: number;
  };
}

export function expandTableData(
  tableData: FeatureTableInfoFragment[],
  driftResult: GetMultiFeatureDriftAnalysisQuery | undefined,
): ExpandedFeatureInfoFragment[] {
  const expanded: ExpandedFeatureInfoFragment[] = [];
  if (!driftResult?.analysisResults) {
    tableData.forEach((td) => expanded.push({ ...td, driftInformation: [] }));
    return expanded;
  }

  const driftByColumn = driftResult.analysisResults.reduce<Map<string, ExpandedData[]>>((acc, curr) => {
    if (!curr.column || !curr.datasetTimestamp) {
      return acc;
    }

    const existing = acc.get(curr.column);
    const copied = existing ? [...existing] : [];
    const currValue = {
      driftValue: curr.drift_metricValue,
      driftThreshold: curr.drift_threshold,
      algorithmMode: curr.algorithmMode,
      datasetTimestamp: curr.datasetTimestamp,
      isAnomaly: !!curr.isAnomaly,
    };
    copied.push(currValue);
    acc.set(curr.column, copied);
    return acc;
  }, new Map<string, ExpandedData[]>());

  tableData.forEach((td) => {
    const driftRow = driftByColumn.get(td.name);
    if (!driftRow) {
      expanded.push({ ...td, driftInformation: [] });
    } else {
      driftRow.sort((a, b) => a.datasetTimestamp - b.datasetTimestamp);
      let driftRowIndex = 0;
      const filledDriftRow: ExpandedData[] = td.sketches.map((sketch) => {
        const emptyDrift: ExpandedData = {
          datasetTimestamp: sketch.datasetTimestamp ?? 0,
          driftValue: null,
          driftThreshold: null,
          algorithmMode: null,
          isAnomaly: false,
        };
        if (driftRowIndex >= driftRow.length) {
          return emptyDrift;
        }
        const currentIndex = driftRowIndex;
        if (sketch.datasetTimestamp === driftRow[currentIndex].datasetTimestamp) {
          driftRowIndex += 1;
          return driftRow[currentIndex];
        }

        if ((sketch.datasetTimestamp ?? 0) > driftRow[currentIndex].datasetTimestamp) {
          while (
            driftRowIndex < driftRow.length &&
            (sketch.datasetTimestamp ?? 0) > driftRow[driftRowIndex].datasetTimestamp
          ) {
            driftRowIndex += 1;
          }
          return driftRowIndex < driftRow.length ? driftRow[driftRowIndex] : emptyDrift;
        }
        return emptyDrift;
      });
      expanded.push({ ...td, driftInformation: filledDriftRow });
    }
  });
  return expanded;
}
