import { createStyles } from '@mantine/core';
import { ReactElement } from 'react';
import { SkeletonGroup, WhyLabsAccordion } from '~/components/design-system';
import { PolicyExpandableCard } from '~/routes/:resourceId/llm-trace/policy/components/PolicyExpandableCard';
import { useLlmTracePolicyContext } from '~/routes/:resourceId/llm-trace/policy/LlmTracePolicyIndex';
import { CARD_WIDTH, accordionStyles } from '~/routes/:resourceId/llm-trace/policy/utils';

const useStyles = createStyles(() => ({
  policyGroupFlexContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 15,
  },
  cardWrapper: {
    display: 'flex',
    flexGrow: 1,
    width: '100%',
    maxWidth: CARD_WIDTH.max,
    minWidth: CARD_WIDTH.min,
  },
}));
export const PolicyRuleSets = (): ReactElement => {
  const { classes } = useStyles();
  const {
    setActiveMenuItem,
    schema,
    cardRefs,
    activeMenuItem,
    updatePolicyConfigSelection,
    setPolicySearchParam,
    hasLoadingQueries,
  } = useLlmTracePolicyContext();

  const onChangeAccordion = (value: string | null) => {
    setActiveMenuItem(value);
    setPolicySearchParam(value);
  };

  if (hasLoadingQueries)
    return (
      <div className={classes.policyGroupFlexContainer}>
        <SkeletonGroup count={1} height={248} width="900px" />
        <SkeletonGroup count={4} height={88} width="900px" />
      </div>
    );

  return (
    <div className={classes.policyGroupFlexContainer}>
      {schema?.policies?.map((policy) => {
        const currentConfigSelection = schema.configSelections.policies.find(({ id }) => id === policy.id);
        return (
          <div
            key={`card--${policy.id}`}
            ref={(el) => cardRefs.current.set(policy.id, el)}
            className={classes.cardWrapper}
          >
            <WhyLabsAccordion.Root
              className={classes.cardWrapper}
              value={activeMenuItem}
              onChange={onChangeAccordion}
              styles={accordionStyles}
            >
              <PolicyExpandableCard
                {...policy}
                onChange={updatePolicyConfigSelection}
                currentConfigSelection={currentConfigSelection}
              />
            </WhyLabsAccordion.Root>
          </div>
        );
      })}
    </div>
  );
};
