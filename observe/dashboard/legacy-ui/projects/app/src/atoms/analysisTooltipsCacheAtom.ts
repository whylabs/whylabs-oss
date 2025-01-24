import { atom } from 'recoil';
import { AnalysisTooltipDatum } from 'components/visualizations/drift-graphs/DistributionTooltip';

type AnalysisTooltipsCacheAtom = {
  [key: string]: {
    [index: number]: AnalysisTooltipDatum;
  };
};

export const analysisTooltipsCacheAtom = atom<AnalysisTooltipsCacheAtom>({
  key: 'AnalysisTooltipsCacheAtom',
  default: {},
});
