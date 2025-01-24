import { useRef, useEffect } from 'react';
import { WhyLabsText } from 'components/design-system';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import { ColumnCardContentProps } from '../../phaseCard';
import ReadModeMonitorManager from '../../ReadModeMonitorManager';

export default function InvalidThirdPhaseCard({
  setContentHeight,
  isPhaseActive,
}: ColumnCardContentProps): JSX.Element {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive]);

  if (!isPhaseActive) return <ReadModeMonitorManager label="Baseline" text="Static threshold" />;

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText inherit className={styles.columnCardTitle}>
        Static threshold selected
      </WhyLabsText>
      <WhyLabsText inherit className={styles.columnCardText}>
        Cannot configure baseline while static threshold is set
      </WhyLabsText>
    </div>
  );
}
