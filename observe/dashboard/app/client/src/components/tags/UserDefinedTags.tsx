import { createStyles, getStylesRef } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { IconTag, IconX } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { CustomTag } from '~server/graphql/generated/graphql';
import { NONE_TAGS_GROUP } from '~server/services/data/data-service/api-wrappers/utils/resource-tagging';
import { ReactElement } from 'react';

import { WhyLabsBadge } from '../design-system';
import { ClickableDiv } from '../misc/ClickableDiv';
import { InvisibleButton } from '../misc/InvisibleButton';

export { NONE_TAGS_GROUP };

const DELETE_BUTTON_STYLE_REF = 'delete-button';

const useStyles = createStyles(
  (_, { maxTagWidth, hasCloseButton }: { maxTagWidth: number | null; hasCloseButton: boolean }) => ({
    root: {
      display: 'flex',
      flexDirection: 'row',
      gap: 5,
    },
    badge: {
      borderRadius: 4,
      fontSize: 13,
      height: 24,
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
  disabledTooltip?: boolean;
  flexWrap?: boolean;
  maxTagWidth?: number | null;
  onClick?: (tag: string) => void;
  tags: UserTag[];
  emptyState?: ReactElement;
};

const DEFAULT_MAX_WIDTH = 300;

export const Tag = ({
  customTag,
  disabledTooltip,
  onDelete,
  maxTagWidth = DEFAULT_MAX_WIDTH,
}: UserTag & Pick<UserDefinedTagsProps, 'disabledTooltip' | 'maxTagWidth'>) => {
  const { classes } = useStyles({ maxTagWidth, hasCloseButton: !!onDelete });
  const { color, backgroundColor, key, value } = customTag;
  const usedColor = color || Colors.secondaryLight1000;
  const { width, ref } = useElementSize();
  const rightSection = (() => {
    if (!onDelete) return null;
    return (
      <ClickableDiv
        className={classes.deleteButton}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <IconX size={14} color={usedColor} />
      </ClickableDiv>
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
        overrideTooltip={disabledTooltip ? '' : label}
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
  disabledTooltip,
  onClick,
  tags,
  flexWrap = false,
  emptyState,
  maxTagWidth = DEFAULT_MAX_WIDTH,
}: UserDefinedTagsProps) => {
  const { classes, cx } = useStyles({ maxTagWidth, hasCloseButton: false });

  if (!tags.length) return emptyState ?? null;

  const handleClick = (label: string) => () => {
    onClick?.(label);
  };

  return (
    <div className={cx(classes.root, { [classes.flexWrap]: flexWrap })}>
      {tags.map((tag) => {
        const label = getCustomTagLabel(tag.customTag);

        const child = <Tag key={label} {...tag} disabledTooltip={disabledTooltip} maxTagWidth={maxTagWidth} />;
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

export const getCustomTagLabel = ({ key, value }: CustomTag) =>
  key && key !== NONE_TAGS_GROUP ? `${key}:${value}` : value;

export const getCustomTagFromLabel = (stringTag: string): CustomTag => {
  const [key, value] = stringTag.split(':');
  if (!value) return { key: NONE_TAGS_GROUP, value: value || key };
  return { key, value };
};
