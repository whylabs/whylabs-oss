import { tooltips } from 'strings/tooltips';
import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { WhyLabsActionIcon, WhyLabsTooltip } from 'components/design-system';
import { IconAlertCircle, IconChartCandle, IconTrash, IconCodeDots } from '@tabler/icons';
import useCommonCellStyles from './CommonStyles';

const useStyles = createStyles({
  root: {
    display: 'flex',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    gap: '5px',
  },
  tooltip: {
    fontSize: '12px',
  },
});

interface MonitorManagerActionCellProps {
  showControls: boolean;
  onDeleteActionClick: () => void;
  onChartActionClick: () => void;
  onEditActionClick: () => void;
  onJsonActionClick: () => void;
  editDisabled: boolean;
  unsupportedConfig: boolean;
  showViewMonitor: boolean;
}

function getEditToolTip(editDisabled: boolean, unsupportedConfig: boolean) {
  if (editDisabled) {
    return tooltips.monitor_action_edit_disabled;
  }
  if (unsupportedConfig) {
    return tooltips.monitor_action_edit_not_supported;
  }
  return tooltips.monitor_action_edit;
}

export default function MonitorManagerActionCell({
  showControls,
  onChartActionClick,
  onDeleteActionClick,
  onEditActionClick,
  onJsonActionClick,
  editDisabled,
  unsupportedConfig,
  showViewMonitor,
}: MonitorManagerActionCellProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: cellStyles } = useCommonCellStyles();

  return (
    <div className={cx(styles.root, cellStyles.cellIndention)}>
      {showControls && (
        <>
          <WhyLabsTooltip label={tooltips.monitor_action_view}>
            <WhyLabsActionIcon
              label={tooltips.monitor_action_view}
              onClick={onChartActionClick}
              disabled={!showViewMonitor}
              variant="subtle"
            >
              <IconAlertCircle size={20} color={Colors.secondaryLight1000} />
            </WhyLabsActionIcon>
          </WhyLabsTooltip>
          <WhyLabsTooltip label={getEditToolTip(editDisabled, unsupportedConfig)}>
            <WhyLabsActionIcon
              label={getEditToolTip(editDisabled, unsupportedConfig)}
              onClick={onEditActionClick}
              disabled={editDisabled || unsupportedConfig}
              variant="subtle"
            >
              <IconChartCandle size={20} color={Colors.secondaryLight1000} />
            </WhyLabsActionIcon>
          </WhyLabsTooltip>
          <WhyLabsTooltip label={tooltips.monitor_action_json}>
            <WhyLabsActionIcon label={tooltips.monitor_action_json} onClick={onJsonActionClick} variant="subtle">
              <IconCodeDots size={20} color={Colors.secondaryLight1000} />
            </WhyLabsActionIcon>
          </WhyLabsTooltip>
          <WhyLabsTooltip
            label={editDisabled ? tooltips.monitor_action_delete_disabled : tooltips.monitor_action_delete}
          >
            <WhyLabsActionIcon
              label={editDisabled ? tooltips.monitor_action_delete_disabled : tooltips.monitor_action_delete}
              onClick={onDeleteActionClick}
              disabled={editDisabled}
              variant="subtle"
            >
              <IconTrash size={20} color={Colors.secondaryLight1000} />
            </WhyLabsActionIcon>
          </WhyLabsTooltip>
        </>
      )}
    </div>
  );
}
