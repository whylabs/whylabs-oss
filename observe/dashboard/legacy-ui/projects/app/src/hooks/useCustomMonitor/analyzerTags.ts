import { FeatureSelection } from 'components/panels/monitoring/monitor-manager/custom-monitor/phase-cards/analysis/data-drift/FeatureTypeSelectCard/featureOptions';
import { DiscreteTypeOption } from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';

export type AnalyzerSelectionTag = `featureSelection:${FeatureSelection}`;
export type AnalyzerDiscretenessTag = `discreteness:${DiscreteTypeOption}`;
export enum MonitorCreationTags {
  UI = 'creation:ui_builder',
  JSON = 'creation:custom_json_editor',
}
