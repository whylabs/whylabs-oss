import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { FormControlLabel, RadioGroup } from '@material-ui/core';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { tooltips } from 'strings/tooltips';
import { useResourcePerformanceMetrics } from 'hooks/useResourcePerformanceMetrics';
import { ColumnCardContentProps } from '../phaseCard';
import useCustomMonitorManagerCSS from '../../useCustomMonitorManagerCSS';
import {
  DataDriftOption,
  discreteTypeOptions,
  MetricTypeInUse,
  UseCaseOption,
  useCaseOptions,
} from '../../CustomMonitorTypes';
import RadioWrap from '../../RadioWrap';
import ReadModeMonitorManager from '../ReadModeMonitorManager';

// phase I card I
const MonitorUseCase = ({ setContentHeight, isPhaseActive, editMode }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ useCase, discreteType }, setCustomMonitor] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);
  const allPerfMetrics = useResourcePerformanceMetrics();
  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive]);

  if (!isPhaseActive) return <ReadModeMonitorManager label="Monitor type" text={useCase} />;

  const hidePerfMetrics = allPerfMetrics.loading || !allPerfMetrics.metrics?.length;

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <p className={styles.listTitle}>Monitor type</p>
      <RadioGroup
        value={useCase}
        onChange={(element) => {
          const newValue = element.target.value as UseCaseOption;
          setCustomMonitor((prevState) => {
            const spreadObj: {
              metric?: MetricTypeInUse;
              driftOption?: DataDriftOption;
              discreteType?: typeof discreteTypeOptions[number]['value'];
            } = {};

            if (prevState.useCase !== newValue) {
              if (newValue === 'Model performance') {
                spreadObj.metric = 'classification.accuracy';
              }
              if (newValue === 'Drift') {
                spreadObj.metric = 'frequent_items';
                spreadObj.driftOption = 'input';
                if (discreteType === 'both') {
                  spreadObj.discreteType = 'discrete';
                }
              }
              if (newValue === 'Data quality') {
                spreadObj.metric = 'count_null_ratio';
              }
            }
            return {
              ...prevState,
              useCase: newValue,
              ...spreadObj,
              metricMetadata: undefined,
            };
          });
        }}
      >
        {useCaseOptions.map(({ value, disabled }) => {
          if (hidePerfMetrics && value === 'Model performance') {
            return null;
          }
          return (
            <RadioWrap
              disabled={disabled || editMode}
              key={`${value}`}
              tooltip={editMode ? tooltips.edit_mode_config_disabled : tooltips.config_coming_soon}
            >
              <FormControlLabel
                value={value}
                label={value}
                disabled={disabled || editMode}
                className={styles.cardRadioControl}
                classes={{
                  root: styles.cardRadioRoot,
                  label: styles.cardRadioLabel,
                }}
                control={<WhyRadio />}
              />
            </RadioWrap>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default MonitorUseCase;
