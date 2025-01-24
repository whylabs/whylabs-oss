export type ColumnDiscreteness = 'continuous' | 'discrete';
export type ColumnSchema = {
  column: string; // name of the column
  classifier: string; // should be input or output
  dataType: string | null; // should be one of ColumnDataType
  discreteness: ColumnDiscreteness;
  tags?: string[];
};
