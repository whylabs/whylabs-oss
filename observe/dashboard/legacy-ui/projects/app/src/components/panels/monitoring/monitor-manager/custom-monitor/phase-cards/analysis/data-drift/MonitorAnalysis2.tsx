import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { RadioGroup, FormControlLabel } from '@material-ui/core';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import NewCustomNumberInput from 'components/form-fields/NewCustomNumberInput';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { tooltips } from 'strings/tooltips';
import { WhyLabsText } from 'components/design-system';
import { ColumnCardContentProps } from '../../phaseCard';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import { DiscreteTypeOption, discreteTypeOptions } from '../../../CustomMonitorTypes';
import RadioWrap from '../../../RadioWrap';

// phase II card I
const MonitorAnalysis = ({ setContentHeight, isPhaseActive, editMode }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ discreteType, driftThreshold }, setCustomMonitor] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive]);

  if (!isPhaseActive)
    return (
      <WhyLabsText inherit className={styles.columnCompleteStateComponent}>
        {discreteType}
      </WhyLabsText>
    );

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText inherit className={styles.columnCardText}>
        What type of features should be analyzed for drift detection?
      </WhyLabsText>
      <RadioGroup
        value={discreteType}
        onChange={(element) => {
          const { value } = element.target;
          setCustomMonitor((prevState) => ({
            ...prevState,
            discreteType: value as DiscreteTypeOption,
            metric: discreteTypeOptions.find((o) => o.value === value)!.correlatedMetric,
          }));
        }}
      >
        {discreteTypeOptions.map((option) => (
          <RadioWrap key={`${option.value}`} disabled={editMode} tooltip={tooltips.edit_mode_config_disabled}>
            <FormControlLabel
              disabled={editMode}
              value={option.value}
              label={
                <span>
                  <b>{option.label}</b> features
                </span>
              }
              className={styles.cardRadioControl}
              control={<WhyRadio />}
            />
          </RadioWrap>
        ))}
      </RadioGroup>
      <NewCustomNumberInput
        id="driftThresholdInput"
        value={driftThreshold}
        onChange={(newValue: number | null) => {
          if (newValue !== null)
            setCustomMonitor((prevState) => ({
              ...prevState,
              driftThreshold: newValue,
            }));
        }}
        label="Hellinger distance"
        placeholder="Number"
        min={0}
        max={1}
        required
        step="any"
      />
    </div>
  );
};

export default MonitorAnalysis;
