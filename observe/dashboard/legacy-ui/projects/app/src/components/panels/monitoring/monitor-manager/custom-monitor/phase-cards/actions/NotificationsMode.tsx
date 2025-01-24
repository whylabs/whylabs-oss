import { RadioGroup, FormControlLabel } from '@material-ui/core';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { useRecoilState } from 'recoil';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';
import useCustomMonitorManagerCSS from '../../useCustomMonitorManagerCSS';
import { NotificationsModeOption, notificationsModeOptions } from '../../CustomMonitorTypes';

const modeMapper = new Map<string, NotificationsModeOption>([
  ['DIGEST', 'DIGEST'],
  ['EVERY_ANOMALY', 'EVERY_ANOMALY'],
]);
// phase IV card III
const NotificationsMode = (): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const [{ notificationsMode }, setRecoilState] = useRecoilState(customMonitorAtom);

  return (
    <div className={styles.cardFlexColumn}>
      <WhyLabsText className={styles.columnCardTitle}>Message volume</WhyLabsText>
      <WhyLabsText className={styles.columnCardText}>How many messages should be sent?</WhyLabsText>
      <RadioGroup
        value={notificationsMode}
        onChange={(element) => {
          const { value } = element.target;
          setRecoilState((prevState) => ({
            ...prevState,
            notificationsMode: modeMapper.get(value) ?? 'DIGEST',
          }));
        }}
      >
        {notificationsModeOptions.map((option) => (
          <FormControlLabel
            key={`${option.value}`}
            value={option.value}
            label={
              <span>
                {option.label}
                {option.tooltip && <HtmlTooltip tooltipContent={option.tooltip} />}
              </span>
            }
            className={styles.cardRadioControl}
            control={<WhyRadio />}
          />
        ))}
      </RadioGroup>
    </div>
  );
};

export default NotificationsMode;
