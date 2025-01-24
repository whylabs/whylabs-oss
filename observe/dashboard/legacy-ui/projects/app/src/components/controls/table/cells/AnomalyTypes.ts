import { Colors } from '@whylabs/observatory-lib';
import { AlertCategory } from 'generated/graphql';

export interface BucketedAlertCount {
  from: Date;
  to: Date;
  counts: {
    Ingestion: number;
    DataDrift: number;
    DataQuality: number;
    Performance: number;
    Unknown: number;
  };
}
export type AlertTimeseries = {
  __typename?: 'GroupedAlertBatch' | undefined;
  timestamp: number;
  counts: {
    __typename?: 'AlertCategoryCount' | undefined;
    category: AlertCategory;
    count: number;
  }[];
}[];

export const AlertTimeseriesEmpty: AlertTimeseries = [
  {
    __typename: undefined,
    timestamp: 0,
    counts: [
      {
        __typename: undefined,
        category: AlertCategory.Unknown,
        count: 0,
      },
    ],
  },
];

export const alertVariants: {
  key: keyof typeof AlertCategory;
  text: string;
  color: string;
  orderIndex: number;
}[] = [
  // order is important for coloring
  {
    key: 'Ingestion',
    text: 'Integration health',
    color: Colors.alertStackedBarArray[0],
    orderIndex: 0,
  },
  {
    key: 'DataQuality',
    text: 'Data quality',
    color: Colors.alertStackedBarArray[1],
    orderIndex: 1,
  },
  {
    key: 'DataDrift',
    text: 'Drift',
    color: Colors.alertStackedBarArray[2],
    orderIndex: 2,
  },
  {
    key: 'Performance',
    text: 'Model performance',
    color: Colors.alertStackedBarArray[3],
    orderIndex: 3,
  },
];
