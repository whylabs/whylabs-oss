import { AnalysisDataFragment } from 'generated/graphql';

export interface GraphAreaCommonProps {
  manualColumnId?: string;
  isOutput?: boolean;
  isCorrelatedAnomalies: boolean;
  setAnalysisResults?: (result: AnalysisDataFragment[]) => void;
}
