import { Exact, Maybe, SegmentTagFilter } from 'generated/graphql';
import { SimpleDateRange } from 'utils/dateRangeUtils';

interface StatValueQueryProps {
  datasetId: string;
  featureId: string;
  tags: SegmentTagFilter[];
  adhocRunId?: string | undefined;
  dateRange: SimpleDateRange;
}

export function generateStatisticalValueQueryVariables({
  datasetId,
  featureId,
  tags,
  adhocRunId = undefined,
  dateRange,
}: StatValueQueryProps): Exact<{
  datasetId: string;
  featureId: string;
  anomaliesOnly: boolean;
  from: number;
  to?: Maybe<number> | undefined;
  tags?: Maybe<SegmentTagFilter[]> | undefined;
  adhocRunId?: Maybe<string> | undefined;
}> {
  return {
    datasetId,
    featureId,
    anomaliesOnly: false,
    tags,
    adhocRunId,
    ...dateRange,
  };
}
