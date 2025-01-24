import { createStyles } from '@mantine/core';
import { WhyLabsBadge } from 'components/design-system';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { Colors } from '@whylabs/observatory-lib';

const useStyles = createStyles((_, badgeMaxWidth: number | undefined) => ({
  badge: {
    borderRadius: 4,
    fontSize: 13,
    height: 24,
    letterSpacing: '-0.13px',
    lineHeight: 1.07,
    maxWidth: badgeMaxWidth,
  },
  tagContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: {
    fontFamily: 'Inconsolata',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  button: {
    width: 'auto',
  },
  nonShrinkingTag: {
    flexShrink: 0,
  },
}));

type TagProps = {
  count: number;
  onClick?: () => void;
  maxWidth?: number;
};

export function MoreTag({ onClick, count, maxWidth }: TagProps): JSX.Element {
  const { classes } = useStyles(maxWidth);

  const renderTag = () => {
    const label = `+ ${count} more`;
    return (
      <WhyLabsBadge
        key={label}
        className={classes.badge}
        customColor={Colors.secondaryLight1000}
        customBackground={Colors.secondaryLight100}
        radius="xl"
        showToolTip
      >
        <div className={classes.tagContent}>
          <span className={classes.badgeText}>{label}</span>
        </div>
      </WhyLabsBadge>
    );
  };

  const handleClick = () => () => {
    onClick?.();
  };

  return (
    <InvisibleButton className={classes.button} onClick={handleClick()}>
      {renderTag()}
    </InvisibleButton>
  );
}
