import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsButton } from 'components/design-system';
import { TooltipWrapper } from 'components/design-system/tooltip/TooltipWrapper';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons';
import { useContext } from 'react';
import { CardDataContext } from 'components/cards/why-card/CardDataContext';

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

export const BatchProfileToggle: React.FC = () => {
  const { classes } = useStyles();
  const { cardDataState, goToNext, goToPrevious } = useContext(CardDataContext);

  const previousIsDisabled = !cardDataState.hasPrevious;
  const nextIsDisabled = !cardDataState.hasNext;
  const previousIsDisabledLabel = 'No previous profile available';
  const nextIsDisabledLabel = 'No next profile available';
  return (
    <div className={classes.buttonContainer}>
      <TooltipWrapper displayTooltip={previousIsDisabled} label={previousIsDisabledLabel} position="top">
        <WhyLabsButton variant="filled" className={classes.button} disabled={previousIsDisabled} onClick={goToPrevious}>
          <IconChevronLeft size={16} />
        </WhyLabsButton>
      </TooltipWrapper>
      <TooltipWrapper displayTooltip={nextIsDisabled} label={nextIsDisabledLabel} position="top">
        <WhyLabsButton variant="filled" className={classes.button} disabled={nextIsDisabled} onClick={goToNext}>
          <IconChevronRight size={16} />
        </WhyLabsButton>
      </TooltipWrapper>
    </div>
  );
};
