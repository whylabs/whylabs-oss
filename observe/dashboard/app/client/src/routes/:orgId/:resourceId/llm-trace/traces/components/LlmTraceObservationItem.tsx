import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsBadge } from '~/components/design-system';
import { ParsedSecureTag } from '~server/trpc/meta/llm-trace/types/llmTraceTypes';

import { LlmTraceTagBadge } from './LlmTraceTagBadge';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  description: {
    fontFamily: 'Inconsolata',
    fontSize: 14,
    margin: 0,
    textAlign: 'left',
  },
  nameContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: 500,
    margin: 0,
    textAlign: 'left',
  },
  type: {
    fontSize: 12,
    fontWeight: 500,
    height: 24,
  },
  traceBadge: {
    color: Colors.white,
    background: Colors.llmTraceBadgesBackground.trace,
  },
  spanBadge: {
    color: Colors.secondaryLight1000,
    background: Colors.llmTraceBadgesBackground.span,
  },
  completionBadge: {
    color: Colors.secondaryLight1000,
    background: Colors.llmTraceBadgesBackground.completion,
  },
  interactionBadge: {
    color: Colors.secondaryLight1000,
    background: Colors.llmTraceBadgesBackground.interaction,
  },
  guardrailsBadge: {
    color: Colors.secondaryLight1000,
    background: Colors.llmTraceBadgesBackground.guardrails,
  },
}));

type LlmTraceObservationItemProps = {
  description?: string | null;
  name: string;
  secureTags?: ParsedSecureTag[];
  type: string;
};

export const LlmTraceObservationItem = ({ description, name, secureTags, type }: LlmTraceObservationItemProps) => {
  const { classes, cx } = useStyles();
  const badgeTypeCssClassesMapper = new Map<string, string>([
    ['trace', classes.traceBadge],
    ['span', classes.spanBadge],
    ['completion', classes.completionBadge],
    ['interaction', classes.interactionBadge],
    ['guardrails', classes.guardrailsBadge],
  ]);
  const badgeCssClass = badgeTypeCssClassesMapper.get(type.toLowerCase());

  return (
    <div className={classes.root}>
      <div className={classes.nameContainer}>
        <WhyLabsBadge
          className={cx(classes.type, badgeCssClass)}
          customColor={Colors.black}
          customBackground={Colors.secondaryLight300}
        >
          {type}
        </WhyLabsBadge>
        <p className={classes.name}>{name}</p>
      </div>
      {description && <p className={classes.description}>{description}</p>}
      <LlmTraceTagBadge secureTags={secureTags} flexWrap />
    </div>
  );
};
