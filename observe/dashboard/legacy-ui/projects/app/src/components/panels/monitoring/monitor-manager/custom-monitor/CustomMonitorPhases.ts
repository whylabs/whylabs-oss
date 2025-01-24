import { UseCaseOption, useCaseOptions } from './CustomMonitorTypes';
import {
  MonitorUseCase,
  MonitorUseCaseOptions,
  MonitorAnalysis1,
  MonitorAnalysisOptions1,
  MonitorBaseline,
  MonitorBaselineOptions,
  AlertSeverity,
} from './phase-cards';
import FeatureTypeSelectCard from './phase-cards/analysis/data-drift/FeatureTypeSelectCard/FeatureTypeSelectCard';
import SelectSegmentCard from './phase-cards/analysis/data-drift/SelectCard/SelectCard';
import InvalidThirdPhaseCard from './phase-cards/analysis/model-performance/InvalidThirdPhaseCard';
import { PhaseCard } from './phase-cards/phaseCard';
import DataDriftOptions from './phase-cards/use-case/data-drift/DataDriftOptions';
import GlobalActionsCard from './phase-cards/actions/GlobalActionsCard';

export enum CardKeys {
  MonitorUseCaseKey,
  MonitorUseCaseOptionsKey,
  MonitorAnalysis1Key,
  MonitorAnalysisOptions1Key,
  ModelPerformanceSelectSegmentCardKey,
  SelectSegmentCardKey,
  FeatureTypeSelectCardKey,
  MonitorBaselineKey,
  MonitorBaselineOptionsKey,
  AlertSeverityKey,
  GlobalNotificationActionsKey,
  InvalidThirdPhaseKey,
  DataQualityPhaseKey,
}

export enum PhaseOptions {
  Default,
  StaticThreshold,
  DataQuality,
}

type PhaseIds = UseCaseOption | PhaseOptions;

export interface PhaseOption {
  id: PhaseIds;
  cards: PhaseCard[];
}
export interface PhaseComponent {
  phaseTitle: string;
  options: PhaseOption[];
}

// { phaseTitle: string; options: { id: PhaseIds; cards: PhaseCard[] }[]

// if 'options' array has more than one item, items must have an 'id' property based on whitch it will be conditioned
export const phasesComponents: {
  [key: string]: PhaseComponent;
} = {
  phase1: {
    phaseTitle: 'Select the use case',
    options: [
      {
        id: PhaseOptions.Default,
        cards: [
          { content: MonitorUseCase, span: 1, id: CardKeys.MonitorUseCaseKey },
          { content: MonitorUseCaseOptions, span: 1, id: CardKeys.MonitorUseCaseOptionsKey },
        ],
      },
      {
        id: PhaseOptions.DataQuality,
        cards: [
          { content: MonitorUseCase, span: 1, id: CardKeys.MonitorUseCaseKey },
          { content: MonitorUseCaseOptions, span: 1, id: CardKeys.MonitorUseCaseOptionsKey },
          { content: DataDriftOptions, span: 1, id: CardKeys.DataQualityPhaseKey },
        ],
      },
    ],
  },
  phase2: {
    phaseTitle: 'Select the type of analysis',
    options: [
      {
        id: useCaseOptions[2].value,
        cards: [
          { content: MonitorAnalysis1, span: 1, id: CardKeys.MonitorAnalysis1Key },
          { content: MonitorAnalysisOptions1, span: 1, id: CardKeys.MonitorAnalysisOptions1Key },
          { content: SelectSegmentCard, span: 1, id: CardKeys.ModelPerformanceSelectSegmentCardKey },
        ],
      },
      {
        id: useCaseOptions[0].value,
        cards: [
          { content: SelectSegmentCard, span: 1, id: CardKeys.SelectSegmentCardKey },
          { content: FeatureTypeSelectCard, span: 2, id: CardKeys.FeatureTypeSelectCardKey },
        ],
      },
      {
        id: useCaseOptions[1].value,
        cards: [
          { content: SelectSegmentCard, span: 1, id: CardKeys.SelectSegmentCardKey },
          { content: FeatureTypeSelectCard, span: 2, id: CardKeys.FeatureTypeSelectCardKey },
        ],
      },
    ],
  },
  phase3: {
    phaseTitle: 'Set the baseline',
    options: [
      {
        id: PhaseOptions.Default,
        cards: [
          { content: MonitorBaseline, span: 1, id: CardKeys.MonitorBaselineKey },
          { content: MonitorBaselineOptions, span: 2, id: CardKeys.MonitorBaselineOptionsKey },
        ],
      },
      {
        id: PhaseOptions.StaticThreshold,
        cards: [{ content: InvalidThirdPhaseCard, span: 1, id: CardKeys.InvalidThirdPhaseKey }],
      },
    ],
  },
  phase4: {
    phaseTitle: 'Actions',
    options: [
      {
        id: PhaseOptions.Default,
        cards: [
          { content: AlertSeverity, span: 1, id: CardKeys.AlertSeverityKey },
          { content: GlobalActionsCard, span: 2, id: CardKeys.GlobalNotificationActionsKey },
        ],
      },
    ],
  },
};
