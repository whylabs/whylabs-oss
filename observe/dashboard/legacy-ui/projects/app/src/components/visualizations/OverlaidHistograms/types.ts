import { HistogramFieldsFragment } from 'generated/graphql';

export interface UnifiedHistogramWithMetadata {
  profileNum: number;
  profileName?: string;
  color: string;
  data: HistogramFieldsFragment | undefined;
}
