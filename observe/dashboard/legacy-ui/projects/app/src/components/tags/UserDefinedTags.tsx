import { createStyles, getStylesRef } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { CustomTag } from 'generated/graphql';
import { Colors } from '@whylabs/observatory-lib';
import { IconTag, IconX } from '@tabler/icons';
import { ReactElement } from 'react';
import { WhyLabsBadge } from '../design-system';
import { InvisibleButton } from '../buttons/InvisibleButton';

const DELETE_BUTTON_STYLE_REF = 'delete-button';

const useStyles = createStyles(
  (
    _,
    {
      maxTagWidth,
      hasCloseButton,
      tagsHeight,
    }: { maxTagWidth: number | null; hasCloseButton: boolean; tagsHeight?: number },
  ) => ({
    root: {
      display: 'flex',
      flexDirection: 'row',
      gap: 5,
      lineHeight: 1,
    },
    badge: {
      borderRadius: 4,
      fontSize: 13,
      height: tagsHeight ?? 24,
      letterSpacing: '-0.13px',
      lineHeight: 1.07,
      minWidth: hasCloseButton ? undefined : 'fit-content',
      '&:hover': {
        [`& .${getStylesRef(DELETE_BUTTON_STYLE_REF)}`]: {
          opacity: 1,
          width: 14,
        },
      },
    },
    tagContent: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
    },
    badgeText: {
      fontFamily: 'Inconsolata',
      fontWeight: '700 !important' as unknown as number, // Making sure that table row hovering will not make it 600
      letterSpacing: '-0.26px',
      lineHeight: 1.07,
      fontSize: 13,
      maxWidth: maxTagWidth || undefined,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    button: {
      width: 'auto',
    },
    flexWrap: {
      flexWrap: 'wrap',
    },
    deleteButton: {
      alignItems: 'center',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      opacity: 0,
      ref: getStylesRef(DELETE_BUTTON_STYLE_REF),
      width: 0,
    },
  }),
);

export type UserTag = {
  onDelete?: () => void;
  customTag: CustomTag;
};

export type UserDefinedTagsProps = {
  tags: UserTag[];
  flexWrap?: boolean;
  onClick?: (tag: string) => void;
  maxTagWidth?: number | null;
  tagsHeight?: number;
};

const DEFAULT_MAX_WIDTH = 300;

export const Tag = ({
  customTag,
  onDelete,
  maxTagWidth = DEFAULT_MAX_WIDTH,
  tagsHeight = 24,
}: UserTag & Pick<UserDefinedTagsProps, 'maxTagWidth' | 'tagsHeight'>): ReactElement => {
  const { classes } = useStyles({ maxTagWidth, hasCloseButton: !!onDelete, tagsHeight });
  const { color, backgroundColor, key, value } = customTag;
  const usedColor = color || Colors.secondaryLight1000;
  const { width, ref } = useElementSize();
  const rightSection = (() => {
    if (!onDelete) return null;
    return (
      <div
        className={classes.deleteButton}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onDelete();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <IconX size={14} color={usedColor} />
      </div>
    );
  })();

  const label = getCustomTagLabel({ key, value });

  return (
    <div ref={ref}>
      <WhyLabsBadge
        key={label}
        className={classes.badge}
        maxWidth={width > 50 ? width : undefined}
        customColor={usedColor}
        customBackground={backgroundColor ?? `${color ?? Colors.secondaryLight1000}1A`}
        rightSection={rightSection}
        overrideTooltip={label}
        showToolTip
      >
        <div className={classes.tagContent}>
          <IconTag size={14} style={{ flexShrink: 0 }} />
          <span className={classes.badgeText}>{label}</span>
        </div>
      </WhyLabsBadge>
    </div>
  );
};

export const UserDefinedTags = ({
  onClick,
  tags,
  flexWrap = false,
  maxTagWidth = DEFAULT_MAX_WIDTH,
  tagsHeight,
}: UserDefinedTagsProps): ReactElement | null => {
  const { classes, cx } = useStyles({ maxTagWidth, hasCloseButton: false });

  if (!tags.length) return null;

  const handleClick = (label: string) => () => {
    onClick?.(label);
  };

  return (
    <div className={cx(classes.root, { [classes.flexWrap]: flexWrap })}>
      {tags.map((tag) => {
        const label = getCustomTagLabel(tag.customTag);

        const child = <Tag key={label} {...tag} maxTagWidth={maxTagWidth} tagsHeight={tagsHeight} />;
        if (!onClick) return child;

        return (
          <InvisibleButton className={classes.button} key={label} onClick={handleClick(label)}>
            {child}
          </InvisibleButton>
        );
      })}
    </div>
  );
};

export const getCustomTagLabel = ({ key, value }: CustomTag): string =>
  key && key !== NONE_TAGS_GROUP ? `${key}:${value}` : value;

export const getCustomTagFromLabel = (stringTag: string): CustomTag => {
  const [key, value] = stringTag.split(':');
  if (!value) return { key: NONE_TAGS_GROUP, value: value || key };
  return { key, value };
};

export const NONE_TAGS_GROUP = 'none'; // data-service business logic
