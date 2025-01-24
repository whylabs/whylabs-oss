import { createStyles } from '@mantine/core';
import { IconTag } from '@tabler/icons';
import { WhyLabsBadge } from 'components/design-system';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { CustomTag } from 'generated/graphql';
import { Colors } from '@whylabs/observatory-lib';
import { getCustomTagLabel } from '../../tags/UserDefinedTags';

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
  tag: CustomTag;
  onClick?: (tag: CustomTag) => void;
  maxWidth?: number;
};

export function Tag({ onClick, tag, maxWidth }: TagProps): JSX.Element {
  const { classes } = useStyles(maxWidth);

  const renderTag = ({ color, key, value, backgroundColor }: CustomTag) => {
    const label = getCustomTagLabel({ key, value });
    const hexWithAlpha = `${color ?? Colors.secondaryLight700}1A`;

    const tooltipContent = `${label}${onClick ? '. Click to filter' : ''}`;
    return (
      <WhyLabsBadge
        key={label}
        className={classes.badge}
        customColor={color ?? Colors.secondaryLight700}
        customBackground={backgroundColor || hexWithAlpha}
        radius="xl"
        showToolTip
        overrideTooltip={tooltipContent}
      >
        <div className={classes.tagContent}>
          <IconTag size={14} className={classes.nonShrinkingTag} />
          <span className={classes.badgeText}>{label}</span>
        </div>
      </WhyLabsBadge>
    );
  };

  const handleClick = () => () => {
    onClick?.(tag);
  };

  return (
    <InvisibleButton className={classes.button} onClick={handleClick()}>
      {renderTag(tag)}
    </InvisibleButton>
  );
}
