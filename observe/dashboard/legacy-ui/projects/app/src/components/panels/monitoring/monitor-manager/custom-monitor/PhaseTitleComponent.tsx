import { IconCheck } from '@tabler/icons';
import useCustomMonitorManagerCSS from './useCustomMonitorManagerCSS';

const PhaseTitleComponent = ({
  phaseTitle,
  phaseIndex,
  activePhaseIndex,
  isLastPhase,
  editMode,
}: {
  phaseTitle: string;
  phaseIndex: number;
  activePhaseIndex: number[];
  isLastPhase: boolean;
  editMode: boolean;
}): JSX.Element => {
  const { classes: styles, cx } = useCustomMonitorManagerCSS();

  const isPhaseActive = activePhaseIndex[0] === phaseIndex && !editMode;
  const isPhaseInactive = activePhaseIndex[0] < phaseIndex && !editMode;

  function getBulletIcon() {
    if (editMode)
      return (
        <div className={cx(styles.bullet)}>
          <IconCheck />
        </div>
      );

    return (
      <div
        className={cx(styles.bullet, isPhaseActive && styles.bulletActive, isPhaseInactive && styles.bulletInactive)}
      >
        <IconCheck />
      </div>
    );
  }

  return (
    <div
      className={cx(
        styles.column1,
        isLastPhase && styles.column1Last,
        isPhaseActive && styles.column1Active,
        isPhaseInactive && styles.column1Inactive,
      )}
    >
      <div
        className={cx(
          styles.column1Content,
          isPhaseActive && styles.column1ContentActive,
          isPhaseInactive && styles.column1ContentInactive,
        )}
      >
        {`${phaseIndex + 1}. ${phaseTitle}`}
        {getBulletIcon()}
      </div>
    </div>
  );
};

export default PhaseTitleComponent;
