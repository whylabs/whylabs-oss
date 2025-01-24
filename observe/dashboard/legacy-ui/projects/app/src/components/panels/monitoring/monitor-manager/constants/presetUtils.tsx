import { Analyzer } from 'generated/monitor-schema';
import { AssetCategory, TimePeriod } from 'generated/graphql';
import { Skeleton } from '@material-ui/lab';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import MonitorManagerCard from 'components/monitor-manager-card/MonitorManagerCard';
import { JsonPresets } from '../custom-monitor/MonitorJsonConfig/presets/types';
import {
  ID_ACCURACY_ANALYZER,
  ID_F1_ANALYZER,
  ID_FREQUENT_ITEMS_DRIFT_ANALYZER,
  ID_NUMERICAL_DRIFT_ANALYZER,
  ID_PRECISION_ANALYZER,
  ID_RECALL_ANALYZER,
} from './fixedAnalyzerIds';

interface CardInfo {
  title: (category: AssetCategory) => string;
  categoryTitle: (category: AssetCategory) => string;
  description: (category: AssetCategory, batchFrequency?: TimePeriod) => JSX.Element;
  icon: string;
  color: string;
  disable?: boolean;
  hideOnCustomJsonFlag?: boolean;
  rowNumber?: number;
}
export interface MonitorItem extends CardInfo {
  analyzer: Analyzer;
}

export interface CustomJsonPresetItem extends CardInfo {
  presetId: JsonPresets;
}

export const DEFAULT = {
  BASELINE: {
    SIZE: 7,
    TYPE: 'TrailingWindow' as const,
  },
  THRESHOLD: 10,
};

type CustomJsonPresetCardProps = {
  category: AssetCategory;
  preset: CustomJsonPresetItem;
  loading: boolean;
  resourceId: string;
  batchFrequency?: TimePeriod;
  userCanManageMonitors: boolean;
};
export const CustomJsonPresetCard: React.FC<CustomJsonPresetCardProps> = ({
  category,
  preset,
  loading,
  batchFrequency,
  resourceId,
  userCanManageMonitors,
}: CustomJsonPresetCardProps) => {
  const { getNavUrl } = useNavLinkHandler();
  const { presetId, title, description, icon, color } = preset;
  if (loading) {
    return <Skeleton key={presetId} height="185px" width="254px" style={{ transform: 'unset' }} />;
  }
  const presetUrl = getNavUrl({
    page: 'monitorManager',
    modelId: resourceId,
    monitorManager: { path: 'customize-json', id: presetId },
  });

  return (
    <MonitorManagerCard
      key={presetId}
      id={presetId}
      disableControls={preset.disable}
      icon={icon}
      color={color}
      categoryTitle={preset.categoryTitle(category)}
      title={title(category)}
      text={description(category, batchFrequency)}
      customJsonCard
      redirectLink={presetUrl}
      userCanManageMonitors={userCanManageMonitors}
    />
  );
};

export const ID_DISPLAY_NAME_MAP: Map<string, string> = new Map([
  [ID_ACCURACY_ANALYZER, 'Accuracy Preset Monitor'],
  [ID_F1_ANALYZER, 'F1 Preset Monitor'],
  [ID_FREQUENT_ITEMS_DRIFT_ANALYZER, 'Frequent Items Drift Preset Monitor'],
  [ID_NUMERICAL_DRIFT_ANALYZER, 'Numerical Drift Preset Monitor'],
  [ID_PRECISION_ANALYZER, 'Precision Preset Monitor'],
  [ID_RECALL_ANALYZER, 'Recall Preset Monitor'],
]);

export const defaultTrailingWindowBaselineSize = new Map<TimePeriod, { size: number; description: string }>([
  [TimePeriod.Pt1H, { size: 24, description: '24-hour' }],
  [TimePeriod.P1D, { size: 7, description: '7-day' }],
  [TimePeriod.P1W, { size: 4, description: '4-week' }],
  [TimePeriod.P1M, { size: 6, description: '6-month' }],
]);
