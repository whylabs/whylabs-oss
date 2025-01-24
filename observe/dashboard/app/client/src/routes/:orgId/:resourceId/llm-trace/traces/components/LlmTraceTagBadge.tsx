import { createStyles } from '@mantine/core';
import { getLLMSecureColor } from '~/assets/Colors';
import { WhyLabsBadge, WhyLabsTooltip } from '~/components/design-system';
import { generateIcon } from '~/components/factories/IconFactory';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { readableBehaviorMapper } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/utils';
import { upperCaseFirstLetterAndKeepRest, upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { ParsedSecureTag } from '~server/trpc/meta/llm-trace/types/llmTraceTypes';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
  },
  badge: {
    fontSize: 13,
    height: 24,
    letterSpacing: '-0.13px',
    lineHeight: 1.07,
  },
  tagContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: {
    fontFamily: 'Inconsolata, Asap',
  },
  button: {
    width: 'auto',
  },
  flexWrap: {
    flexWrap: 'wrap',
  },
}));

type LlmTraceTagBadgeProps = {
  onClick?: (tag: string) => () => void;
  secureTags?: ParsedSecureTag[];
  tooltip?: string;
  flexWrap?: boolean;
};

export const LlmTraceTagBadge = ({ onClick, secureTags, tooltip, flexWrap = false }: LlmTraceTagBadgeProps) => {
  const { classes, cx } = useStyles();

  if (!secureTags?.length) return null;

  const renderBehaviorIcon = (action?: string | null) => {
    switch (action) {
      case 'flag':
        return generateIcon({ name: 'flag', size: 14 });
      case 'block':
        return generateIcon({ name: 'hand-three-fingers', size: 14 });
      default:
        return null;
    }
  };

  const renderTag = (label: string, action?: string | null) => {
    const usedTooltip = (() => {
      const readableBehavior = action ? readableBehaviorMapper.get(action) : null;
      if (readableBehavior) {
        return `${upperCaseFirstLetterOnly(readableBehavior)} for ${label}${tooltip ? `. ${tooltip}` : ''}`;
      }
      return tooltip ?? '';
    })();
    return (
      <WhyLabsTooltip key={`${label}--tooltip`} label={usedTooltip}>
        <WhyLabsBadge key={label} className={classes.badge} customBackground={getLLMSecureColor(label)} radius="xl">
          <div className={classes.tagContent}>
            {renderBehaviorIcon(action)}
            <span className={classes.badgeText}>{upperCaseFirstLetterAndKeepRest(label)}</span>
          </div>
        </WhyLabsBadge>
      </WhyLabsTooltip>
    );
  };

  return (
    <div className={cx(classes.root, { [classes.flexWrap]: flexWrap })}>
      {secureTags?.map(({ label, action, name }) => {
        const child = renderTag(label, action);
        if (!onClick) return child;
        return (
          <InvisibleButton className={classes.button} key={`${action ?? ''}:${name}`} onClick={onClick(name)}>
            {child}
          </InvisibleButton>
        );
      })}
    </div>
  );
};
