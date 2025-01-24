import { createStyles } from '@mantine/core';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { WhyLabsBadge, WhyLabsTooltip } from 'components/design-system';
import { InsightType } from 'components/controls/table/profiles-table/insights';
import { Colors } from '@whylabs/observatory-lib';
import { MouseEvent } from 'react';
import { IconX } from '@tabler/icons';

const useStyles = createStyles(() => ({
  badge: {
    fontSize: 13,

    '&:hover': {
      textDecoration: 'underline',
    },
  },
  badgeText: {
    fontFamily: 'Inconsolata, Asap',
    fontWeight: 600,
  },
  button: {
    width: 'auto',
  },
}));

export type InsightTag = {
  type: InsightType;
  count: number;
};

type InsightTypeBadgeProps = {
  onClick?: () => void;
  onClose?: () => void;
  tag: InsightTag;
};

export const InsightTypeBadge = ({ onClick, onClose, tag }: InsightTypeBadgeProps): JSX.Element => {
  const { classes } = useStyles();

  const handleOnClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!onClick && !onClose) return;

    // Prevent the click event from propagating to the parent element onClick
    event.stopPropagation();
    onClick?.();
    onClose?.();
  };

  const tagCount = (() => {
    if (tag.count > 1) return `(${tag.count})`;

    return null;
  })();

  const tooltipLabel = (() => {
    if (onClick) return 'Click to Filter';
    if (onClose) return 'Click to remove filter';
    return '';
  })();

  return (
    <InvisibleButton className={classes.button} key={tag.type} onClick={handleOnClick}>
      <WhyLabsTooltip label={tooltipLabel}>
        <WhyLabsBadge
          className={classes.badge}
          customBackground={getColor(tag.type)}
          radius="xl"
          rightSection={onClose && <IconX size={14} />}
        >
          <span className={classes.badgeText}>
            {tag.type} {tagCount}
          </span>
        </WhyLabsBadge>
      </WhyLabsTooltip>
    </InvisibleButton>
  );

  function getColor(tagType: InsightType) {
    switch (tagType) {
      case InsightType.HIGH_CARDINALITY:
        return Colors.chartPrimary;
      case InsightType.IMBALANCED:
        return Colors.chartPurple;
      case InsightType.NULL_VALUES:
        return Colors.chartBlue;
      case InsightType.MIXED_DATA_TYPE:
        return Colors.chartAqua;
      case InsightType.LLM_TOXICITY:
        return Colors.green;
      case InsightType.LLM_PATTERNS:
        return Colors.brown;
      case InsightType.LLM_NEGATIVE_SENTIMENT:
        return Colors.red;
      case InsightType.LLM_POSITIVE_SENTIMENT:
        return Colors.pink;
      case InsightType.LLM_REFUSAL:
        return Colors.teal;
      case InsightType.LLM_READING_EASE:
        return Colors.chartOrange;
      case InsightType.LLM_JAILBREAK_SIMILARITY:
        return Colors.blue;
    }
    return Colors.brandSecondary600;
  }
};
