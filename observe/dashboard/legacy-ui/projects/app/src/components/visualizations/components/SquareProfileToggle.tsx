import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsButton } from 'components/design-system';
import { TooltipWrapper } from 'components/design-system/tooltip/TooltipWrapper';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons';

const useStyles = createStyles({
  button: {
    height: '30px',
    width: '30px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.brandSecondary100,
    '&:hover': {
      backgroundColor: Colors.brandSecondary200,
    },
    borderRadius: '3px',
    color: Colors.brandSecondary800,
    '&:disabled': {
      color: Colors.brandSecondary400,
      backgroundColor: Colors.brandSecondary50,
    },
  },
  buttonContainer: {
    display: 'flex',
    gap: '2px',
    height: '30px',
    width: '62px',
  },
  icon: {
    height: '16px',
    color: Colors.brandSecondary800,
    fill: Colors.brandSecondary800,
  },
  disabledIcon: {
    height: '16px',
    color: Colors.brandSecondary400,
    fill: Colors.brandSecondary400,
  },
});

interface SquareProfileToggleProps {
  bumpProfile: (increase: boolean) => void;
  hasNextProfile: () => boolean;
  hasPreviousProfile: () => boolean;
}

export function SquareProfileToggle({
  bumpProfile,
  hasNextProfile,
  hasPreviousProfile,
}: SquareProfileToggleProps): JSX.Element {
  const { classes } = useStyles();
  const previousIsDisabled = !hasPreviousProfile();
  const nextIsDisabled = !hasNextProfile();

  const previousIsEnabledLabel = 'Switch to previous profile';
  const previousIsDisabledLabel = 'No previous profile available in selected range';
  const nextIsDisabledLabel = 'No next profile available in selected range';
  const nextIsEnabledLabel = 'Switch to next profile';
  return (
    <div className={classes.buttonContainer}>
      <TooltipWrapper
        displayTooltip
        label={previousIsDisabled ? previousIsDisabledLabel : previousIsEnabledLabel}
        position="top"
      >
        <WhyLabsButton
          variant="filled"
          className={classes.button}
          disabled={previousIsDisabled}
          onClick={() => bumpProfile(false)}
        >
          <IconChevronLeft size={16} />
        </WhyLabsButton>
      </TooltipWrapper>
      <TooltipWrapper displayTooltip label={nextIsDisabled ? nextIsDisabledLabel : nextIsEnabledLabel} position="top">
        <WhyLabsButton
          variant="filled"
          className={classes.button}
          disabled={nextIsDisabled}
          onClick={() => bumpProfile(true)}
        >
          <IconChevronRight size={16} />
        </WhyLabsButton>
      </TooltipWrapper>
    </div>
  );
}
