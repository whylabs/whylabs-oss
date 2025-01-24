import { createStyles } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';

import WhyLabsActionIcon from '../icon/WhyLabsActionIcon';
import WhyLabsSelect, { WhyLabsSelectProps } from './WhyLabsSelect';

const useStyles = createStyles(() => ({
  root: {
    alignItems: 'flex-end',
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
  },
  buttonsContainer: {
    display: 'flex',
    flexDirection: 'row',

    '& > button': {
      borderColor: Colors.lightGrayBorder,
    },
  },
  previousButton: {
    borderBottomRightRadius: 0,
    borderTopRightRadius: 0,
  },
  nextButton: {
    borderBottomLeftRadius: 0,
    borderTopLeftRadius: 0,
    borderLeft: 'none',
  },
}));

const WhyLabsSelectWithButtons = (props: WhyLabsSelectProps): JSX.Element => {
  const { classes } = useStyles();
  const { data, label, onChange, value } = props;

  const lastIndex = Math.max(data.length - 1, 0);

  const indexOfCurrentValue = data.findIndex((o) => getOptionValue(o) === value);

  const commonButtonProps = {
    disabled: !data.length,
    size: 36,
    variant: 'outline',
  };

  const stringLabel = typeof label === 'string' ? `${label} option` : 'option';

  return (
    <div className={classes.root}>
      <WhyLabsSelect {...props} />
      <div className={classes.buttonsContainer}>
        <WhyLabsActionIcon
          className={classes.previousButton}
          label={`Select previous ${stringLabel}`}
          onClick={handlePreviousOptionClick}
          {...commonButtonProps}
        >
          <IconChevronLeft />
        </WhyLabsActionIcon>
        <WhyLabsActionIcon
          className={classes.nextButton}
          label={`Select next ${stringLabel}`}
          onClick={handleNextOptionClick}
          {...commonButtonProps}
        >
          <IconChevronRight />
        </WhyLabsActionIcon>
      </div>
    </div>
  );

  function handlePreviousOptionClick() {
    if (!onChange) return;

    let previousIndex = indexOfCurrentValue - 1;
    if (previousIndex < 0) previousIndex = lastIndex;

    const previousValue = getOptionValueForIndex(previousIndex);
    if (previousValue) onChange(previousValue);
  }

  function handleNextOptionClick() {
    if (!onChange) return;

    let nextIndex = indexOfCurrentValue + 1;
    if (nextIndex > lastIndex) nextIndex = 0;

    const nextValue = getOptionValueForIndex(nextIndex);
    if (nextValue) onChange(nextValue);
  }

  function getOptionValueForIndex(index: number) {
    const previousOption = data[index];
    if (!previousOption) return null;

    return getOptionValue(previousOption);
  }
};

function getOptionValue(option: WhyLabsSelectProps['data'][0]) {
  if (typeof option === 'string') return option;

  return option.value;
}

export default WhyLabsSelectWithButtons;
