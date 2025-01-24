import { WhyLabsContextMenu } from 'components/design-system';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { AssetCategory } from 'generated/graphql';
import { MonitoringChartMenuItemHandlerProps, useMonitoringChartMenuItems } from './useMonitoringChartMenuItems';

type MonitoringChartMenuProps = {
  opened: boolean;
  position: { x: number; y: number; clientX: number; clientY: number };
  onClose?: () => void;
} & MonitoringChartMenuItemHandlerProps;

const MENU_OFFSET = 70;
export const MonitoringChartMenu: React.FC<MonitoringChartMenuProps> = ({ opened, position, onClose, ...rest }) => {
  const MENU_WIDTH = 210;
  const {
    resourceState: { resource },
  } = useResourceContext();
  const isLLMResource = resource?.category === AssetCategory.Llm;
  const showLLMTraces = isLLMResource;

  const getXPosition = () => {
    const limit = window.innerWidth - MENU_WIDTH - MENU_OFFSET;
    const difference = (position?.clientX ?? 0) - limit;
    if ((position?.clientX ?? 0) > limit) return position.x - difference;
    return position.x;
  };

  const getYPosition = () => {
    const limit = window.innerHeight - 250 - MENU_OFFSET;
    const difference = (position?.clientY ?? 0) - limit;
    if ((position?.clientY ?? 0) > limit) return position.y - difference;
    return position.y;
  };

  const {
    baselineComparison,
    openInProfileView,
    unhelpfulAnomalyToggle,
    shareAnomaly,
    correlatedAnomalies,
    viewLLMTraces,
    viewInsightsForBatch,
  } = useMonitoringChartMenuItems(rest);

  return (
    <WhyLabsContextMenu
      opened={opened}
      width={MENU_WIDTH}
      onClose={onClose}
      items={[
        openInProfileView,
        baselineComparison,
        correlatedAnomalies,
        ...(isLLMResource ? [viewInsightsForBatch] : []),
        ...(showLLMTraces ? [viewLLMTraces] : []),
        shareAnomaly,
        unhelpfulAnomalyToggle,
      ]}
      styles={{
        dropdown: {
          position: 'absolute',
          top: `${getYPosition()}px !important`,
          left: `${getXPosition()}px !important`,
        },
      }}
    />
  );
};
