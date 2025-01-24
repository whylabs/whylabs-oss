import { useEffect, useRef } from 'react';
import { RadioGroup, FormControlLabel } from '@material-ui/core';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { useRecoilState } from 'recoil';
import { WhyLabsText } from 'components/design-system';
import { ColumnCardContentProps } from '../phaseCard';
import useCustomMonitorManagerCSS from '../../useCustomMonitorManagerCSS';
import { SeverityOption, severityOptions } from '../../CustomMonitorTypes';
import ReadModeMonitorManager from '../ReadModeMonitorManager';

// phase IV card I
const AlertSeverity = ({ setContentHeight, isPhaseActive }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ alertSeverity }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive]);

  if (!isPhaseActive) {
    const completeStateText = severityOptions.find((o) => o.value === alertSeverity)?.label;
    return <ReadModeMonitorManager label="Alert severity" text={completeStateText ?? ''} />;
  }

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText className={styles.columnCardTitle}>Alert severity</WhyLabsText>
      <WhyLabsText className={styles.columnCardText}>
        What alert severity should be associated with the notifications being sent?
      </WhyLabsText>
      <RadioGroup
        value={alertSeverity}
        onChange={(element) => {
          const { value } = element.target;
          setRecoilState((prevState) => ({
            ...prevState,
            alertSeverity: Number(value) as SeverityOption,
          }));
        }}
      >
        {severityOptions.map((option) => (
          <FormControlLabel
            key={`${option.value}`}
            value={option.value}
            label={option.label}
            className={styles.cardRadioControl}
            control={<WhyRadio />}
          />
        ))}
      </RadioGroup>
    </div>
  );
};

export default AlertSeverity;
