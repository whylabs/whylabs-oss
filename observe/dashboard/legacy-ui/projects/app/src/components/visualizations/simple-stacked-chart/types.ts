export interface StackedBar {
  from: Date;
  to: Date;
  counts: {
    [key: string]: {
      count: number;
      color: string;
    };
  };
}
