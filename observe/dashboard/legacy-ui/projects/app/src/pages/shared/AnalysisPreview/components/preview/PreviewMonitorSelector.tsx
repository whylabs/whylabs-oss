import { createStyles } from '@mantine/core';
import { WhyLabsSelect, WhyLabsText } from 'components/design-system';
import { Colors } from '@whylabs/observatory-lib';
import { useContext } from 'react';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { formatUtcDateString } from 'utils/dateUtils';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { Analyzer, Monitor } from 'generated/monitor-schema';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { useMonitorSelectTranslator } from '../../utils';

const useStyles = createStyles({
  root: {
    width: '100%',
  },
  title: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.14,
  },
  description: {
    color: Colors.gray600,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 1.55,
    fontWeight: 400,
  },
  checkboxLabel: {
    color: Colors.night1,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.55,
    marginLeft: 3,
  },
  selectWrapper: {
    width: '100%',
    marginTop: 10,
  },
  editRangeCTA: {
    color: Colors.linkColor,
    width: 'fit-content',
    fontFamily: 'Asap, sans-serif',
  },
});
type MonitorSelectorSectionProps = {
  selectedMonitor?: string;
  setSelectedMonitor: (monitors?: Monitor[], analyzers?: Analyzer[]) => void;
  resourceId: string;
  columnId: string;
  segment?: ParsedSegment;
  disabled?: boolean;
};
export const PreviewMonitorSelector = ({
  selectedMonitor,
  setSelectedMonitor,
  resourceId,
  columnId,
  segment,
  disabled,
}: MonitorSelectorSectionProps): React.ReactElement => {
  const { dateRange, openDatePicker } = useSuperGlobalDateRange();
  const [{ analysisPreview }, analysisDispatch] = useContext(AnalysisContext);
  const { classes } = useStyles();

  const { monitorsMap, selectItems, loading } = useMonitorSelectTranslator(resourceId, columnId, segment);

  const editRange = () => {
    analysisDispatch({ analysisPreview: { ...analysisPreview, drawerOpened: false } });
    openDatePicker();
  };

  const onChange = (monitorId: string) => {
    const foundMonitorConfig = monitorsMap.get(monitorId);
    const monitorConfig = foundMonitorConfig && [foundMonitorConfig.monitorConfig];
    const analyzerConfig = foundMonitorConfig && [foundMonitorConfig.analyzerConfig];
    setSelectedMonitor(monitorConfig, analyzerConfig);
  };

  return (
    <div className={classes.root}>
      <WhyLabsText className={classes.title}>Select a monitor to preview</WhyLabsText>
      <WhyLabsText className={classes.description}>
        The preview of analysis results will be over the applied time range: {formatUtcDateString(dateRange.from)} to{' '}
        {formatUtcDateString(dateRange.to)}. To edit the range{' '}
        <InvisibleButton className={classes.editRangeCTA} onClick={editRange}>
          click here
        </InvisibleButton>
        .
      </WhyLabsText>
      <div className={classes.selectWrapper}>
        <WhyLabsSelect
          label="select monitor"
          loading={loading}
          hideLabel
          data={selectItems}
          placeholder="Select"
          onChange={onChange}
          defaultValue={selectedMonitor}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
