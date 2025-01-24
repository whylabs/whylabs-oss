import { WhyLabsText } from 'components/design-system';
import useCustomMonitorManagerCSS from '../useCustomMonitorManagerCSS';

interface ReadModeMonitorManagerProps {
  label: string;
  text: string;
}

export default function ReadModeMonitorManager({ label, text }: ReadModeMonitorManagerProps): JSX.Element {
  const { classes: styles } = useCustomMonitorManagerCSS();
  return (
    <div>
      <WhyLabsText className={styles.readModeLabel}>{label}</WhyLabsText>
      <WhyLabsText className={styles.columnCompleteStateComponent}>{text}</WhyLabsText>
    </div>
  );
}
