import { useCallback, useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { datasetMetricToText } from 'adapters/monitor-adapters';
import { SelectItem, Skeleton } from '@mantine/core';
import { FormControlLabel, RadioGroup } from '@material-ui/core';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { MetricSource } from 'generated/graphql';
import { CustomMonitorState } from 'hooks/useCustomMonitor/monitorUtils';
import { WhyLabsSelect } from 'components/design-system';
import { useResourcePerformanceMetrics } from 'hooks/useResourcePerformanceMetrics';
import { ColumnCardContentProps } from '../../phaseCard';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import ReadModeMonitorManager from '../../ReadModeMonitorManager';
import { whylabsPerformanceMetricsMapper } from '../../../CustomMonitorTypes';
import RadioWrap from '../../../RadioWrap';

// phase I card II
const ModelPerformanceOptions = ({
  setContentHeight,
  isPhaseActive,
  editMode,
}: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ metric, metricMetadata }, setCustomMonitor] = useRecoilState(customMonitorAtom);
  const { loading, metrics: allMetrics } = useResourcePerformanceMetrics();
  const selectedMetricValue = `${metricMetadata ? MetricSource.UserDefined : MetricSource.Whylabs}#${metric}`;
  const ref = useRef<HTMLDivElement>(null);
  const handleMetricChange = useCallback(
    (value: string) => {
      const [source, metricName] = value.split('#');
      const updateState: Partial<CustomMonitorState> = {};
      if (source === MetricSource.UserDefined) {
        const foundMetric = allMetrics?.find(({ name }) => name === metricName);
        updateState.metric = foundMetric?.name ?? '';
        updateState.metricMetadata = foundMetric?.metadata ?? undefined;
      } else if (source === MetricSource.Whylabs) {
        updateState.metric = metricName;
        updateState.metricMetadata = undefined;
      }
      setCustomMonitor((prevState) => ({
        ...prevState,
        ...updateState,
      }));
    },
    [allMetrics, setCustomMonitor],
  );

  useEffect(() => {
    if (ref?.current) {
      setContentHeight(ref.current?.clientHeight || 0);
    }
    if (editMode && metricMetadata && !metricMetadata?.queryDefinition && metric && allMetrics?.length) {
      handleMetricChange(`${MetricSource.UserDefined}#${metric}`);
    }
  }, [
    ref.current?.clientHeight,
    setContentHeight,
    isPhaseActive,
    allMetrics,
    editMode,
    metricMetadata,
    metric,
    handleMetricChange,
  ]);
  if (!isPhaseActive) return <ReadModeMonitorManager label="Metric" text={datasetMetricToText(metric)} />;

  const renderLoading = () => {
    return (
      <>
        <p className={styles.listTitle}>Metric</p>
        <Skeleton width="100%" height={60} />
      </>
    );
  };

  const renderMetricOptions = () => {
    const customPerfMetrics = allMetrics?.filter(({ metadata }) => metadata?.source === MetricSource.UserDefined);
    return (
      <>
        {!customPerfMetrics?.length ? (
          <>
            <p className={styles.listTitle}>Metric</p>
            <RadioGroup value={selectedMetricValue} onChange={({ target: { value } }) => handleMetricChange(value)}>
              {generateMetricList()}
            </RadioGroup>
          </>
        ) : (
          renderSelectOptions()
        )}
      </>
    );
  };

  const renderSelectOptions = () => {
    const selectData: SelectItem[] =
      allMetrics?.map(({ name, metadata }) => {
        const whylabsMetric = metadata?.source === MetricSource.Whylabs;
        const metricName = metadata?.queryDefinition?.metric;
        const mappedMetric = metricName && whylabsPerformanceMetricsMapper.get(metricName);
        return {
          label: mappedMetric?.label ?? name,
          value: `${metadata?.source ?? 'UNKNOWN'}#${mappedMetric?.value ?? name}`,
          group: whylabsMetric ? 'Standard metrics' : 'Custom metrics',
        };
      }) ?? [];
    return (
      <div className={styles.metricsSelectWrapper}>
        <WhyLabsSelect
          value={selectedMetricValue}
          withinPortal
          disabled={editMode}
          label="Metric"
          data={selectData}
          onChange={handleMetricChange}
        />
      </div>
    );
  };

  const generateMetricList = () => {
    return allMetrics
      ?.sort(
        (a, b) =>
          Number(b.metadata?.source === MetricSource.Whylabs) - Number(a.metadata?.source === MetricSource.Whylabs) ||
          a.name.localeCompare(b.name),
      )
      .map((option) => {
        const { metadata, name } = option;
        const metricName = metadata?.queryDefinition?.metric;
        const mappedOption = metricName && whylabsPerformanceMetricsMapper.get(metricName);
        const perfMetric = metadata?.source === MetricSource.UserDefined;
        const tooltip = perfMetric ? `Your custom metric '${name}'` : mappedOption?.tooltip;
        if ((!perfMetric && !mappedOption) || !metadata?.source) return null; // avoid render non-mapped WhyLabs metrics
        return (
          <RadioWrap
            disabled={editMode}
            key={`${option.name}--${option.metadata?.source ?? 'unknown-source'}`}
            tooltip={editMode ? 'To change this value, create a new monitor' : undefined}
          >
            <div style={{ marginBottom: !tooltip ? '10px' : '0px' }}>
              <FormControlLabel
                disabled={editMode}
                value={`${metadata.source}#${perfMetric ? name : mappedOption?.value}`}
                label={perfMetric ? option.name : mappedOption?.label}
                className={styles.cardRadioControl}
                classes={{
                  root: styles.cardRadioRoot,
                  label: styles.cardRadioLabel,
                }}
                control={<WhyRadio size="medium" />}
              />
              {tooltip && <HtmlTooltip tooltipContent={tooltip ?? ''} />}
            </div>
          </RadioWrap>
        );
      });
  };

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      {loading ? renderLoading() : renderMetricOptions()}
    </div>
  );
};

export default ModelPerformanceOptions;
