export interface ChipTableData {
  columns: string[];
  rows: {
    [key: string]: { [key: string]: string | number };
  };
}

export type ProfileNameAndColor = {
  name: string;
  color: string;
};

export type ProfileDataGroup = {
  name: string;
  description: string;
  color: string;
};

export type ProfileRowCounts = [number | null, number | null, number | null];

export type ProfileTrioRow = {
  profileCounts: ProfileRowCounts;
};

export type HistogramRow = ProfileTrioRow & {
  bin: number;
  lowerEdge: number;
  upperEdge: number;
};

export type FrequentItemsRow = ProfileTrioRow & {
  item: string;
};
