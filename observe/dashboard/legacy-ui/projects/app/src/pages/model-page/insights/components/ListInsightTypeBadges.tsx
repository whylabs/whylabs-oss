/* eslint-disable jsx-a11y/no-static-element-interactions */

import { createStyles } from '@mantine/core';
import { InsightType } from 'components/controls/table/profiles-table/insights';
import { InsightTypeBadge } from './InsightTypeBadge';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
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

type InsightTypeBadgesProps = {
  onClick?: (type: InsightType) => void;
  onClose?: (type: InsightType) => void;
  tags: InsightTag[];
};

export const ListInsightTypeBadges = ({ onClick, onClose, tags }: InsightTypeBadgesProps): JSX.Element | null => {
  const { classes } = useStyles();

  if (!tags.length) return null;

  const handleOnClickTag = (tag: InsightTag) => () => {
    if (!onClick) return;

    // Prevent the click event from propagating to the parent element onClick
    onClick(tag.type);
  };

  const handleOnCloseTag = (tag: InsightTag) => () => {
    if (!onClose) return;

    // Prevent the click event from propagating to the parent element onClose
    onClose(tag.type);
  };

  return (
    <div
      className={classes.root}
      onKeyDown={(e) => {
        e.stopPropagation();
      }}
    >
      {tags.map((tag) => (
        <InsightTypeBadge
          key={tag.type}
          onClick={onClick ? handleOnClickTag(tag) : undefined}
          onClose={onClose ? handleOnCloseTag(tag) : undefined}
          tag={tag}
        />
      ))}
    </div>
  );
};
