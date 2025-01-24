import { useRef, useEffect, useCallback } from 'react';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { useRecoilState } from 'recoil';
import { utcFormat } from 'd3-time-format';
import calendarIcon from 'ui/calendar-icon.svg';
import { TEMP_END_DATE_RANGE, TEMP_RANGE_PRESET, TEMP_START_DATE_RANGE } from 'types/navTags';
import { DateTimeRange } from 'hooks/useCustomMonitor/monitorUtils';
import { WhyLabsSuperDatePicker } from 'components/super-date-picker/WhyLabsSuperDatePicker';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { WhyLabsText } from 'components/design-system';
import { TimePeriod } from 'generated/graphql';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { ColumnCardContentProps } from '../../phaseCard';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import ReadModeMonitorManager from '../../ReadModeMonitorManager';

const formattingString = '%m/%d/%y %I:%M %p';
const formatRange = (start: Date, end: Date) =>
  `${utcFormat(formattingString)(start)} - ${utcFormat(formattingString)(end)} UTC`;

const TimeRangeComponent = ({
  setContentHeight,
  isPhaseActive,
  setHasChanged,
  setWidthSpan,
}: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const ref = useRef<HTMLDivElement>(null);
  const [{ baselineRange }, setRecoilState] = useRecoilState(customMonitorAtom);
  const { start, end } = baselineRange;
  const {
    resourceState: { resource },
    loading: resourceContextLoading,
  } = useResourceContext();
  const { dateRange, isUsingFallbackRange, setDatePickerRange, loading } = useSuperGlobalDateRange({
    startDateSearchParamKey: TEMP_START_DATE_RANGE,
    endDateSearchParamKey: TEMP_END_DATE_RANGE,
    dynamicPresetSearchParamKey: TEMP_RANGE_PRESET,
  });

  const { from: startTimestamp, to: endTimestamp } = openEndDateRangeTransformer(dateRange);

  const isHourly = resource?.batchFrequency === TimePeriod.Pt1H;
  (() => {
    if (!isPhaseActive || !isHourly) {
      setWidthSpan(2);
      return;
    }
    setWidthSpan(3);
  })();

  useEffect(() => {
    if (start && end && isUsingFallbackRange) {
      setDatePickerRange({
        from: start.getTime(),
        to: end.getTime(),
      });
    }
  }, [end, isUsingFallbackRange, setDatePickerRange, start]);
  const setBaselineRange = useCallback(
    (newValue: DateTimeRange) => {
      setRecoilState((prevState) => ({
        ...prevState,
        baselineRange: { start: newValue.start, end: newValue.end },
      }));
    },
    [setRecoilState],
  );

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, isPhaseActive]);

  const onChangeRange = (newRange: DateTimeRange) => {
    setBaselineRange(newRange);
    setHasChanged(true);
  };
  if (!isPhaseActive) {
    const text = loading ? 'Loading...' : formatRange(new Date(startTimestamp ?? 0), new Date(endTimestamp ?? 0));
    return <ReadModeMonitorManager label="Reference date range" text={text} />;
  }

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <div className={styles.columnCardFlex}>
        <div className={styles.columnCardContent}>
          <WhyLabsText inherit className={styles.columnCardTitle}>
            Reference date range
          </WhyLabsText>
          <WhyLabsText inherit className={styles.columnCardText}>
            Select a custom date range to be used as a reference.
          </WhyLabsText>
          <WhyLabsSuperDatePicker
            startDateSearchParamKey={TEMP_START_DATE_RANGE}
            endDateSearchParamKey={TEMP_END_DATE_RANGE}
            dynamicPresetSearchParamKey={TEMP_RANGE_PRESET}
            timePeriod={resource?.batchFrequency}
            withinPortal
            hideDefaultPresetsList
            loading={resourceContextLoading}
            hideLabel
            onApply={onChangeRange}
          />
        </div>
        <div className={styles.columnCardGraphWrap}>
          <img src={calendarIcon} alt="calendar icon" style={{ margin: 15 }} />
        </div>
      </div>
    </div>
  );
};

export default TimeRangeComponent;
