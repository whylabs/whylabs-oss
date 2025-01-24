import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { RadioGroup, FormControlLabel } from '@material-ui/core';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { capitalize, datasetMetricToText } from 'adapters/monitor-adapters';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { tooltips } from 'strings/tooltips';
import { WhyLabsText } from 'components/design-system';
import { ColumnCardContentProps } from '../../phaseCard';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import { ChangeTypeOption, changeTypeOptions } from '../../../CustomMonitorTypes';
import RadioWrap from '../../../RadioWrap';
import ReadModeMonitorManager from '../../ReadModeMonitorManager';

// phase II card I
const MonitorAnalysis1 = ({ setContentHeight, isPhaseActive, editMode }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ metric, modelPerformanceConfig }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive]);

  if (!isPhaseActive)
    return <ReadModeMonitorManager label="Threshold type" text={capitalize(modelPerformanceConfig)} />;

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText inherit className={styles.columnCardText}>
        What type of analysis should be run against <b>model {datasetMetricToText(metric)}?</b>
      </WhyLabsText>
      <RadioGroup
        value={modelPerformanceConfig}
        onChange={(element) => {
          const { value } = element.target;
          setRecoilState((prevState) => ({
            ...prevState,
            modelPerformanceConfig: value as ChangeTypeOption,
          }));
        }}
      >
        {changeTypeOptions.map(({ label: option }) => (
          <RadioWrap key={`${option}`} disabled={editMode} tooltip={tooltips.edit_mode_config_disabled}>
            <FormControlLabel
              disabled={editMode}
              value={option}
              label={`${option[0].toUpperCase()}${option.slice(1)}`}
              className={styles.cardRadioControl}
              control={<WhyRadio />}
            />
          </RadioWrap>
        ))}
      </RadioGroup>
    </div>
  );
};

export default MonitorAnalysis1;
