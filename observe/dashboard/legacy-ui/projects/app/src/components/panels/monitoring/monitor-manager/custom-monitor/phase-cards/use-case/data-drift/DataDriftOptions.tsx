import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { RadioGroup, FormControlLabel } from '@material-ui/core';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { tooltips } from 'strings/tooltips';
import { WhyLabsTooltip } from 'components/design-system';
import { ColumnCardContentProps } from '../../phaseCard';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import { DataDriftOption, dataDriftOptions } from '../../../CustomMonitorTypes';
import RadioWrap from '../../../RadioWrap';
import ReadModeMonitorManager from '../../ReadModeMonitorManager';

// phase I card II
const DataDriftOptions = ({ setContentHeight, isPhaseActive, editMode }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ driftOption, featuresQueryData: data }, setCustomMonitor] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);

  const inputDiscreteCount = data?.model?.features.filter((input) => input.schema?.isDiscrete).length ?? 0;
  const inputNonDiscreteCount = data?.model?.features.filter((input) => !input.schema?.isDiscrete).length ?? 0;
  const outputDiscreteCount = data?.model?.outputs.filter((output) => output.schema?.isDiscrete).length ?? 0;
  const outputNonDiscreteCount = data?.model?.outputs.filter((output) => !output.schema?.isDiscrete).length ?? 0;

  const shouldDisable = (value: DataDriftOption) => {
    if (['input', 'both'].includes(value) && inputDiscreteCount === 0 && inputNonDiscreteCount === 0) {
      return true;
    }
    if (['output', 'both'].includes(value) && outputDiscreteCount === 0 && outputNonDiscreteCount === 0) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive]);

  if (!isPhaseActive)
    return (
      <ReadModeMonitorManager
        label="Data group"
        text={dataDriftOptions.find((o) => o.value === driftOption)?.label ?? ''}
      />
    );

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <p className={styles.listTitle}>Group:</p>
      <RadioGroup
        value={driftOption}
        onChange={(element) => {
          const { value } = element.target;
          setCustomMonitor((prevState) => ({
            ...prevState,
            driftOption: value as DataDriftOption,
          }));
        }}
      >
        {dataDriftOptions.map((option, i) => (
          <RadioWrap key={`${option.value}`} disabled={editMode} tooltip={tooltips.edit_mode_config_disabled}>
            <WhyLabsTooltip label={shouldDisable(option.value) ? tooltips.config_feature_type_disabled : ''}>
              <FormControlLabel
                disabled={editMode || shouldDisable(option.value)}
                value={option.value}
                label={option.label}
                className={i < dataDriftOptions.length - 1 ? styles.cardRadioControlWithTooltip : ''}
                classes={{
                  root: styles.cardRadioRoot,
                  label: styles.cardRadioLabel,
                }}
                control={<WhyRadio />}
              />
            </WhyLabsTooltip>
          </RadioWrap>
        ))}
      </RadioGroup>
    </div>
  );
};

export default DataDriftOptions;
